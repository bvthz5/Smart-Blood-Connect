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
    Match, Notification
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
            
            for donor, distance_km in candidates:
                # Extract features
                features = extract_features(request, donor, distance_km)
                
                # ML predictions
                availability_score = predict_donor_availability(features)
                response_time_hours = predict_response_time(features)
                
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
            
            # 4. Get model version for logging
            try:
                _, model_version = load_model('donor_availability')
            except:
                model_version = 'fallback_v1'
            
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
                    # Enqueue notification task
                    notify_donor_task.delay(mp.id, request_id)
                    mp.notified = True
                    notified_count += 1
                except Exception as e:
                    current_app.logger.error(
                        f"Failed to enqueue notification for donor {mp.donor_id}: {str(e)}"
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
                f"{len(predictions)} scored, {notified_count} notified"
            )
            
            return {
                "matched": len(predictions),
                "notified": notified_count,
                "top_scores": [round(mp.match_score, 3) for mp in top_matches[:5]],
                "elapsed_ms": round(elapsed_time, 2)
            }
            
    except Exception as e:
        current_app.logger.error(f"Error in donor matching task: {str(e)}", exc_info=True)
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


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
    try:
        with current_app.app_context():
            # Fetch match prediction
            mp = MatchPrediction.query.get(match_prediction_id)
            if not mp:
                return {"error": "MatchPrediction not found"}
            
            # Fetch donor and request
            donor = Donor.query.get(mp.donor_id)
            request = Request.query.get(request_id)
            
            if not donor or not request:
                return {"error": "Donor or Request not found"}
            
            # Get donor user info
            from app.models import User
            user = User.query.get(donor.user_id)
            
            if not user:
                return {"error": "Donor user not found"}
            
            # Generate secure token for one-click accept
            token = secrets.token_urlsafe(32)
            
            # Create Match record (pending status)
            match = Match(
                request_id=request_id,
                donor_id=donor.id,
                status='pending',
                matched_at=datetime.utcnow(),
                notes=f"Auto-matched via ML (score: {mp.match_score:.2f})"
            )
            db.session.add(match)
            db.session.flush()  # Get match ID
            
            # Create notification record
            accept_url = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:3000')}/donor/accept/{token}"
            
            notification = Notification(
                user_id=user.id,
                type='blood_request',
                title=f'Urgent Blood Request: {request.blood_group}',
                message=f'A patient needs {request.blood_group} blood ({request.units_required} units). '
                        f'Urgency: {request.urgency.upper()}. Please respond ASAP.',
                data={
                    'request_id': request_id,
                    'match_id': match.id,
                    'token': token,
                    'accept_url': accept_url,
                    'blood_group': request.blood_group,
                    'units': request.units_required,
                    'urgency': request.urgency
                },
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.session.add(notification)
            db.session.commit()
            
            # Send SMS if phone available
            if user.phone:
                try:
                    sms_text = (
                        f"🩸 URGENT: {request.blood_group} blood needed!\n"
                        f"Units: {request.units_required}\n"
                        f"Urgency: {request.urgency.upper()}\n"
                        f"Accept now: {accept_url}\n"
                        f"- Smart Blood Connect"
                    )
                    sms_result = sms_service.send_sms(user.phone, sms_text)
                    if sms_result:
                        current_app.logger.info(f"SMS sent successfully to {user.phone}")
                    else:
                        current_app.logger.warning(f"SMS failed to send to {user.phone}")
                except Exception as e:
                    current_app.logger.error(f"SMS send failed to {user.phone}: {str(e)}")
            
            # Send email
            if user.email:
                try:
                    email_html = f"""
                    <h2>Urgent Blood Request</h2>
                    <p>Dear {user.first_name},</p>
                    <p>A patient urgently needs <strong>{request.blood_group}</strong> blood.</p>
                    <ul>
                        <li>Blood Group: {request.blood_group}</li>
                        <li>Units Needed: {request.units_required}</li>
                        <li>Urgency: {request.urgency.upper()}</li>
                        <li>Required By: {request.required_by.strftime('%Y-%m-%d %H:%M') if request.required_by else 'ASAP'}</li>
                    </ul>
                    <p>
                        <a href="{accept_url}" style="background:#FF5252;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
                            Accept Request
                        </a>
                    </p>
                    <p>Thank you for saving lives!</p>
                    <p><small>Smart Blood Connect</small></p>
                    """
                    
                    email_service.send_email(  # pyright: ignore[reportAttributeAccessIssue]
                        to=user.email,
                        subject=f'Urgent: {request.blood_group} Blood Needed',
                        html=email_html
                    )
                except Exception as e:
                    current_app.logger.error(f"Email send failed: {str(e)}")
            
            current_app.logger.info(f"Notified donor {donor.id} for request {request_id}")
            
            return {
                "success": True,
                "donor_id": donor.id,
                "notification_id": notification.id,
                "match_id": match.id
            }
            
    except Exception as e:
        current_app.logger.error(f"Error in notify_donor_task: {str(e)}", exc_info=True)
        raise self.retry(exc=e, countdown=30 * (2 ** self.request.retries))
