# backend/app/requests/match_status.py
"""
Real-time match status endpoint for donor search progress
Provides incremental updates as ML matching progresses
"""

from flask import jsonify, current_app
from app.models import Request, MatchPrediction, Donor, User
from app.extensions import db
from datetime import datetime
from sqlalchemy import and_


def get_match_status(request_id, since=None):
    """
    Get current status of donor matching for a request
    
    Args:
        request_id: Blood request ID
        since: Optional timestamp to get only new matches
    
    Returns:
        {
            "request_id": int,
            "status": "running" | "done" | "failed" | "none_found" | "pending",
            "found_count": int,
            "matched": [donor_match_objects],
            "updated_at": ISO timestamp,
            "search_metadata": {
                "radius_km": float,
                "hospital_name": str,
                "hospital_location": {"lat": float, "lng": float}
            }
        }
    """
    try:
        # Get the request
        req = Request.query.get(request_id)
        if not req:
            return {"error": "Request not found"}, 404
        
        # Build query for match predictions
        query = MatchPrediction.query.filter(
            MatchPrediction.request_id == request_id
        )
        
        # If 'since' provided, only return matches created after that timestamp
        if since:
            try:
                since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
                query = query.filter(MatchPrediction.created_at > since_dt)
            except (ValueError, AttributeError):
                pass  # Ignore invalid timestamp
        
        # Order by rank (best matches first)
        predictions = query.order_by(MatchPrediction.rank.asc()).all()
        
        # Get total count (including older matches if 'since' was used)
        total_count = MatchPrediction.query.filter(
            MatchPrediction.request_id == request_id
        ).count()
        
        # Determine status
        status = determine_search_status(req, total_count)
        
        # Build matched donors array
        matched = []
        for pred in predictions:
            donor = Donor.query.get(pred.donor_id)
            if not donor:
                continue
            
            user = User.query.get(donor.user_id)
            if not user:
                continue
            
            # Build donor match object
            match_obj = {
                "match_prediction_id": pred.id,
                "donor_id": donor.id,
                "donor_name": f"{user.first_name} {user.last_name}",
                "blood_group": donor.blood_group,
                "distance_km": round(pred.feature_vector.get('distance_km', 0), 1) if pred.feature_vector else 0,
                "match_score": round(pred.match_score, 2) if pred.match_score else 0,
                "availability_score": round(pred.availability_score, 2) if pred.availability_score else 0,
                "response_time_hours": round(pred.response_time_hours, 1) if pred.response_time_hours else None,
                "reliability_score": round(pred.reliability_score, 2) if pred.reliability_score else 0,
                "location": {
                    "lat": float(donor.location_lat) if donor.location_lat else None,
                    "lng": float(donor.location_lng) if donor.location_lng else None
                },
                "last_donation_date": donor.last_donation_date.isoformat() if donor.last_donation_date else None,
                "contact_phone": user.phone if pred.notified else None,  # Only show if notified
                "is_available": donor.is_available,
                "rank": pred.rank,
                "notified": pred.notified
            }
            matched.append(match_obj)
        
        # Get hospital metadata for map
        hospital_data = None
        if req.hospital_id:
            from app.models import Hospital
            hospital = Hospital.query.get(req.hospital_id)
            if hospital:
                # Use district coordinates as fallback (as per memory)
                district_coords = get_district_coordinates()
                hosp_lat, hosp_lng = district_coords.get(
                    hospital.district, 
                    (9.9312, 76.2673)  # Default to Kochi
                )
                
                hospital_data = {
                    "name": hospital.name,
                    "location": {
                        "lat": hosp_lat,
                        "lng": hosp_lng
                    },
                    "district": hospital.district,
                    "city": hospital.city
                }
        
        # Build response
        response = {
            "request_id": request_id,
            "status": status,
            "found_count": total_count,
            "matched": matched,
            "updated_at": datetime.utcnow().isoformat() + 'Z',
            "search_metadata": {
                "radius_km": 20.0,  # Default from geofencing
                "blood_group": req.blood_group,
                "units_required": req.units_required,
                "urgency": req.urgency,
                "hospital": hospital_data
            }
        }
        
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting match status: {str(e)}")
        return {"error": "Failed to get match status", "details": str(e)}, 500


def determine_search_status(request, match_count):
    """
    Determine current status of donor search
    
    Returns: "pending" | "running" | "done" | "none_found" | "failed"
    """
    # Check if request is very recent (< 5 seconds) and has no matches yet
    age_seconds = (datetime.utcnow() - request.created_at).total_seconds()
    
    if match_count == 0:
        if age_seconds < 10:
            return "running"  # Still searching
        elif age_seconds < 60:
            return "running"  # Give it up to 60 seconds
        else:
            return "none_found"  # Search complete, no donors found
    
    # Check if all top matches have been notified (indicates completion)
    notified_count = MatchPrediction.query.filter(
        and_(
            MatchPrediction.request_id == request.id,
            MatchPrediction.notified == True
        )
    ).count()
    
    if notified_count > 0 and notified_count >= min(match_count, 10):
        return "done"  # Top 10 notified, search complete
    
    # Still finding or processing matches
    if age_seconds < 30:
        return "running"
    else:
        return "done"  # After 30 seconds, consider it done even if not all notified


def get_district_coordinates():
    """Kerala district coordinates for hospital location fallback"""
    return {
        'Kochi': (9.9312, 76.2673),
        'Ernakulam': (9.9312, 76.2673),
        'Thiruvananthapuram': (8.5241, 76.9366),
        'Kozhikode': (11.2588, 75.7804),
        'Thrissur': (10.5276, 76.2144),
        'Kollam': (8.8932, 76.6141),
        'Palakkad': (10.7867, 76.6548),
        'Malappuram': (11.0510, 76.0711),
        'Kannur': (11.8745, 75.3704),
        'Alappuzha': (9.4981, 76.3388),
        'Kottayam': (9.5916, 76.5222),
        'Pathanamthitta': (9.2648, 76.7870),
        'Idukki': (9.9186, 77.1025),
        'Wayanad': (11.6854, 76.1320),
        'Kasaragod': (12.4996, 75.0041)
    }
