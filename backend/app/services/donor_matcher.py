# backend/app/services/donor_matcher.py
"""
Donor Matching Service with ML Integration
Handles candidate selection, feature extraction, and ML-based scoring
"""
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from math import radians, cos, sin, asin, sqrt
from flask import current_app
from sqlalchemy import and_, or_
from app.models import Donor, Request, User, Hospital, Match, MatchPrediction
from app.services.ml_service import (
    predict_donor_availability,
    predict_response_time,
    calculate_match_score
)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great circle distance between two points on Earth
    
    Args:
        lat1, lon1: First point coordinates
        lat2, lon2: Second point coordinates
    
    Returns:
        Distance in kilometers
    """
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of Earth in kilometers
    r = 6371
    
    return round(c * r, 2)


def get_compatible_blood_groups(requested_group: str) -> List[str]:
    """
    Get blood groups that can donate to the requested group
    
    Args:
        requested_group: Blood group needed (e.g., 'A+', 'O-')
    
    Returns:
        List of compatible donor blood groups
    """
    compatibility_map = {
        'A+': ['A+', 'A-', 'O+', 'O-'],
        'A-': ['A-', 'O-'],
        'B+': ['B+', 'B-', 'O+', 'O-'],
        'B-': ['B-', 'O-'],
        'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],  # Universal recipient
        'AB-': ['A-', 'B-', 'AB-', 'O-'],
        'O+': ['O+', 'O-'],
        'O-': ['O-'],  # Universal donor
    }
    
    return compatibility_map.get(requested_group, [requested_group])


def select_candidate_donors(
    request: Request,
    radius_km: float = 20.0,
    min_eligibility_days: int = 96
) -> List[Tuple[Donor, float]]:
    """
    Select eligible donor candidates with distance filtering
    
    Args:
        request: Blood request object
        radius_km: Maximum distance in kilometers
        min_eligibility_days: Minimum days since last donation
    
    Returns:
        List of tuples (Donor, distance_km)
    """
    from app.extensions import db
    
    # Get request location (from hospital or seeker)
    hospital = Hospital.query.get(request.hospital_id) if request.hospital_id else None
    
    # If no hospital, try to get location from seeker
    seeker = User.query.get(request.seeker_id) if request.seeker_id else None
    
    if hospital and hasattr(hospital, 'latitude') and hospital.latitude:
        request_lat = hospital.latitude
        request_lng = hospital.longitude
    elif seeker and hasattr(seeker, 'district'):
        # Use seeker's district coordinates
        request_lat, request_lng = get_district_coordinates(getattr(seeker, 'district', 'Ernakulam'))
        current_app.logger.info(f"Using seeker {seeker.id} district location for request {request.id}")
    elif hospital:
        # Use district-based fallback coordinates
        request_lat, request_lng = get_district_coordinates(
            getattr(hospital, 'district', 'Ernakulam') if hospital else 'Ernakulam'
        )
        current_app.logger.warning(f"Request {request.id} has hospital but no coordinates, using district fallback")
    else:
        # Default to Ernakulam
        request_lat, request_lng = get_district_coordinates('Ernakulam')
        current_app.logger.warning(f"Request {request.id} has no hospital or seeker location, using default Ernakulam")
    
    # Get compatible blood groups
    compatible_groups = get_compatible_blood_groups(request.blood_group)
    
    # Calculate eligibility date
    eligibility_date = datetime.utcnow() - timedelta(days=min_eligibility_days)
    
    # Bounding box for efficient geofencing (approx 1 degree = 111km)
    delta = radius_km / 111.0
    min_lat, max_lat = request_lat - delta, request_lat + delta
    min_lng, max_lng = request_lng - delta, request_lng + delta
    
    # Query eligible donors
    candidates_query = db.session.query(Donor, User).join(
        User, Donor.user_id == User.id
    ).filter(
        and_(
            Donor.blood_group.in_(compatible_groups),
            or_(
                Donor.is_available == True,
                Donor.is_available.is_(None)  # Handle null as potentially available
            ),
            User.status == 'active',
            User.is_email_verified == True,
            or_(
                Donor.last_donation_date.is_(None),  # Never donated
                Donor.last_donation_date <= eligibility_date  # Eligible period passed
            )
        )
    )
    
    # Add geofence if donor has location
    if hasattr(Donor, 'location_lat') and hasattr(Donor, 'location_lng'):
        candidates_query = candidates_query.filter(
            and_(
                Donor.location_lat.between(min_lat, max_lat),  # pyright: ignore[reportAttributeAccessIssue]
                Donor.location_lng.between(min_lng, max_lng),  # pyright: ignore[reportAttributeAccessIssue]
                Donor.location_lat.isnot(None),  # pyright: ignore[reportAttributeAccessIssue]
                Donor.location_lng.isnot(None)  # pyright: ignore[reportAttributeAccessIssue]
            )
        )
    
    candidates = candidates_query.all()
    
    # Calculate exact distances and filter
    candidates_with_distance = []
    for donor, user in candidates:
        if hasattr(donor, 'location_lat') and donor.location_lat:
            distance = haversine_distance(
                request_lat, request_lng,
                float(donor.location_lat), float(donor.location_lng)
            )
        else:
            # Fallback: use district-based distance
            donor_lat, donor_lng = get_district_coordinates(
                getattr(user, 'district', 'Ernakulam')
            )
            distance = haversine_distance(
                request_lat, request_lng,
                donor_lat, donor_lng
            )
        
        if distance <= radius_km:
            candidates_with_distance.append((donor, distance))
    
    current_app.logger.info(
        f"Found {len(candidates_with_distance)} eligible donors "
        f"for request {request.id} within {radius_km}km"
    )
    
    return candidates_with_distance


def get_district_coordinates(district: str) -> Tuple[float, float]:
    """
    Get approximate coordinates for Kerala districts
    
    Args:
        district: District name
    
    Returns:
        Tuple of (latitude, longitude)
    """
    coords = {
        'Thiruvananthapuram': (8.5241, 76.9366),
        'Kollam': (8.8932, 76.6141),
        'Pathanamthitta': (9.2648, 76.7870),
        'Alappuzha': (9.4981, 76.3388),
        'Kottayam': (9.5916, 76.5222),
        'Idukki': (9.9186, 77.1025),
        'Ernakulam': (9.9312, 76.2673),
        'Kochi': (9.9312, 76.2673),
        'Thrissur': (10.5276, 76.2144),
        'Palakkad': (10.7867, 76.6548),
        'Malappuram': (11.0510, 76.0711),
        'Kozhikode': (11.2588, 75.7804),
        'Wayanad': (11.6854, 76.1320),
        'Kannur': (11.8745, 75.3704),
        'Kasaragod': (12.4996, 75.0041),
    }
    return coords.get(district, (9.9312, 76.2673))  # Default to Ernakulam


def extract_features(
    request: Request,
    donor: Donor,
    distance_km: float
) -> Dict[str, Any]:
    """
    Extract ML features for a donor-request pair
    
    Args:
        request: Blood request
        donor: Donor candidate
        distance_km: Distance between donor and hospital
    
    Returns:
        Dictionary of features
    """
    from app.extensions import db
    
    # Urgency mapping
    urgency_map = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}
    
    # Calculate donor age
    donor_age = 30  # Default
    if hasattr(donor, 'date_of_birth') and donor.date_of_birth:
        # Convert date to datetime for calculation if needed
        from datetime import date
        if isinstance(donor.date_of_birth, date):
            # If it's a date object, calculate age differently
            today = datetime.utcnow().date()
            donor_age = (today - donor.date_of_birth).days // 365
        else:
            donor_age = (datetime.utcnow() - donor.date_of_birth).days // 365
    
    # Days since last donation
    days_since_last = 365  # Default (never donated or long ago)
    if donor.last_donation_date:
        from datetime import date
        if isinstance(donor.last_donation_date, date):
            # If it's a date object, calculate differently
            today = datetime.utcnow().date()
            days_since_last = (today - donor.last_donation_date).days
        else:
            days_since_last = (datetime.utcnow() - donor.last_donation_date).days
    
    # Recent notifications count (last 7 days)
    recent_notifications = MatchPrediction.query.filter(
        and_(
            MatchPrediction.donor_id == donor.id,
            MatchPrediction.notified == True,
            MatchPrediction.created_at >= datetime.utcnow() - timedelta(days=7)
        )
    ).count()
    
    # Total donations
    total_donations = getattr(donor, 'total_donations', 0)
    
    # Reliability score (0-1)
    reliability = getattr(donor, 'reliability_score', 0.5)
    if reliability is None:
        reliability = 0.5
    
    # Time of day (0-23)
    time_of_day = datetime.utcnow().hour
    
    features = {
        'distance_km': distance_km,
        'donor_age': donor_age,
        'days_since_last_donation': days_since_last,
        'total_donations': total_donations,
        'reliability_score': reliability,
        'is_available': getattr(donor, 'is_available', True),
        'recent_notifications': recent_notifications,
        'urgency_numeric': urgency_map.get(request.urgency, 1),
        'time_of_day': time_of_day,
        'blood_group_match': 1 if donor.blood_group == request.blood_group else 0.8,
    }
    
    return features
