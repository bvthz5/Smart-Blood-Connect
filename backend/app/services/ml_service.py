# backend/app/services/ml_service.py
"""
ML Model Loading and Prediction Service
Handles loading trained models and making predictions for donor matching
"""
import joblib
import os
from typing import Tuple, Any, Dict, List
from flask import current_app
from app.models import ModelArtifact


def load_model(model_name: str) -> Tuple[Any, str]:
    """
    Load an active ML model from the database registry
    
    Args:
        model_name: Name of the model to load (e.g., 'donor_matcher', 'availability_predictor')
    
    Returns:
        Tuple of (model_object, version_string)
    
    Raises:
        RuntimeError: If no active model is found
    """
    artifact = ModelArtifact.query.filter_by(
        model_name=model_name,
        is_active=True
    ).first()
    
    if not artifact:
        current_app.logger.warning(f"No active model found for '{model_name}', using default")
        # Return a simple fallback model
        return None, "default"
    
    try:
        model_path = os.path.join(current_app.root_path, '..', artifact.artifact_path)
        model = joblib.load(model_path)
        current_app.logger.info(f"Loaded model '{model_name}' version {artifact.version}")
        return model, artifact.version
    except Exception as e:
        current_app.logger.error(f"Failed to load model '{model_name}': {str(e)}")
        raise RuntimeError(f"Model loading failed: {str(e)}")


def calculate_match_score(
    availability_score: float,
    distance_km: float,
    reliability_score: float,
    max_distance: float = 50.0
) -> float:
    """
    Calculate final match score using weighted combination
    
    Args:
        availability_score: Predicted probability donor is available (0-1)
        distance_km: Distance between donor and hospital in km
        reliability_score: Historical reliability score (0-1)
        max_distance: Maximum distance for normalization
    
    Returns:
        Combined match score (0-1)
    """
    # Weights (can be tuned)
    w_availability = 0.4
    w_proximity = 0.3
    w_reliability = 0.3
    
    # Normalize distance (closer = better)
    proximity_score = max(0, 1 - (distance_km / max_distance))
    
    # Weighted combination
    match_score = (
        w_availability * availability_score +
        w_proximity * proximity_score +
        w_reliability * reliability_score
    )
    
    return round(match_score, 4)


def predict_donor_availability(features: Dict[str, Any]) -> float:
    """
    Predict if donor is available using ML model
    
    Args:
        features: Dictionary of features for prediction
    
    Returns:
        Availability probability (0-1)
    """
    try:
        model, version = load_model('donor_availability')
        
        if model is None:
            # Fallback: use simple heuristic
            score = 0.7 if features.get('is_available', False) else 0.1
            score *= (1 - min(features.get('recent_notifications', 0) * 0.1, 0.5))
            return min(max(score, 0), 1)
        
        # Extract feature vector in expected order
        feature_vector = [
            features.get('distance_km', 0),
            features.get('days_since_last_donation', 365),
            features.get('total_donations', 0),
            features.get('reliability_score', 0.5),
            features.get('recent_notifications', 0),
            features.get('urgency_numeric', 2),  # 0=low, 1=medium, 2=high, 3=critical
        ]
        
        # Get probability
        proba = model.predict_proba([feature_vector])[0]
        return round(float(proba[1] if len(proba) > 1 else proba[0]), 4)
        
    except Exception as e:
        current_app.logger.error(f"Availability prediction failed: {str(e)}")
        # Fallback score
        return 0.5


def predict_response_time(features: Dict[str, Any]) -> float:
    """
    Predict expected response time in hours
    
    Args:
        features: Dictionary of features for prediction
    
    Returns:
        Predicted response time in hours
    """
    try:
        model, version = load_model('donor_response_time')
        
        if model is None:
            # Fallback: estimate based on urgency and distance
            base_hours = 24 - (features.get('urgency_numeric', 2) * 6)
            distance_penalty = features.get('distance_km', 0) * 0.5
            return max(base_hours + distance_penalty, 2)
        
        # Extract feature vector
        feature_vector = [
            features.get('distance_km', 0),
            features.get('donor_age', 30),
            features.get('total_donations', 0),
            features.get('reliability_score', 0.5),
            features.get('urgency_numeric', 2),
            features.get('time_of_day', 12),  # hour 0-23
        ]
        
        hours = model.predict([feature_vector])[0]
        return round(float(max(hours, 0.5)), 2)
        
    except Exception as e:
        current_app.logger.error(f"Response time prediction failed: {str(e)}")
        return 12.0  # Fallback: 12 hours
