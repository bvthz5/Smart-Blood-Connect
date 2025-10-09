"""
Admin Routes
"""
from flask import Blueprint, request, jsonify
from app.models import User, Request, Donor, Hospital, Match, DonationHistory
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def get_all_users():
    """
    Get All Users
    ---
    tags:
      - Admin
    summary: Get list of all users
    description: Retrieve a list of all users in the system (admin only)
    security:
      - Bearer: []
    produces:
      - application/json
    parameters:
      - in: query
        name: role
        type: string
        description: Filter users by role (donor, hospital, admin)
        required: false
      - in: query
        name: page
        type: integer
        description: Page number for pagination
        required: false
        default: 1
      - in: query
        name: per_page
        type: integer
        description: Number of users per page
        required: false
        default: 50
    responses:
      200:
        description: Users retrieved successfully
        schema:
          type: object
          properties:
            users:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: integer
                    example: 1
                  name:
                    type: string
                    example: John Doe
                  email:
                    type: string
                    example: john@example.com
                  phone:
                    type: string
                    example: +91-9876543210
                  role:
                    type: string
                    example: donor
                  is_active:
                    type: boolean
                    example: true
                  created_at:
                    type: string
                    format: date-time
            total:
              type: integer
              example: 150
            page:
              type: integer
              example: 1
            per_page:
              type: integer
              example: 50
      401:
        description: Unauthorized
        schema:
          type: object
          properties:
            error:
              type: string
              example: Unauthorized
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get query parameters
        role_filter = request.args.get('role')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        # Build query
        query = User.query
        
        if role_filter:
            query = query.filter_by(role=role_filter)
        
        # Get paginated results
        users_pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        users_data = []
        for user in users_pagination.items:
            users_data.append({
                "id": user.id,
                "name": f"{user.first_name} {user.last_name}".strip(),
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None
            })
        
        return jsonify({
            "users": users_data,
            "total": users_pagination.total,
            "page": page,
            "per_page": per_page
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch users"}), 500


@admin_bp.route("/donors", methods=["GET"])
@jwt_required()
def get_all_donors():
    """
    Get All Donors with search, filter, and pagination
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get query parameters
        search = request.args.get('search', '').strip()
        blood_group = request.args.get('blood_group', '')
        status = request.args.get('status', '')
        availability = request.args.get('availability', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Build query with joins
        query = db.session.query(User, Donor).join(Donor, User.id == Donor.user_id)
        
        # Apply filters
        if search:
            search_filter = or_(
                User.first_name.ilike(f'%{search}%'),
                User.last_name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%'),
                User.phone.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        if blood_group:
            query = query.filter(Donor.blood_group == blood_group)
        
        if status:
            query = query.filter(User.status == status)
        
        if availability:
            if availability == 'available':
                query = query.filter(Donor.is_available == True)
            elif availability == 'unavailable':
                query = query.filter(Donor.is_available == False)
        
        # Get paginated results
        donors_pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        donors_data = []
        for user, donor in donors_pagination.items:
            donors_data.append({
                "id": user.id,
                "donor_id": donor.id,
                "name": f"{user.first_name} {user.last_name or ''}".strip(),
                "email": user.email,
                "phone": user.phone,
                "blood_group": donor.blood_group,
                "gender": donor.gender,
                "date_of_birth": donor.date_of_birth.isoformat() if donor.date_of_birth else None,
                "is_available": donor.is_available,
                "last_donation_date": donor.last_donation_date.isoformat() if donor.last_donation_date else None,
                "reliability_score": donor.reliability_score,
                "status": user.status,
                "city": user.city,
                "district": user.district,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None
            })
        
        return jsonify({
            "donors": donors_data,
            "total": donors_pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": donors_pagination.pages
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch donors"}), 500


@admin_bp.route("/donors/<int:donor_id>", methods=["PUT"])
@jwt_required()
def update_donor(donor_id):
    """
    Update donor information
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get donor and user
        donor = Donor.query.get(donor_id)
        if not donor:
            return jsonify({"error": "Donor not found"}), 404
        
        user = User.query.get(donor.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json() or {}
        
        # Update user fields
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            user.email = data['email']
        if 'phone' in data:
            user.phone = data['phone']
        if 'city' in data:
            user.city = data['city']
        if 'district' in data:
            user.district = data['district']
        if 'status' in data:
            user.status = data['status']
        
        # Update donor fields
        if 'blood_group' in data:
            donor.blood_group = data['blood_group']
        if 'gender' in data:
            donor.gender = data['gender']
        if 'date_of_birth' in data:
            donor.date_of_birth = data['date_of_birth']
        if 'is_available' in data:
            donor.is_available = data['is_available']
        if 'reliability_score' in data:
            donor.reliability_score = data['reliability_score']
        
        db.session.commit()
        
        return jsonify({"message": "Donor updated successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update donor"}), 500


@admin_bp.route("/donors/<int:donor_id>", methods=["DELETE"])
@jwt_required()
def delete_donor(donor_id):
    """
    Delete donor (soft delete by setting status to 'deleted')
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get donor and user
        donor = Donor.query.get(donor_id)
        if not donor:
            return jsonify({"error": "Donor not found"}), 404
        
        user = User.query.get(donor.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Soft delete by setting status to 'deleted'
        user.status = 'deleted'
        db.session.commit()
        
        return jsonify({"message": "Donor deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete donor"}), 500


@admin_bp.route("/donors/<int:donor_id>/block", methods=["POST"])
@jwt_required()
def block_donor(donor_id):
    """
    Block or unblock donor
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get donor and user
        donor = Donor.query.get(donor_id)
        if not donor:
            return jsonify({"error": "Donor not found"}), 404
        
        user = User.query.get(donor.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json() or {}
        action = data.get('action', 'block')  # 'block' or 'unblock'
        
        if action == 'block':
            user.status = 'blocked'
            message = "Donor blocked successfully"
        else:
            user.status = 'active'
            message = "Donor unblocked successfully"
        
        db.session.commit()
        
        return jsonify({"message": message}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update donor status"}), 500


@admin_bp.route("/hospitals", methods=["GET"])
@jwt_required()
def get_all_hospitals():
    """
    Get All Hospitals with search, filter, and pagination
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get query parameters
        search = request.args.get('search', '').strip()
        district = request.args.get('district', '')
        city = request.args.get('city', '')
        is_verified = request.args.get('is_verified', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Build query
        query = Hospital.query
        
        # Apply filters
        if search:
            search_filter = or_(
                Hospital.name.ilike(f'%{search}%'),
                Hospital.email.ilike(f'%{search}%'),
                Hospital.phone.ilike(f'%{search}%'),
                Hospital.license_number.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        if district:
            query = query.filter(Hospital.district == district)
        
        if city:
            query = query.filter(Hospital.city == city)
        
        if is_verified:
            if is_verified == 'verified':
                query = query.filter(Hospital.is_verified == True)
            elif is_verified == 'unverified':
                query = query.filter(Hospital.is_verified == False)
        
        # Get paginated results
        hospitals_pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        hospitals_data = []
        for hospital in hospitals_pagination.items:
            hospitals_data.append({
                "id": hospital.id,
                "name": hospital.name,
                "email": hospital.email,
                "phone": hospital.phone,
                "address": hospital.address,
                "district": hospital.district,
                "city": hospital.city,
                "license_number": hospital.license_number,
                "is_verified": hospital.is_verified,
                "created_at": hospital.created_at.isoformat() if hospital.created_at else None,
                "updated_at": hospital.updated_at.isoformat() if hospital.updated_at else None
            })
        
        return jsonify({
            "hospitals": hospitals_data,
            "total": hospitals_pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": hospitals_pagination.pages
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch hospitals"}), 500


@admin_bp.route("/hospitals", methods=["POST"])
@jwt_required()
def create_hospital():
    """
    Create a new hospital
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['name', 'email', 'phone', 'address', 'district', 'city']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        # Check if email already exists
        if Hospital.query.filter_by(email=data['email']).first():
            return jsonify({"error": "Hospital with this email already exists"}), 409
        
        # Check if license number already exists (if provided)
        if data.get('license_number') and Hospital.query.filter_by(license_number=data['license_number']).first():
            return jsonify({"error": "Hospital with this license number already exists"}), 409
        
        # Create new hospital
        hospital = Hospital(
            name=data['name'],
            email=data['email'],
            phone=data['phone'],
            address=data['address'],
            district=data['district'],
            city=data['city'],
            license_number=data.get('license_number', ''),
            is_verified=data.get('is_verified', False)
        )
        
        db.session.add(hospital)
        db.session.commit()
        
        return jsonify({
            "message": "Hospital created successfully",
            "hospital_id": hospital.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create hospital"}), 500


@admin_bp.route("/hospitals/<int:hospital_id>", methods=["PUT"])
@jwt_required()
def update_hospital(hospital_id):
    """
    Update hospital information
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get hospital
        hospital = Hospital.query.get(hospital_id)
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404
        
        data = request.get_json() or {}
        
        # Check if email already exists (excluding current hospital)
        if 'email' in data and data['email'] != hospital.email:
            if Hospital.query.filter(Hospital.email == data['email'], Hospital.id != hospital_id).first():
                return jsonify({"error": "Hospital with this email already exists"}), 409
        
        # Check if license number already exists (excluding current hospital)
        if 'license_number' in data and data['license_number'] != hospital.license_number:
            if Hospital.query.filter(Hospital.license_number == data['license_number'], Hospital.id != hospital_id).first():
                return jsonify({"error": "Hospital with this license number already exists"}), 409
        
        # Update hospital fields
        if 'name' in data:
            hospital.name = data['name']
        if 'email' in data:
            hospital.email = data['email']
        if 'phone' in data:
            hospital.phone = data['phone']
        if 'address' in data:
            hospital.address = data['address']
        if 'district' in data:
            hospital.district = data['district']
        if 'city' in data:
            hospital.city = data['city']
        if 'license_number' in data:
            hospital.license_number = data['license_number']
        if 'is_verified' in data:
            hospital.is_verified = data['is_verified']
        
        db.session.commit()
        
        return jsonify({"message": "Hospital updated successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update hospital"}), 500


@admin_bp.route("/hospitals/<int:hospital_id>", methods=["DELETE"])
@jwt_required()
def delete_hospital(hospital_id):
    """
    Delete hospital
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get hospital
        hospital = Hospital.query.get(hospital_id)
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404
        
        # Check if hospital has associated requests
        if hospital.requests:
            return jsonify({"error": "Cannot delete hospital with associated requests"}), 400
        
        db.session.delete(hospital)
        db.session.commit()
        
        return jsonify({"message": "Hospital deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete hospital"}), 500


@admin_bp.route("/matches", methods=["GET"])
@jwt_required()
def get_all_matches():
    """
    Get All Blood Matches with search, filter, and pagination
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get query parameters
        search = request.args.get('search', '').strip()
        status = request.args.get('status', '')
        blood_group = request.args.get('blood_group', '')
        urgency = request.args.get('urgency', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Build query with joins
        query = db.session.query(Match, Donor, Request, Hospital).join(
            Donor, Match.donor_id == Donor.id
        ).join(
            Request, Match.request_id == Request.id
        ).join(
            Hospital, Request.hospital_id == Hospital.id
        )
        
        # Apply filters
        if search:
            search_filter = or_(
                Donor.name.ilike(f'%{search}%'),
                Hospital.name.ilike(f'%{search}%'),
                Request.patient_name.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        if status:
            query = query.filter(Match.status == status)
        
        if blood_group:
            query = query.filter(Request.blood_group == blood_group)
        
        if urgency:
            query = query.filter(Request.urgency == urgency)
        
        # Get paginated results
        matches_pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        matches_data = []
        for match, donor, request_obj, hospital in matches_pagination.items:
            # Calculate match score based on various factors
            match_score = calculate_match_score(donor, request_obj)
            
            matches_data.append({
                "id": match.id,
                "donor_name": donor.name,
                "donor_email": donor.email,
                "donor_phone": donor.phone,
                "hospital_name": hospital.name,
                "hospital_city": hospital.city,
                "patient_name": request_obj.patient_name,
                "blood_group": request_obj.blood_group,
                "units_required": request_obj.units_required,
                "urgency": request_obj.urgency,
                "match_score": match_score,
                "status": match.status,
                "matched_at": match.matched_at.isoformat() if match.matched_at else None,
                "confirmed_at": match.confirmed_at.isoformat() if match.confirmed_at else None,
                "completed_at": match.completed_at.isoformat() if match.completed_at else None,
                "notes": match.notes
            })
        
        return jsonify({
            "matches": matches_data,
            "total": matches_pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": matches_pagination.pages
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch matches"}), 500


@admin_bp.route("/matches/<int:match_id>/status", methods=["PUT"])
@jwt_required()
def update_match_status(match_id):
    """
    Update match status (accept, decline, complete)
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get match
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404
        
        data = request.get_json() or {}
        new_status = data.get('status')
        notes = data.get('notes', '')
        
        if not new_status:
            return jsonify({"error": "Status is required"}), 400
        
        # Validate status
        valid_statuses = ['pending', 'accepted', 'declined', 'completed', 'cancelled']
        if new_status not in valid_statuses:
            return jsonify({"error": "Invalid status"}), 400
        
        # Update match
        old_status = match.status
        match.status = new_status
        match.notes = notes
        
        # Set timestamps based on status
        from datetime import datetime
        now = datetime.utcnow()
        
        if new_status == 'accepted' and old_status != 'accepted':
            match.confirmed_at = now
        elif new_status == 'completed' and old_status != 'completed':
            match.completed_at = now
        
        db.session.commit()
        
        return jsonify({"message": "Match status updated successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update match status"}), 500


def calculate_match_score(donor, request_obj):
    """
    Calculate match score based on various factors
    """
    score = 0
    
    # Blood group compatibility (100 points)
    if donor.blood_group == request_obj.blood_group:
        score += 100
    elif is_compatible_blood_group(donor.blood_group, request_obj.blood_group):
        score += 80
    
    # Availability (20 points)
    if donor.is_available:
        score += 20
    
    # Reliability score (up to 30 points)
    score += min(donor.reliability_score * 0.3, 30)
    
    # Location proximity (up to 20 points)
    if donor.city == request_obj.hospital.city:
        score += 20
    elif donor.district == request_obj.hospital.district:
        score += 10
    
    # Last donation date (up to 15 points)
    if donor.last_donation_date:
        from datetime import datetime, timedelta
        days_since_donation = (datetime.utcnow() - donor.last_donation_date).days
        if days_since_donation >= 90:  # Minimum 3 months
            score += 15
        elif days_since_donation >= 60:
            score += 10
        elif days_since_donation >= 30:
            score += 5
    
    return min(score, 100)  # Cap at 100


def is_compatible_blood_group(donor_group, required_group):
    """
    Check if donor blood group is compatible with required group
    """
    compatibility = {
        'O+': ['O+', 'A+', 'B+', 'AB+'],
        'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
        'A+': ['A+', 'AB+'],
        'A-': ['A+', 'A-', 'AB+', 'AB-'],
        'B+': ['B+', 'AB+'],
        'B-': ['B+', 'B-', 'AB+', 'AB-'],
        'AB+': ['AB+'],
        'AB-': ['AB+', 'AB-']
    }
    
    return required_group in compatibility.get(donor_group, [])


@admin_bp.route("/requests", methods=["GET"])
@jwt_required()
def get_all_requests():
    """
    Get All Donation Requests with search, filter, and pagination
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get query parameters
        search = request.args.get('search', '').strip()
        blood_group = request.args.get('blood_group', '')
        hospital_id = request.args.get('hospital_id', '')
        urgency = request.args.get('urgency', '')
        status = request.args.get('status', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Build query with joins
        query = db.session.query(Request, Hospital).join(
            Hospital, Request.hospital_id == Hospital.id
        )
        
        # Apply filters
        if search:
            search_filter = or_(
                Request.patient_name.ilike(f'%{search}%'),
                Hospital.name.ilike(f'%{search}%'),
                Request.contact_person.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        if blood_group:
            query = query.filter(Request.blood_group == blood_group)
        
        if hospital_id:
            query = query.filter(Request.hospital_id == hospital_id)
        
        if urgency:
            query = query.filter(Request.urgency == urgency)
        
        if status:
            query = query.filter(Request.status == status)
        
        # Get paginated results
        requests_pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        requests_data = []
        for request_obj, hospital in requests_pagination.items:
            # Count existing matches for this request
            match_count = Match.query.filter_by(request_id=request_obj.id).count()
            
            requests_data.append({
                "id": request_obj.id,
                "hospital_name": hospital.name,
                "hospital_city": hospital.city,
                "hospital_district": hospital.district,
                "patient_name": request_obj.patient_name,
                "blood_group": request_obj.blood_group,
                "units_required": request_obj.units_required,
                "urgency": request_obj.urgency,
                "status": request_obj.status,
                "description": request_obj.description,
                "contact_person": request_obj.contact_person,
                "contact_phone": request_obj.contact_phone,
                "required_by": request_obj.required_by.isoformat() if request_obj.required_by else None,
                "created_at": request_obj.created_at.isoformat() if request_obj.created_at else None,
                "updated_at": request_obj.updated_at.isoformat() if request_obj.updated_at else None,
                "match_count": match_count
            })
        
        return jsonify({
            "requests": requests_data,
            "total": requests_pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": requests_pagination.pages
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch requests"}), 500


@admin_bp.route("/requests/<int:request_id>", methods=["GET"])
@jwt_required()
def get_request_details(request_id):
    """
    Get detailed information about a specific request
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get request with hospital info
        request_obj = Request.query.get(request_id)
        if not request_obj:
            return jsonify({"error": "Request not found"}), 404
        
        hospital = Hospital.query.get(request_obj.hospital_id)
        
        # Get existing matches for this request
        matches = db.session.query(Match, Donor).join(
            Donor, Match.donor_id == Donor.id
        ).filter(Match.request_id == request_id).all()
        
        matches_data = []
        for match, donor in matches:
            matches_data.append({
                "id": match.id,
                "donor_name": donor.name,
                "donor_email": donor.email,
                "donor_phone": donor.phone,
                "donor_blood_group": donor.blood_group,
                "match_status": match.status,
                "matched_at": match.matched_at.isoformat() if match.matched_at else None,
                "confirmed_at": match.confirmed_at.isoformat() if match.confirmed_at else None
            })
        
        request_data = {
            "id": request_obj.id,
            "hospital_name": hospital.name,
            "hospital_city": hospital.city,
            "hospital_district": hospital.district,
            "hospital_address": hospital.address,
            "hospital_phone": hospital.phone,
            "patient_name": request_obj.patient_name,
            "blood_group": request_obj.blood_group,
            "units_required": request_obj.units_required,
            "urgency": request_obj.urgency,
            "status": request_obj.status,
            "description": request_obj.description,
            "contact_person": request_obj.contact_person,
            "contact_phone": request_obj.contact_phone,
            "required_by": request_obj.required_by.isoformat() if request_obj.required_by else None,
            "created_at": request_obj.created_at.isoformat() if request_obj.created_at else None,
            "updated_at": request_obj.updated_at.isoformat() if request_obj.updated_at else None,
            "matches": matches_data
        }
        
        return jsonify(request_data), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch request details"}), 500


@admin_bp.route("/requests/<int:request_id>/status", methods=["PUT"])
@jwt_required()
def update_request_status(request_id):
    """
    Update request status (cancel, close, etc.)
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get request
        request_obj = Request.query.get(request_id)
        if not request_obj:
            return jsonify({"error": "Request not found"}), 404
        
        data = request.get_json() or {}
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({"error": "Status is required"}), 400
        
        # Validate status
        valid_statuses = ['pending', 'in_progress', 'completed', 'cancelled', 'closed']
        if new_status not in valid_statuses:
            return jsonify({"error": "Invalid status"}), 400
        
        # Update request
        request_obj.status = new_status
        db.session.commit()
        
        return jsonify({"message": "Request status updated successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update request status"}), 500


@admin_bp.route("/requests/<int:request_id>/assign-donor", methods=["POST"])
@jwt_required()
def assign_donor_to_request(request_id):
    """
    Manually assign a donor to a request
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get request
        request_obj = Request.query.get(request_id)
        if not request_obj:
            return jsonify({"error": "Request not found"}), 404
        
        data = request.get_json() or {}
        donor_id = data.get('donor_id')
        
        if not donor_id:
            return jsonify({"error": "Donor ID is required"}), 400
        
        # Check if donor exists
        donor = Donor.query.get(donor_id)
        if not donor:
            return jsonify({"error": "Donor not found"}), 404
        
        # Check if match already exists
        existing_match = Match.query.filter_by(
            request_id=request_id,
            donor_id=donor_id
        ).first()
        
        if existing_match:
            return jsonify({"error": "Donor already assigned to this request"}), 409
        
        # Create new match
        match = Match(
            request_id=request_id,
            donor_id=donor_id,
            status='pending'
        )
        
        db.session.add(match)
        db.session.commit()
        
        return jsonify({
            "message": "Donor assigned successfully",
            "match_id": match.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to assign donor"}), 500


@admin_bp.route("/donation-history", methods=["GET"])
@jwt_required()
def get_donation_history():
    """
    Get All Donation History with search, filter, and pagination
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get query parameters
        search = request.args.get('search', '').strip()
        donor_name = request.args.get('donor_name', '').strip()
        hospital_name = request.args.get('hospital_name', '').strip()
        blood_group = request.args.get('blood_group', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        status = request.args.get('status', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Build query with joins
        query = db.session.query(DonationHistory, Donor, User, Hospital).join(
            Donor, DonationHistory.donor_id == Donor.id
        ).join(
            User, Donor.user_id == User.id
        ).join(
            Hospital, DonationHistory.hospital_id == Hospital.id
        )
        
        # Apply filters
        if search:
            search_filter = or_(
                User.first_name.ilike(f'%{search}%'),
                User.last_name.ilike(f'%{search}%'),
                Hospital.name.ilike(f'%{search}%'),
                User.phone.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        if donor_name:
            donor_filter = or_(
                User.first_name.ilike(f'%{donor_name}%'),
                User.last_name.ilike(f'%{donor_name}%')
            )
            query = query.filter(donor_filter)
        
        if hospital_name:
            query = query.filter(Hospital.name.ilike(f'%{hospital_name}%'))
        
        if blood_group:
            query = query.filter(Donor.blood_group == blood_group)
        
        if date_from:
            from datetime import datetime
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(DonationHistory.donation_date >= date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            from datetime import datetime
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
                # Add one day to include the entire day
                from datetime import timedelta
                date_to_obj = date_to_obj + timedelta(days=1)
                query = query.filter(DonationHistory.donation_date < date_to_obj)
            except ValueError:
                pass
        
        # Order by donation date (newest first)
        query = query.order_by(DonationHistory.donation_date.desc())
        
        # Get paginated results
        donations_pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        donations_data = []
        for donation, donor, user, hospital in donations_pagination.items:
            donations_data.append({
                "id": donation.id,
                "donor": {
                    "id": user.id,
                    "name": f"{user.first_name} {user.last_name or ''}".strip(),
                    "phone": user.phone,
                    "email": user.email,
                    "blood_group": donor.blood_group
                },
                "hospital": {
                    "id": hospital.id,
                    "name": hospital.name,
                    "address": hospital.address,
                    "phone": hospital.phone
                },
                "units": donation.units,
                "donation_date": donation.donation_date.isoformat() if donation.donation_date else None,
                "status": "completed",  # All donations in history are completed
                "request_id": donation.request_id
            })
        
        return jsonify({
            "donations": donations_data,
            "total": donations_pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": donations_pagination.pages
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch donation history"}), 500


@admin_bp.route("/donation-history/export", methods=["GET"])
@jwt_required()
def export_donation_history():
    """
    Export donation history to CSV
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get query parameters (same as get_donation_history)
        search = request.args.get('search', '').strip()
        donor_name = request.args.get('donor_name', '').strip()
        hospital_name = request.args.get('hospital_name', '').strip()
        blood_group = request.args.get('blood_group', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        
        # Build query with joins (same as get_donation_history)
        query = db.session.query(DonationHistory, Donor, User, Hospital).join(
            Donor, DonationHistory.donor_id == Donor.id
        ).join(
            User, Donor.user_id == User.id
        ).join(
            Hospital, DonationHistory.hospital_id == Hospital.id
        )
        
        # Apply filters (same as get_donation_history)
        if search:
            search_filter = or_(
                User.first_name.ilike(f'%{search}%'),
                User.last_name.ilike(f'%{search}%'),
                Hospital.name.ilike(f'%{search}%'),
                User.phone.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        if donor_name:
            donor_filter = or_(
                User.first_name.ilike(f'%{donor_name}%'),
                User.last_name.ilike(f'%{donor_name}%')
            )
            query = query.filter(donor_filter)
        
        if hospital_name:
            query = query.filter(Hospital.name.ilike(f'%{hospital_name}%'))
        
        if blood_group:
            query = query.filter(Donor.blood_group == blood_group)
        
        if date_from:
            from datetime import datetime
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(DonationHistory.donation_date >= date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            from datetime import datetime
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
                from datetime import timedelta
                date_to_obj = date_to_obj + timedelta(days=1)
                query = query.filter(DonationHistory.donation_date < date_to_obj)
            except ValueError:
                pass
        
        # Order by donation date (newest first)
        query = query.order_by(DonationHistory.donation_date.desc())
        
        # Get all results (no pagination for export)
        donations = query.all()
        
        # Create CSV content
        csv_content = "Donor Name,Donor Phone,Donor Email,Blood Group,Hospital Name,Hospital Address,Hospital Phone,Units,Donation Date,Request ID\n"
        
        for donation, donor, user, hospital in donations:
            donor_name = f"{user.first_name} {user.last_name or ''}".strip()
            donation_date = donation.donation_date.strftime('%Y-%m-%d %H:%M:%S') if donation.donation_date else ''
            
            csv_content += f'"{donor_name}","{user.phone}","{user.email}","{donor.blood_group}","{hospital.name}","{hospital.address}","{hospital.phone}","{donation.units}","{donation_date}","{donation.request_id}"\n'
        
        # Return CSV content
        from flask import Response
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=donation_history.csv'}
        )
        
    except Exception as e:
        return jsonify({"error": "Failed to export donation history"}), 500