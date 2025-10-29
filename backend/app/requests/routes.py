# backend/app/requests/routes.py
from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models import Request, User, Donor, Hospital
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from sqlalchemy import and_
from .match_status import get_match_status

req_bp = Blueprint("requests", __name__, url_prefix="/api/requests")

@req_bp.route("", methods=["POST"])
@jwt_required(optional=False)
def create_request():
    """
    Seeker creates a blood request.
    Body: {
        patient_name (required): string, max 255 chars
        blood_group (required): string (A+, A-, B+, B-, O+, O-, AB+, AB-)
        units_required (required): integer, 1-20
        urgency (required): string (critical, high, medium, low)
        contact_person (required): string, max 255 chars
        contact_phone (required): string
        required_by (required): datetime ISO string
        description (optional): string, max 1000 chars
    }
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role not in ["seeker", "staff"]:
        return jsonify({"error": "only seekers/staff can create requests"}), 403

    data = request.get_json() or {}
    
    # Validate required fields
    required_fields = ["patient_name", "blood_group", "units_required", 
                      "urgency", "contact_person", "contact_phone", "required_by"]
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
    
    # Validate blood group
    valid_blood_groups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
    blood_group_raw = data.get("blood_group")
    if not blood_group_raw or not isinstance(blood_group_raw, str):
        return jsonify({"error": "Blood group is required and must be a string"}), 400
    blood_group = blood_group_raw.strip()
    if blood_group not in valid_blood_groups:
        return jsonify({"error": f"Invalid blood group. Must be one of: {', '.join(valid_blood_groups)}"}), 400
    
    # Validate units
    try:
        units_raw = data.get("units_required")
        if units_raw is None:
            return jsonify({"error": "Units required is mandatory"}), 400
        units = int(units_raw)
        if units < 1 or units > 20:
            return jsonify({"error": "Units required must be between 1 and 20"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Units required must be a valid integer"}), 400
    
    # Validate urgency
    valid_urgencies = ["critical", "high", "medium", "low"]
    urgency_raw = data.get("urgency")
    if not urgency_raw or not isinstance(urgency_raw, str):
        return jsonify({"error": "Urgency is required and must be a string"}), 400
    urgency = urgency_raw.lower().strip()
    if urgency not in valid_urgencies:
        return jsonify({"error": f"Invalid urgency. Must be one of: {', '.join(valid_urgencies)}"}), 400
    
    # Validate required_by datetime
    try:
        required_by_raw = data.get("required_by")
        if not required_by_raw or not isinstance(required_by_raw, str):
            return jsonify({"error": "Required by date is mandatory and must be a string"}), 400
        required_by = datetime.fromisoformat(required_by_raw.replace('Z', '+00:00'))
        if required_by <= datetime.utcnow():
            return jsonify({"error": "Required by date must be in the future"}), 400
    except (ValueError, AttributeError) as e:
        return jsonify({"error": "Invalid required_by datetime format. Use ISO format (YYYY-MM-DDTHH:MM)"}), 400
    
    # Validate patient name length
    patient_name_raw = data.get("patient_name")
    if not patient_name_raw or not isinstance(patient_name_raw, str):
        return jsonify({"error": "Patient name is required and must be a string"}), 400
    patient_name = patient_name_raw.strip()
    if len(patient_name) > 255:
        return jsonify({"error": "Patient name must not exceed 255 characters"}), 400
    
    # Validate contact person length
    contact_person_raw = data.get("contact_person")
    if not contact_person_raw or not isinstance(contact_person_raw, str):
        return jsonify({"error": "Contact person is required and must be a string"}), 400
    contact_person = contact_person_raw.strip()
    if len(contact_person) > 255:
        return jsonify({"error": "Contact person name must not exceed 255 characters"}), 400
    
    # Validate contact phone
    contact_phone_raw = data.get("contact_phone")
    if not contact_phone_raw or not isinstance(contact_phone_raw, str):
        return jsonify({"error": "Contact phone is required and must be a string"}), 400
    contact_phone = contact_phone_raw.strip()
    if len(contact_phone) < 10 or len(contact_phone) > 15:
        return jsonify({"error": "Contact phone must be between 10 and 15 digits"}), 400
    
    # Validate description length if provided
    description_raw = data.get("description", "")
    description = description_raw.strip() if isinstance(description_raw, str) else ""
    if len(description) > 1000:
        return jsonify({"error": "Description must not exceed 1000 characters"}), 400
    
    # Get hospital_id from user's associated hospital (if user is staff)
    hospital_id = None
    if user.role == "staff":
        # Get hospital from staff user's association
        hospital = Hospital.query.filter_by(email=user.email).first()
        if hospital:
            hospital_id = hospital.id
    
    # Create new blood request
    try:
        # Create request object using setattr to avoid type checker issues
        r = Request()
        r.seeker_id = user_id
        r.hospital_id = hospital_id
        r.patient_name = patient_name
        r.blood_group = blood_group
        r.units_required = units
        r.urgency = urgency
        r.contact_person = contact_person
        r.contact_phone = contact_phone
        r.required_by = required_by
        r.description = description if description else None
        r.status = "pending"
        r.created_at = datetime.utcnow()
        
        db.session.add(r)
        db.session.commit()
        
        # Prepare response immediately (don't wait for task)
        response_data = {
            "message": "Blood request created successfully",
            "request_id": r.id,
            "status": r.status,
            "patient_name": r.patient_name,
            "blood_group": r.blood_group,
            "units_required": r.units_required,
            "urgency": r.urgency,
            "required_by": r.required_by.isoformat() if r.required_by else None,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        
        # Enqueue background task for donor matching (non-blocking with timeout)
        def enqueue_matching_task():
            try:
                # Lazy import to avoid circular dependency
                from app.tasks.donor_matching import match_donors_for_request
                
                current_app.logger.info(f"Attempting to enqueue donor matching for request {r.id}")
                
                # Try to enqueue with a short timeout to avoid blocking
                try:
                    # Use apply_async for truly async execution
                    result = match_donors_for_request.apply_async(  # pyright: ignore[reportFunctionMemberAccess]
                        args=[r.id],
                        kwargs={'radius_km': 20.0, 'top_k': 10},
                        countdown=2,  # Start after 2 seconds
                        expires=3600  # Task expires after 1 hour if not picked up
                    )
                    current_app.logger.info(f"Task enqueued successfully: {result.id}")
                except Exception as task_error:
                    # If task enqueueing fails (Redis down, etc.), log but don't crash
                    current_app.logger.warning(
                        f"Could not enqueue task (Celery/Redis may not be running): {str(task_error)}"
                    )
                    current_app.logger.info("Request created successfully, but auto-matching disabled")
                    
            except ImportError:
                current_app.logger.warning("Celery tasks not available, skipping auto-matching")
            except Exception as e:
                current_app.logger.warning(f"Unexpected error enqueueing task: {str(e)}")
        
        # Run task enqueueing in background thread with timeout
        import threading
        thread = threading.Thread(target=enqueue_matching_task, daemon=True)
        thread.start()
        # Don't wait for thread to complete - return immediately
        
        # Return response immediately (within 100ms)
        return jsonify(response_data), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating blood request: {str(e)}")
        return jsonify({"error": "Failed to create blood request", "details": str(e)}), 500

@req_bp.route("", methods=["GET"])
@jwt_required()
def list_requests():
    """
    List requests (for admin or for the seeker who created them)
    Query params: mine=true to list only own
    """
    try:
        uid = get_jwt_identity()
        # Convert uid to integer to match database column type
        try:
            uid = int(uid)
        except (ValueError, TypeError):
            current_app.logger.error(f"Invalid user ID: {uid}")
            return jsonify({"error": "Invalid user ID"}), 400

        mine = request.args.get("mine", "false").lower() == "true"
        q = Request.query
        if mine:
            q = q.filter_by(seeker_id=uid)
        results = []
        for r in q.order_by(Request.created_at.desc()).limit(50).all():
            results.append({
                "id": r.id,
                "seeker_id": r.seeker_id,
                "blood_group": r.blood_group,
                "units_required": r.units_required,
                "urgency": r.urgency,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None
            })
        return jsonify({"items": results, "results": results, "count": len(results)})
    except Exception as e:
        current_app.logger.error(f"Error listing requests: {str(e)}")
        return jsonify({"error": "Failed to list requests", "details": str(e)}), 500


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


@req_bp.route("/<int:request_id>/match-status", methods=["GET"])
@jwt_required()
def get_request_match_status(request_id):
    """
    Get real-time status of donor matching for a blood request
    Supports incremental polling with ?since=<timestamp>
    
    Query params:
        since (optional): ISO timestamp - only return matches created after this time
    
    Returns:
        {
            "request_id": int,
            "status": "running" | "done" | "none_found" | "pending",
            "found_count": int,
            "matched": [array of donor match objects],
            "updated_at": ISO timestamp,
            "search_metadata": {...}
        }
    """
    try:
        # Verify user has access to this request
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Allow staff/seeker who created it, or admins
        blood_request = Request.query.get(request_id)
        if not blood_request:
            return jsonify({"error": "Request not found"}), 404
        
        # Authorization check
        if user.role not in ['admin'] and blood_request.seeker_id != int(user_id):
            return jsonify({"error": "Unauthorized access to this request"}), 403
        
        # Get 'since' parameter for incremental updates
        from flask import request as flask_request
        since = flask_request.args.get('since', None)
        
        # Get match status from helper function
        result, status_code = get_match_status(request_id, since)
        
        return jsonify(result), status_code
        
    except Exception as e:
        current_app.logger.error(f"Error in match-status endpoint: {str(e)}")
        return jsonify({"error": "Failed to get match status", "details": str(e)}), 500


@req_bp.route("/<int:request_id>/retry-matching", methods=["POST"])
@jwt_required()
def retry_matching(request_id):
    """
    Retry donor matching for a failed or incomplete search
    Allows staff to manually re-trigger the matching process
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get the request
        blood_request = Request.query.get(request_id)
        if not blood_request:
            return jsonify({"error": "Request not found"}), 404
        
        # Authorization check
        if user.role not in ['admin'] and blood_request.seeker_id != int(user_id):
            return jsonify({"error": "Unauthorized"}), 403
        
        # Enqueue matching task again
        try:
            from app.tasks.donor_matching import match_donors_for_request
            
            current_app.logger.info(f"Retrying donor matching for request {request_id}")
            match_donors_for_request.apply_async(  # pyright: ignore[reportFunctionMemberAccess]
                args=[request_id],
                kwargs={'radius_km': 20.0, 'top_k': 10},
                countdown=1
            )
            
            return jsonify({
                "message": "Donor matching restarted",
                "request_id": request_id
            }), 200
            
        except Exception as task_error:
            current_app.logger.error(f"Failed to enqueue retry task: {str(task_error)}")
            return jsonify({"error": "Failed to restart matching", "details": str(task_error)}), 500
            
    except Exception as e:
        current_app.logger.error(f"Error in retry-matching endpoint: {str(e)}")
        return jsonify({"error": "Failed to retry matching", "details": str(e)}), 500


