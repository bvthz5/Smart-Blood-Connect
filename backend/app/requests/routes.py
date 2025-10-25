# backend/app/requests/routes.py
from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models import Request, User, Donor, Hospital
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

req_bp = Blueprint("requests", __name__, url_prefix="/api/requests")

@req_bp.route("", methods=["POST"])
@jwt_required(optional=False)
def create_request():
    """
    Seeker creates a blood request.
    Body: { blood_group, units_required, urgency, location }
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != "seeker":
        return jsonify({"error": "only seekers can create requests"}), 403

    data = request.get_json() or {}
    blood_group = data.get("blood_group")
    units = int(data.get("units_required", 1))
    urgency = data.get("urgency", "normal")
    location = data.get("location")

    r = Request(seeker_id=user_id, blood_group=blood_group, units_required=units,
                urgency=urgency, location=location, status="pending", created_at=datetime.utcnow())
    db.session.add(r)
    db.session.commit()
    return jsonify({"request_id": r.id, "status": r.status}), 201

@req_bp.route("", methods=["GET"])
@jwt_required()
def list_requests():
    """
    List requests (for admin or for the seeker who created them)
    Query params: mine=true to list only own
    """
    uid = get_jwt_identity()
    mine = request.args.get("mine", "false").lower() == "true"
    q = Request.query
    if mine:
        q = q.filter_by(seeker_id=uid)
    results = []
    for r in q.order_by(Request.created_at.desc()).limit(50).all():
        results.append({
            "id": r.id, "seeker_id": r.seeker_id, "blood_group": r.blood_group,
            "units_required": r.units_required, "urgency": r.urgency, "status": r.status,
            "created_at": r.created_at.isoformat()
        })
    return jsonify(results)


@req_bp.route("/nearby", methods=["GET"])
@jwt_required()
def get_nearby_requests():
    """
    Get blood requests near a location
    Query params: lat, lng, radius (in km, default 50)
    """
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    radius = request.args.get("radius", default=50, type=float)
    
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400
    
    # Calculate distance and filter by radius
    # Using Haversine formula for distance calculation
    from math import radians, cos, sin, asin, sqrt
    
    def haversine(lat1, lon1, lat2, lon2):
        """Calculate the great circle distance between two points on the earth"""
        # convert decimal degrees to radians 
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        
        # haversine formula 
        dlon = lon2 - lon1 
        dlat = lat2 - lat1 
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a)) 
        r = 6371 # Radius of earth in kilometers
        return c * r
    
    # Kerala district coordinates (central points) for fallback
    district_coords = {
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
    
    # Get all active requests with hospital information
    requests_query = Request.query.filter(
        Request.status.in_(['pending', 'urgent'])
    ).all()
    
    nearby_results = []
    for req in requests_query:
        # Get hospital information if hospital_id exists
        hospital = None
        if hasattr(req, 'hospital_id') and req.hospital_id:
            hospital = Hospital.query.get(req.hospital_id)
        
        # If no hospital_id or hospital not found, create a mock hospital for demo
        if not hospital:
            # Create mock hospital data for demonstration
            hosp_lat, hosp_lng = district_coords.get('Kochi', (9.9312, 76.2673))
            hospital_name = f"Medical Center {req.id}"
            hospital_address = "Sample Address, Kochi"
        else:
            # Use district coordinates as fallback until hospitals have lat/lng
            hosp_lat, hosp_lng = district_coords.get(hospital.district, (9.9312, 76.2673))
            hospital_name = hospital.name
            hospital_address = hospital.address or "Address not available"
        
        # Calculate actual distance using Haversine
        distance = haversine(lat, lng, hosp_lat, hosp_lng)
        
        if distance <= radius:
            nearby_results.append({
                "id": req.id,
                "hospital_id": getattr(req, 'hospital_id', None),
                "hospital_name": hospital_name,
                "blood_group": req.blood_group,
                "units_required": req.units_required,
                "urgency": req.urgency,
                "status": req.status,
                "contact_person": getattr(req, 'contact_person', 'Contact Person'),
                "contact_phone": getattr(req, 'contact_phone', '1234567890'),
                "required_by": req.required_by.isoformat() if hasattr(req, 'required_by') and req.required_by else None,
                "created_at": req.created_at.isoformat(),
                "distance_km": round(distance, 2),
                "address": hospital_address,
                "city": getattr(hospital, 'city', 'Kochi') if hospital else 'Kochi',
                "district": getattr(hospital, 'district', 'Ernakulam') if hospital else 'Ernakulam',
                "lat": hosp_lat,
                "lng": hosp_lng
            })
    
    # Sort by distance
    nearby_results.sort(key=lambda x: x['distance_km'])
    
    return jsonify({"requests": nearby_results, "count": len(nearby_results)})
