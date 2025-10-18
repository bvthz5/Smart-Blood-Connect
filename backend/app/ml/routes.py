"""
ML API Routes - Endpoints for ML model predictions
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import numpy as np

from app.models import (
    db, Donor, Request, Hospital, MatchPrediction,
    ModelPredictionLog, DonationHistory, User
)
from app.ml.model_client import model_client
from app.ml.feature_builder import FeatureBuilder

ml_bp = Blueprint('ml', __name__, url_prefix='/api/ml')


@ml_bp.route('/health', methods=['GET'])
def health_check():
    """Check ML service health"""
    try:
        models = model_client.list_models()
        return jsonify({
            'status': 'healthy',
            'models_available': len(models),
            'models': list(models.keys())
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500


@ml_bp.route('/match', methods=['POST'])
def match_donors():
    """
    Find and rank top donors for a blood request using ML
    
    Request body:
    {
        "request_id": 123,
        "top_k": 10,
        "save_predictions": true
    }
    
    Returns:
    {
        "request_id": 123,
        "matches": [
            {
                "donor_id": 456,
                "donor_name": "John Doe",
                "match_score": 0.95,
                "availability_score": 0.88,
                "response_time_hours": 2.5,
                "reliability_score": 0.92,
                "distance_km": 5.2,
                "blood_group": "O+",
                "rank": 1
            },
            ...
        ],
        "total_candidates": 50,
        "inference_time_ms": 125.3
    }
    """
    start_time = datetime.now()
    
    try:
        data = request.get_json() or {}
        request_id = data.get('request_id')
        top_k = data.get('top_k', 10)
        save_predictions = data.get('save_predictions', True)
        
        if not request_id:
            return jsonify({'error': 'request_id is required'}), 400
        
        # Fetch request and hospital
        blood_request = Request.query.get(request_id)
        if not blood_request:
            return jsonify({'error': 'Request not found'}), 404
        
        hospital = Hospital.query.get(blood_request.hospital_id)
        if not hospital:
            return jsonify({'error': 'Hospital not found'}), 404
        
        # Get compatible donors
        compatible_donors = Donor.query.join(User).filter(
            Donor.blood_group.in_(
                FeatureBuilder.BLOOD_COMPATIBILITY.get(blood_request.blood_group, [])
            ),
            User.status == 'active'
        ).all()
        
        if not compatible_donors:
            return jsonify({
                'request_id': request_id,
                'matches': [],
                'total_candidates': 0,
                'message': 'No compatible donors found'
            }), 200
        
        # Build features and predict for each donor
        predictions = []
        
        for donor in compatible_donors:
            try:
                # Build features
                match_features = FeatureBuilder.build_donor_seeker_features(
                    donor, blood_request, hospital
                )
                availability_features = FeatureBuilder.build_availability_features(donor)
                response_time_features = FeatureBuilder.build_response_time_features(
                    donor, blood_request, hospital
                )
                
                # Convert to DataFrame for sklearn models
                match_df = FeatureBuilder.features_to_dataframe(match_features)
                avail_df = FeatureBuilder.features_to_dataframe(availability_features)
                response_df = FeatureBuilder.features_to_dataframe(response_time_features)
                
                # Get predictions
                match_pred, _ = model_client.predict('donor_seeker_match', match_df)
                avail_pred, _ = model_client.predict_proba('donor_availability', avail_df)
                response_pred, _ = model_client.predict('donor_response_time', response_df)
                
                # Extract scores
                match_score = float(match_pred[0]) if len(match_pred) > 0 else 0.5
                availability_score = float(avail_pred[0][1]) if len(avail_pred) > 0 else 0.5
                response_time = float(response_pred[0]) if len(response_pred) > 0 else 24.0
                
                predictions.append({
                    'donor_id': donor.id,
                    'donor_name': f"{donor.user.first_name} {donor.user.last_name or ''}".strip(),
                    'match_score': round(match_score, 3),
                    'availability_score': round(availability_score, 3),
                    'response_time_hours': round(response_time, 2),
                    'reliability_score': round(float(donor.reliability_score or 0.5), 3),
                    'distance_km': match_features['distance_km'],
                    'blood_group': donor.blood_group,
                    'phone': donor.user.phone,
                    'features': match_features
                })
                
            except Exception as e:
                current_app.logger.error(f"Error predicting for donor {donor.id}: {str(e)}")
                continue
        
        # Sort by match score (descending)
        predictions.sort(key=lambda x: x['match_score'], reverse=True)
        
        # Add ranks
        for idx, pred in enumerate(predictions[:top_k], 1):
            pred['rank'] = idx
        
        # Save predictions to database if requested
        if save_predictions:
            try:
                for pred in predictions[:top_k]:
                    match_prediction = MatchPrediction(
                        request_id=request_id,
                        donor_id=pred['donor_id'],
                        match_score=pred['match_score'],
                        availability_score=pred['availability_score'],
                        response_time_hours=pred['response_time_hours'],
                        reliability_score=pred['reliability_score'],
                        model_version='1.0.0',
                        feature_vector=pred['features'],
                        rank=pred['rank']
                    )
                    db.session.add(match_prediction)
                
                db.session.commit()
                current_app.logger.info(f"Saved {len(predictions[:top_k])} predictions for request {request_id}")
                
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Failed to save predictions: {str(e)}")
        
        # Calculate total inference time
        total_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Log prediction
        log_entry = ModelPredictionLog(
            model_name='donor_matching_pipeline',
            model_version='1.0.0',
            endpoint='/api/ml/match',
            input_data={'request_id': request_id, 'top_k': top_k},
            prediction_output={'matches_count': len(predictions[:top_k])},
            inference_time_ms=total_time,
            success=True
        )
        db.session.add(log_entry)
        db.session.commit()
        
        # Remove features from response
        for pred in predictions[:top_k]:
            pred.pop('features', None)
        
        return jsonify({
            'request_id': request_id,
            'matches': predictions[:top_k],
            'total_candidates': len(compatible_donors),
            'inference_time_ms': round(total_time, 2)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Match prediction error: {str(e)}", exc_info=True)
        
        # Log failed prediction
        try:
            log_entry = ModelPredictionLog(
                model_name='donor_matching_pipeline',
                model_version='1.0.0',
                endpoint='/api/ml/match',
                input_data=data,
                prediction_output=None,
                inference_time_ms=0,
                success=False,
                error_message=str(e)
            )
            db.session.add(log_entry)
            db.session.commit()
        except:
            pass
        
        return jsonify({'error': str(e)}), 500


@ml_bp.route('/predict_availability', methods=['POST'])
def predict_availability():
    """
    Predict donor availability
    
    Request body:
    {
        "donor_id": 456
    }
    
    Returns:
    {
        "donor_id": 456,
        "availability_probability": 0.85,
        "is_likely_available": true,
        "confidence": "high"
    }
    """
    try:
        data = request.get_json() or {}
        donor_id = data.get('donor_id')
        
        if not donor_id:
            return jsonify({'error': 'donor_id is required'}), 400
        
        donor = Donor.query.get(donor_id)
        if not donor:
            return jsonify({'error': 'Donor not found'}), 404
        
        # Build features
        features = FeatureBuilder.build_availability_features(donor)
        features_df = FeatureBuilder.features_to_dataframe(features)
        
        # Predict
        probabilities, inference_time = model_client.predict_proba('donor_availability', features_df)
        
        availability_prob = float(probabilities[0][1])
        is_available = availability_prob >= 0.5
        
        # Determine confidence
        if availability_prob >= 0.8 or availability_prob <= 0.2:
            confidence = 'high'
        elif availability_prob >= 0.6 or availability_prob <= 0.4:
            confidence = 'medium'
        else:
            confidence = 'low'
        
        return jsonify({
            'donor_id': donor_id,
            'availability_probability': round(availability_prob, 3),
            'is_likely_available': is_available,
            'confidence': confidence,
            'inference_time_ms': round(inference_time, 2)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Availability prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@ml_bp.route('/models', methods=['GET'])
def list_models():
    """List all available ML models with metadata"""
    try:
        models = model_client.list_models()
        return jsonify({
            'models': models,
            'total': len(models)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ml_bp.route('/models/<model_key>/reload', methods=['POST'])
def reload_model(model_key):
    """Hot-reload a specific model (admin only)"""
    try:
        model_client.reload_model(model_key)
        return jsonify({
            'message': f'Model {model_key} reloaded successfully'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ml_bp.route('/predictions/history', methods=['GET'])
def prediction_history():
    """Get prediction history for a request"""
    request_id = request.args.get('request_id', type=int)
    
    if not request_id:
        return jsonify({'error': 'request_id parameter required'}), 400
    
    predictions = MatchPrediction.query.filter_by(request_id=request_id).order_by(
        MatchPrediction.rank
    ).all()
    
    result = []
    for pred in predictions:
        donor = Donor.query.get(pred.donor_id)
        result.append({
            'donor_id': pred.donor_id,
            'donor_name': f"{donor.user.first_name} {donor.user.last_name or ''}".strip() if donor else 'Unknown',
            'match_score': pred.match_score,
            'availability_score': pred.availability_score,
            'response_time_hours': pred.response_time_hours,
            'reliability_score': pred.reliability_score,
            'rank': pred.rank,
            'notified': pred.notified,
            'created_at': pred.created_at.isoformat()
        })
    
    return jsonify({
        'request_id': request_id,
        'predictions': result,
        'total': len(result)
    }), 200