@req_bp.route("/<int:request_id>/expand-search", methods=["POST"])
@jwt_required()
def expand_search(request_id):
    """
    Expand search radius for donor matching
    Useful when no donors found in initial radius
    
    Body: { "radius_km": 50 }
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        blood_request = Request.query.get(request_id)
        if not blood_request:
            return jsonify({"error": "Request not found"}), 404
        
        # Authorization check
        if user.role not in ['admin'] and blood_request.seeker_id != int(user_id):
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get new radius from request body
        from flask import request as flask_request
        data = flask_request.get_json() or {}
        radius_km = data.get('radius_km', 50.0)
        
        # Validate radius
        if not isinstance(radius_km, (int, float)) or radius_km < 20 or radius_km > 100:
            return jsonify({"error": "Radius must be between 20 and 100 km"}), 400
        
        # Enqueue matching task with expanded radius
        try:
            from app.tasks.donor_matching import match_donors_for_request
            
            current_app.logger.info(f"Expanding search for request {request_id} to {radius_km} km")
            match_donors_for_request.apply_async(  # pyright: ignore[reportFunctionMemberAccess]
                args=[request_id],
                kwargs={'radius_km': radius_km, 'top_k': 15},  # More donors for wider radius
                countdown=1
            )
            
            return jsonify({
                "message": f"Search expanded to {radius_km} km",
                "request_id": request_id,
                "radius_km": radius_km
            }), 200
            
        except Exception as task_error:
            current_app.logger.error(f"Failed to enqueue expand task: {str(task_error)}")
            return jsonify({"error": "Failed to expand search", "details": str(task_error)}), 500
            
    except Exception as e:
        current_app.logger.error(f"Error in expand-search endpoint: {str(e)}")
        return jsonify({"error": "Failed to expand search", "details": str(e)}), 500


@req_bp.route("/<int:request_id>/notify-emergency", methods=["POST"])
@jwt_required()
def notify_emergency(request_id):
    """
    Send emergency notification to nearby hospitals and blood banks
    Bypasses normal ML matching and notifies curated emergency network
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        blood_request = Request.query.get(request_id)
        if not blood_request:
            return jsonify({"error": "Request not found"}), 404
        
        # Authorization check
        if user.role not in ['admin'] and blood_request.seeker_id != int(user_id):
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get all active hospitals in the district
        from app.services.email_service import email_service
        from app.services.sms_service import sms_service
        
        hospital = None
        if blood_request.hospital_id:
            hospital = Hospital.query.get(blood_request.hospital_id)
        
        # Find nearby hospitals (same district or neighboring)
        target_hospitals = []
        if hospital:
            target_hospitals = Hospital.query.filter(
                and_(
                    Hospital.is_active == True,
                    Hospital.id != hospital.id,
                    Hospital.district.in_([hospital.district, hospital.city])
                )
            ).limit(10).all()
        else:
            target_hospitals = Hospital.query.filter(
                Hospital.is_active == True
            ).limit(10).all()
        
        # Send emergency notifications
        notifications_sent = 0
        for target_hosp in target_hospitals:
            if target_hosp.email:
                try:
                    email_service.send_email(
                        to=target_hosp.email,
                        subject=f"URGENT: {blood_request.blood_group} Blood Needed",
                        html=f"""
                        <h2>Emergency Blood Request</h2>
                        <p>A nearby hospital urgently needs blood:</p>
                        <ul>
                            <li><strong>Blood Group:</strong> {blood_request.blood_group}</li>
                            <li><strong>Units Required:</strong> {blood_request.units_required}</li>
                            <li><strong>Urgency:</strong> {blood_request.urgency.upper()}</li>
                            <li><strong>Required By:</strong> {blood_request.required_by.strftime('%Y-%m-%d %H:%M') if blood_request.required_by else 'ASAP'}</li>
                            <li><strong>Contact:</strong> {blood_request.contact_person} - {blood_request.contact_phone}</li>
                        </ul>
                        <p>Please check your blood bank inventory and respond if you can help.</p>
                        <p><small>Smart Blood Connect - Emergency Network</small></p>
                        """
                    )
                    notifications_sent += 1
                except Exception as e:
                    current_app.logger.error(f"Failed to notify hospital {target_hosp.id}: {str(e)}")
        
        current_app.logger.info(f"Emergency notification sent for request {request_id} to {notifications_sent} hospitals")
        
        return jsonify({
            "message": "Emergency network notified",
            "request_id": request_id,
            "hospitals_notified": notifications_sent
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in notify-emergency endpoint: {str(e)}")
        return jsonify({"error": "Failed to send emergency notification", "details": str(e)}), 500
