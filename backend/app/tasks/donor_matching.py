# backend/app/tasks/donor_matching.py
# pyright: reportCallIssue=false, reportFunctionMemberAccess=false
"""
Celery tasks for asynchronous donor matching and notification
"""
import time
from datetime import datetime
from typing import List
from flask import current_app
from app.tasks.celery_app import celery_app as celery
from app.models import (
    db, Request, Donor, MatchPrediction, ModelPredictionLog,
    Match, Notification, User
)
from app.services.donor_matcher import (
    select_candidate_donors,
    extract_features
)
from app.services.ml_service import (
    predict_donor_availability,
    predict_response_time,
    calculate_match_score,
    load_model
)
from app.services.sms_service import sms_service
from app.services.email_service import EmailService
import secrets

# Initialize email service
email_service = EmailService()


@celery.task(bind=True, max_retries=3)
def match_donors_for_request(self, request_id: int, radius_km: float = 20.0, top_k: int = 10):
    """
    Main task: Find and score donor candidates for a blood request
    
    Args:
        request_id: ID of the blood request
        radius_km: Search radius in kilometers (default 20)
        top_k: Number of top donors to notify (default 10)
    
    Returns:
        Dictionary with matching statistics
    """
    return _match_donors_for_request_impl(request_id, radius_km, top_k)

def _match_donors_for_request_impl(request_id: int, radius_km: float = 20.0, top_k: int = 10):
    """
    Implementation of donor matching logic (separated for direct calling)
    
    Args:
        request_id: ID of the blood request
        radius_km: Search radius in kilometers (default 20)
        top_k: Number of top donors to notify (default 10)
    
    Returns:
        Dictionary with matching statistics
    """
    try:
        with current_app.app_context():
            # 1. Fetch request
            request = Request.query.get(request_id)
            if not request:
                current_app.logger.error(f"Request {request_id} not found")
                return {"error": "Request not found"}
            
            current_app.logger.info(
                f"Starting donor matching for request {request_id} "
                f"(blood group: {request.blood_group}, urgency: {request.urgency})"
            )
            
            # 2. Select candidate donors
            start_time = time.time()
            candidates = select_candidate_donors(request, radius_km)
            
            if not candidates:
                current_app.logger.warning(f"No eligible donors found for request {request_id}")
                return {"matched": 0, "notified": 0, "message": "No eligible donors found"}
            
            # 3. Extract features and predict scores for each candidate
            predictions = []
            feature_vectors = []
            
            # Process candidates in smaller batches for better performance
            batch_size = 50
            for i in range(0, len(candidates), batch_size):
                batch = candidates[i:i+batch_size]
                for donor, distance_km in batch:
                    # Extract features
                    features = extract_features(request, donor, distance_km)
                    
                    # ML predictions (with fallback if models not available)
                    try:
                        availability_score = predict_donor_availability(features)
                    except Exception as e:
                        current_app.logger.warning(f"Availability prediction failed, using fallback: {str(e)}")
                        availability_score = 0.7 if features.get('is_available', False) else 0.1
                    
                    try:
                        response_time_hours = predict_response_time(features)
                    except Exception as e:
                        current_app.logger.warning(f"Response time prediction failed, using fallback: {str(e)}")
                        response_time_hours = 12.0  # Default 12 hours
                    
                    # Calculate final match score
                    match_score = calculate_match_score(
                        availability_score,
                        distance_km,
                        features['reliability_score']
                    )
                    
                    predictions.append({
                        'donor_id': donor.id,
                        'match_score': match_score,
                        'availability_score': availability_score,
                        'response_time_hours': response_time_hours,
                        'reliability_score': features['reliability_score'],
                        'distance_km': distance_km,
                        'features': features
                    })
                    
                    feature_vectors.append(features)
            
            # 4. Get model version for logging (with fallback)
            try:
                _, model_version = load_model('donor_availability')
            except:
                model_version = 'fallback_v1'
                current_app.logger.info("Using fallback model version")
            
            # 5. Persist predictions to database
            match_predictions = []
            for pred in predictions:
                # SQLAlchemy model instantiation - dynamic attributes
                mp = MatchPrediction()  # pyright: ignore[reportCallIssue]
                mp.request_id = request_id
                mp.donor_id = pred['donor_id']
                mp.match_score = pred['match_score']
                mp.availability_score = pred['availability_score']
                mp.response_time_hours = pred['response_time_hours']
                mp.reliability_score = pred['reliability_score']
                mp.model_version = model_version
                mp.feature_vector = pred['features']
                mp.notified = False
                mp.created_at = datetime.utcnow()
                
                db.session.add(mp)
                match_predictions.append(mp)
            
            db.session.commit()
            
            # 6. Rank by match score
            match_predictions.sort(key=lambda x: x.match_score, reverse=True)
            for rank, mp in enumerate(match_predictions, 1):
                mp.rank = rank
            
            db.session.commit()
            
            # 7. Select top-K donors and enqueue notifications
            top_matches = match_predictions[:top_k]
            notified_count = 0
            
            for mp in top_matches:
                try:
                    # Enqueue notification task or run synchronously
                    try:
                        notify_donor_task.delay(mp.id, request_id)
                    except Exception as e:
                        current_app.logger.warning(f"Celery not available, running notification synchronously: {str(e)}")
                        # Run synchronously as fallback
                        notify_donor_task(mp.id, request_id)
                    
                    mp.notified = True
                    notified_count += 1
                except Exception as e:
                    current_app.logger.error(
                        f"Failed to notify donor {mp.donor_id}: {str(e)}"
                    )
            
            db.session.commit()
            
            # 8. Log model prediction for monitoring
            elapsed_time = (time.time() - start_time) * 1000.0  # ms
            log = ModelPredictionLog(
                model_name='donor_matcher',
                model_version=model_version,
                endpoint=f'/tasks/match_donors/{request_id}',
                input_data={
                    'request_id': request_id,
                    'blood_group': request.blood_group,
                    'urgency': request.urgency,
                    'radius_km': radius_km,
                    'num_candidates': len(candidates)
                },
                prediction_output={
                    'total_scored': len(predictions),
                    'top_k_donors': [mp.donor_id for mp in top_matches],
                    'top_scores': [mp.match_score for mp in top_matches]
                },
                inference_time_ms=elapsed_time,
                success=True,
                created_at=datetime.utcnow()
            )
            db.session.add(log)
            db.session.commit()
            
            current_app.logger.info(
                f"Donor matching complete for request {request_id}: "
                f"{len(predictions)} scored, {notified_count} notified in {elapsed_time:.2f}ms"
            )
            
            return {
                "matched": len(predictions),
                "notified": notified_count,
                "top_scores": [round(mp.match_score, 3) for mp in top_matches[:5]],
                "elapsed_ms": round(elapsed_time, 2)
            }
            
    except Exception as e:
        current_app.logger.error(f"Error in donor matching task: {str(e)}", exc_info=True)
        # For direct calls, just raise the exception
        # For Celery tasks, retry with exponential backoff
        raise e

@celery.task(bind=True, max_retries=3)
def notify_donor_task(self, match_prediction_id: int, request_id: int):
    """
    Send notification to a donor about a blood request
    
    Args:
        match_prediction_id: ID of the MatchPrediction record
        request_id: ID of the blood request
    
    Returns:
        Dictionary with notification status
    """
    return _notify_donor_task_impl(match_prediction_id, request_id)

def _notify_donor_task_impl(match_prediction_id: int, request_id: int):
    """
    Implementation of donor notification logic (separated for direct calling)
    
    Args:
        match_prediction_id: ID of the MatchPrediction record
        request_id: ID of the blood request
    
    Returns:
        Dictionary with notification status
    """
    try:
        with current_app.app_context():
            # Fetch match prediction
            mp = MatchPrediction.query.get(match_prediction_id)
            if not mp:
                return {"error": "MatchPrediction not found"}
            
            # Fetch donor and user
            donor = Donor.query.get(mp.donor_id)
            if not donor:
                return {"error": "Donor not found"}
            
            user = User.query.get(donor.user_id)
            if not user:
                return {"error": "User not found"}
            
            # Fetch request
            req = Request.query.get(request_id)
            if not req:
                return {"error": "Request not found"}
            
            # Update match prediction as notified
            mp.notified = True
            mp.updated_at = datetime.utcnow()
            db.session.commit()
            
            # Create notification record
            notification = Notification(
                user_id=user.id,
                type="blood_request",
                title="Blood Donation Request",
                message=f"A patient needs {req.blood_group} blood. Would you like to help?",
                data={
                    "request_id": request_id,
                    "match_prediction_id": match_prediction_id,
                    "blood_group": req.blood_group,
                    "urgency": req.urgency
                },
                created_at=datetime.utcnow()
            )
            db.session.add(notification)
            db.session.commit()
            
            # Send SMS notification
            message = (
                f"Hi {user.first_name}, a patient needs {req.blood_group} blood urgently. "
                f"Check your notifications for details. - SmartBlood Connect"
            )
            
            try:
                sms_service.send_sms(user.phone, message)
                current_app.logger.info(f"SMS sent to donor {user.id} for request {request_id}")
            except Exception as sms_error:
                current_app.logger.warning(f"Failed to send SMS to donor {user.id}: {str(sms_error)}")
            
            # Send email notification (optional)
            try:
                if user.email and user.is_email_verified:
                    # Use the correct email service method
                    email_service.send_email(
                        to=user.email,
                        subject="Blood Donation Request - SmartBlood Connect",
                        html=f"<p>{message}</p>",
                        text=message
                    )
                    current_app.logger.info(f"Email sent to donor {user.id} for request {request_id}")
            except Exception as email_error:
                current_app.logger.warning(f"Failed to send email to donor {user.id}: {str(email_error)}")
            
            return {
                "status": "success",
                "notification_id": notification.id,
                "donor_id": user.id,
                "request_id": request_id
            }
            
    except Exception as e:
        current_app.logger.error(f"Error in donor notification task: {str(e)}", exc_info=True)
        # For direct calls, just raise the exception
        raise e
