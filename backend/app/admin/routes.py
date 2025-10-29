"""
Admin Routes
"""
from flask import Blueprint, request, jsonify, current_app
from app.models import User, Request, Donor, Hospital, Match, DonationHistory
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_
from datetime import datetime

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

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
    ---
    tags:
      - Admin
    summary: Get list of all donors with filters
    description: Retrieve paginated list of donors with search and filter capabilities
    security:
      - Bearer: []
    parameters:
      - in: query
        name: search
        type: string
        description: Search by name, email, or phone
      - in: query
        name: blood_group
        type: string
        description: Filter by blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)
      - in: query
        name: status
        type: string
        description: Filter by status (active, inactive, blocked, deleted)
      - in: query
        name: availability
        type: string
        description: Filter by availability (available, unavailable)
      - in: query
        name: page
        type: integer
        default: 1
      - in: query
        name: per_page
        type: integer
        default: 20
    responses:
      200:
        description: Donors retrieved successfully
      401:
        description: Unauthorized - Admin access required
      500:
        description: Server error
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({
                "error": "Unauthorized",
                "message": "Admin access required"
            }), 401
        
        # Get and validate query parameters
        search = request.args.get('search', '').strip()
        blood_group = request.args.get('blood_group', '').strip()
        status = request.args.get('status', '').strip()
        availability = request.args.get('availability', '').strip()
        
        try:
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 10))
            
            # Validate pagination parameters
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 10
        except ValueError:
            return jsonify({
                "error": "Invalid pagination parameters",
                "message": "Page and per_page must be valid integers"
            }), 400
        
        # Validate blood group if provided
        valid_blood_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        if blood_group and blood_group not in valid_blood_groups:
            return jsonify({
                "error": "Invalid blood group",
                "message": f"Blood group must be one of: {', '.join(valid_blood_groups)}"
            }), 400
        
        # Validate status if provided
        valid_statuses = ['active', 'inactive', 'blocked', 'deleted']
        if status and status not in valid_statuses:
            return jsonify({
                "error": "Invalid status",
                "message": f"Status must be one of: {', '.join(valid_statuses)}"
            }), 400
        
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
        
        # Get paginated results (type ignore for SQLAlchemy query methods)
        donors_pagination = query.paginate(  # type: ignore
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Build response data
        donors_data = []
        for user, donor in donors_pagination.items:
            try:
                donors_data.append({
                    "id": user.id,
                    "donor_id": donor.id,
                    "name": f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '') or ''}".strip() or 'Unknown',
                    "email": getattr(user, 'email', 'N/A'),
                    "phone": getattr(user, 'phone', 'N/A'),
                    "blood_group": getattr(donor, 'blood_group', 'N/A'),
                    "gender": getattr(donor, 'gender', 'N/A'),
                    "date_of_birth": donor.date_of_birth.isoformat() if getattr(donor, 'date_of_birth', None) else None,
                    "is_available": getattr(donor, 'is_available', False),
                    "last_donation_date": donor.last_donation_date.isoformat() if getattr(donor, 'last_donation_date', None) else None,
                    "reliability_score": getattr(donor, 'reliability_score', 0),
                    "status": getattr(user, 'status', 'active'),
                    "city": getattr(user, 'city', 'N/A'),
                    "district": getattr(user, 'district', 'N/A'),
                    "created_at": user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
                    "last_login": user.last_login.isoformat() if getattr(user, 'last_login', None) else None
                })
            except Exception as e:
                current_app.logger.warning(f'Error processing donor {user.id}: {str(e)}')
                continue
        
        # Return response with metadata
        response_data = {
            "donors": donors_data,
            "total": donors_pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": donors_pagination.pages,
            "has_next": donors_pagination.has_next,
            "has_prev": donors_pagination.has_prev
        }
        
        # Add message if no records found
        if donors_pagination.total == 0:
            response_data["message"] = "No records found"
        
        return jsonify(response_data), 200
        
    except Exception as e:
        current_app.logger.exception("Error fetching donors")
        return jsonify({
            "error": "Failed to fetch donors",
            "message": "An error occurred while retrieving donor data. Please try again.",
            "details": str(e) if current_app.debug else None
        }), 500


@admin_bp.route("/donors/<int:donor_id>", methods=["GET"])
@jwt_required()
def get_donor_by_id(donor_id):
    """
    Get Single Donor Details
    ---
    tags:
      - Admin
    summary: Get detailed information about a specific donor
    description: Retrieve complete donor profile including personal info, donation history, and statistics
    security:
      - Bearer: []
    parameters:
      - in: path
        name: donor_id
        type: integer
        required: true
        description: ID of the donor to retrieve
    responses:
      200:
        description: Donor details retrieved successfully
      404:
        description: Donor not found
      500:
        description: Server error
    """
    try:
        # Get donor with user information
        donor = Donor.query.filter_by(id=donor_id).first()
        
        if not donor:
            return jsonify({
                "success": False,
                "error": "Donor not found",
                "message": f"No donor found with ID {donor_id}"
            }), 404
        
        # Get user information
        user = User.query.get(donor.user_id)
        if not user:
            return jsonify({
                "success": False,
                "error": "User not found",
                "message": "Associated user not found"
            }), 404
        
        # Get donation history (safely)
        donation_history = []
        try:
            donation_history = DonationHistory.query.filter_by(
                donor_id=donor_id
            ).order_by(DonationHistory.donation_date.desc()).limit(10).all()
        except Exception as dh_error:
            print(f"Donation history error: {str(dh_error)}")
        
        # Get request history (matches) - safely
        request_history = []
        try:
            request_history = Match.query.filter_by(
                donor_id=donor_id
            ).order_by(Match.matched_at.desc()).limit(10).all()
        except Exception as rh_error:
            print(f"Request history error: {str(rh_error)}")
        
        # Calculate statistics safely
        total_donations = len(donation_history)
        total_requests = 0
        requests_accepted = 0
        requests_declined = 0
        
        try:
            total_requests = Match.query.filter_by(donor_id=donor_id).count()
            requests_accepted = Match.query.filter_by(donor_id=donor_id, status='accepted').count()
            requests_declined = Match.query.filter_by(donor_id=donor_id, status='declined').count()
        except Exception as stat_error:
            print(f"Statistics calculation error: {str(stat_error)}")
        
        # Calculate response rate
        response_rate = 0
        if total_requests > 0:
            responded = requests_accepted + requests_declined
            response_rate = round((responded / total_requests) * 100, 1)
        
        # Calculate completion rate
        completion_rate = 0
        if requests_accepted > 0:
            try:
                completed = Match.query.filter_by(donor_id=donor_id, status='completed').count()
                completion_rate = round((completed / requests_accepted) * 100, 1)
            except Exception as comp_error:
                print(f"Completion rate error: {str(comp_error)}")
        
        # Build donor data
        donor_data = {
            "donor_id": donor.id,
            "name": f"{user.first_name} {user.last_name}" if user.last_name else user.first_name,
            "email": user.email,
            "phone": user.phone,
            "blood_group": donor.blood_group,
            "gender": getattr(donor, 'gender', None),
            "date_of_birth": donor.date_of_birth.isoformat() if donor.date_of_birth else None,
            "city": getattr(user, 'city', None),
            "district": getattr(user, 'district', None),
            "state": getattr(user, 'state', None),
            "pin_code": getattr(user, 'pincode', None),
            "address": getattr(user, 'address', None),
            "is_available": donor.is_available,
            "last_donation_date": donor.last_donation_date.isoformat() if donor.last_donation_date else None,
            "next_eligible_date": donor.next_eligible_date.isoformat() if hasattr(donor, 'next_eligible_date') and donor.next_eligible_date else None,
            "reliability_score": float(donor.reliability_score) if donor.reliability_score else 0.0,
            "status": user.status,
            "email_verified": getattr(user, 'is_email_verified', False),
            "phone_verified": getattr(user, 'is_phone_verified', False),
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if hasattr(user, 'last_login') and user.last_login else None,
            "deleted_at": user.deleted_at.isoformat() if hasattr(user, 'deleted_at') and user.deleted_at else None,
            "is_deleted": user.status == 'deleted',
            
            # Additional fields
            "weight": donor.weight if hasattr(donor, 'weight') else None,
            "height": donor.height if hasattr(donor, 'height') else None,
            "medical_conditions": donor.medical_conditions if hasattr(donor, 'medical_conditions') else None,
            "allergies": donor.allergies if hasattr(donor, 'allergies') else None,
            "medications": donor.medications if hasattr(donor, 'medications') else None,
            "medical_notes": donor.medical_notes if hasattr(donor, 'medical_notes') else None,
            "whatsapp_number": donor.whatsapp_number if hasattr(donor, 'whatsapp_number') else user.phone,
            "email_notifications": donor.email_notifications if hasattr(donor, 'email_notifications') else True,
            "sms_notifications": donor.sms_notifications if hasattr(donor, 'sms_notifications') else True,
            
            # Statistics
            "total_donations": total_donations,
            "total_requests": total_requests,
            "requests_accepted": requests_accepted,
            "requests_declined": requests_declined,
            "response_rate": response_rate,
            "completion_rate": completion_rate,
            
            # History
            "donation_history": [
                {
                    "date": history.donation_date.isoformat() if history.donation_date else None,
                    "location": history.location if hasattr(history, 'location') else "N/A",
                    "units": history.units if hasattr(history, 'units') else 1,
                    "status": history.status if hasattr(history, 'status') else "completed"
                }
                for history in donation_history
            ],
            "request_history": []
        }
        
        # Build request history safely
        for match in request_history:
            try:
                hospital_name = "N/A"
                blood_group = None
                
                if hasattr(match, 'request') and match.request:
                    blood_group = getattr(match.request, 'blood_group', None)
                    if hasattr(match.request, 'hospital') and match.request.hospital:
                        hospital_name = match.request.hospital.name
                
                donor_data["request_history"].append({
                    "date": match.matched_at.isoformat() if hasattr(match, 'matched_at') and match.matched_at else None,
                    "hospital": hospital_name,
                    "response": getattr(match, 'status', 'N/A'),
                    "blood_group": blood_group
                })
            except Exception as rh_build_error:
                print(f"Error building request history item: {str(rh_build_error)}")
                continue
        
        return jsonify({
            "success": True,
            "data": donor_data,
            "message": "Donor details retrieved successfully"
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching donor details: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": "Failed to fetch donor details",
            "message": str(e)
        }), 500


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
            return jsonify({
                "error": "Unauthorized",
                "message": "Admin access required"
            }), 401
        
        # Get donor and user
        donor = Donor.query.get(donor_id)
        if not donor:
            return jsonify({
                "error": "Donor not found",
                "message": f"No donor found with ID {donor_id}"
            }), 404
        
        user = User.query.get(donor.user_id)
        if not user:
            return jsonify({
                "error": "User not found",
                "message": "Associated user account not found"
            }), 404
        
        data = request.get_json() or {}
        
        if not data:
            return jsonify({
                "error": "No data provided",
                "message": "Request body cannot be empty"
            }), 400
        
        # Update user fields (only if value is provided and not empty)
        if 'first_name' in data and data['first_name']:
            user.first_name = data['first_name']
        if 'last_name' in data and data['last_name']:
            user.last_name = data['last_name']
        if 'email' in data and data['email']:
            user.email = data['email']
        if 'phone' in data and data['phone']:
            user.phone = data['phone']
        if 'city' in data and data['city']:
            user.city = data['city']
        if 'district' in data and data['district']:
            user.district = data['district']
        if 'address' in data:
            # Allow empty address (user might want to clear it)
            user.address = data['address'] if data['address'] else None
        if 'status' in data and data['status']:
            user.status = data['status']
        
        # Update donor fields (only if value is provided and not empty)
        if 'blood_group' in data and data['blood_group']:
            donor.blood_group = data['blood_group']
        if 'gender' in data and data['gender']:
            donor.gender = data['gender']
        if 'date_of_birth' in data and data['date_of_birth']:
            donor.date_of_birth = data['date_of_birth']
        if 'is_available' in data:
            # Boolean field - always update if present
            donor.is_available = data['is_available']
        if 'reliability_score' in data:
            # Numeric field - always update if present (can be 0)
            donor.reliability_score = data['reliability_score']
        if 'last_donation_date' in data:
            from datetime import datetime
            if data['last_donation_date']:
                donor.last_donation_date = datetime.fromisoformat(data['last_donation_date'].replace('Z', '+00:00'))
            else:
                donor.last_donation_date = None
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Donor updated successfully",
            "donor_id": donor_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error updating donor: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to update donor",
            "message": "An error occurred while updating donor information"
        }), 500


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
            return jsonify({
                "error": "Unauthorized",
                "message": "Admin access required"
            }), 401
        
        # Get donor and user
        donor = Donor.query.get(donor_id)
        if not donor:
            return jsonify({
                "error": "Donor not found",
                "message": f"No donor found with ID {donor_id}"
            }), 404
        
        user = User.query.get(donor.user_id)
        if not user:
            return jsonify({
                "error": "User not found",
                "message": "Associated user account not found"
            }), 404
        
        # Check if already deleted
        if user.status == 'deleted' and user.deleted_at:
            return jsonify({
                "error": "Already deleted",
                "message": "This donor has already been deleted"
            }), 400
        
        # Soft delete by setting status to 'deleted' and recording timestamp
        user.status = 'deleted'
        user.deleted_at = datetime.utcnow()
        user.deleted_by = current_user_id
        
        # Also mark donor as unavailable
        donor.is_available = False
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Donor deleted successfully. The user account has been permanently deactivated.",
            "donor_id": donor_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error deleting donor: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to delete donor",
            "message": "An error occurred while deleting the donor"
        }), 500


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
            return jsonify({
                "error": "Unauthorized",
                "message": "Admin access required"
            }), 401
        
        # Get donor and user
        donor = Donor.query.get(donor_id)
        if not donor:
            return jsonify({
                "error": "Donor not found",
                "message": f"No donor found with ID {donor_id}"
            }), 404
        
        user = User.query.get(donor.user_id)
        if not user:
            return jsonify({
                "error": "User not found",
                "message": "Associated user account not found"
            }), 404
        
        data = request.get_json() or {}
        action = data.get('action', 'block')  # 'block' or 'unblock'
        
        if action not in ['block', 'unblock']:
            return jsonify({
                "error": "Invalid action",
                "message": "Action must be either 'block' or 'unblock'"
            }), 400
        
        if action == 'block':
            user.status = 'blocked'
            message = "Donor blocked successfully"
        else:
            user.status = 'active'
            message = "Donor unblocked successfully"
        
        db.session.commit()
        
        return jsonify({
            "message": message,
            "donor_id": donor_id,
            "status": user.status
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error updating donor status: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to update donor status",
            "message": "An error occurred while updating donor status"
        }), 500


@admin_bp.route("/donors/<int:donor_id>/toggle-status", methods=["POST"])
@jwt_required()
def toggle_donor_status(donor_id):
    """
    Toggle Donor Status (Active/Blocked)
    ---
    tags:
      - Admin
    summary: Toggle donor status between active and blocked
    description: Switch donor status from active to blocked or vice versa
    security:
      - Bearer: []
    parameters:
      - in: path
        name: donor_id
        type: integer
        required: true
        description: ID of the donor
    responses:
      200:
        description: Status toggled successfully
      404:
        description: Donor not found
      500:
        description: Server error
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 401
        
        # Get donor
        donor = Donor.query.filter_by(id=donor_id).first()
        
        if not donor:
            return jsonify({
                "success": False,
                "error": "Donor not found"
            }), 404
        
        # Get user
        user = User.query.get(donor.user_id)
        if not user:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        # Toggle status
        if user.status == 'blocked':
            user.status = 'active'
            new_status = 'active'
            message = "Donor unblocked successfully. They can now access the system."
        else:
            user.status = 'blocked'
            new_status = 'blocked'
            message = "Donor blocked successfully. They have been logged out and cannot access the system."
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": message,
            "data": {
                "donor_id": donor_id,
                "status": new_status
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error toggling donor status: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to toggle donor status",
            "message": str(e)
        }), 500


@admin_bp.route("/donors/stats", methods=["GET"])
@jwt_required()
def get_donor_stats():
    """
    Get donor statistics (total, available, active, blocked)
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({
                "error": "Unauthorized",
                "message": "Admin access required"
            }), 401
        
        # Get total donors count
        total_donors = db.session.query(User, Donor).join(Donor, User.id == Donor.user_id).count()
        
        # Get available donors count
        available_donors = db.session.query(User, Donor).join(
            Donor, User.id == Donor.user_id
        ).filter(Donor.is_available == True).count()
        
        # Get active donors count
        active_donors = db.session.query(User, Donor).join(
            Donor, User.id == Donor.user_id
        ).filter(User.status == 'active').count()
        
        # Get blocked donors count
        blocked_donors = db.session.query(User, Donor).join(
            Donor, User.id == Donor.user_id
        ).filter(User.status == 'blocked').count()
        
        return jsonify({
            "total": total_donors,
            "available": available_donors,
            "active": active_donors,
            "blocked": blocked_donors
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching donor stats: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to fetch donor statistics",
            "message": "An error occurred while retrieving statistics"
        }), 500


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


@admin_bp.route("/hospitals/<int:hospital_id>", methods=["GET"])
@jwt_required()
def get_hospital_by_id(hospital_id):
    """
    Get single hospital by ID
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
        
        # Get staff status
        staff_status = hospital.get_staff_status()
        
        hospital_data = {
            "id": hospital.id,
            "name": hospital.name,
            "email": hospital.email,
            "phone": hospital.phone,
            "address": hospital.address,
            "district": hospital.district,
            "city": hospital.city,
            "state": hospital.state,
            "pincode": hospital.pincode,
            "license_number": hospital.license_number,
            "is_verified": hospital.is_verified,
            "is_active": hospital.is_active,
            "featured": hospital.featured,
            "next_camp_date": hospital.next_camp_date.isoformat() if hospital.next_camp_date else None,
            "image_url": hospital.image_url,
            "created_at": hospital.created_at.isoformat() if hospital.created_at else None,
            "updated_at": hospital.updated_at.isoformat() if hospital.updated_at else None,
            "staff_status": staff_status
        }
        
        # Add staff details if exists
        if staff_status["has_staff"] and staff_status["user_exists"]:
            staff_user = hospital.staff_relation.user
            hospital_data["staff"] = {
                "id": staff_user.id,
                "hospital_staff_id": hospital.staff_relation.id,
                "first_name": staff_user.first_name,
                "last_name": staff_user.last_name,
                "email": staff_user.email,
                "phone": staff_user.phone,
                "status": staff_user.status,
                "staff_status": hospital.staff_relation.status
            }
        
        return jsonify({"hospital": hospital_data}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch hospital"}), 500


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
        
        # Create new hospital (SQLAlchemy dynamic model initialization)
        hospital = Hospital(  # type: ignore
            name=data['name'],  # type: ignore
            email=data['email'],  # type: ignore
            phone=data['phone'],  # type: ignore
            address=data['address'],  # type: ignore
            district=data['district'],  # type: ignore
            city=data['city'],  # type: ignore
            state=data.get('state'),  # type: ignore
            pincode=data.get('pincode'),  # type: ignore
            license_number=data.get('license_number', ''),  # type: ignore
            is_verified=data.get('is_verified', False)  # type: ignore
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
        if 'state' in data:
            hospital.state = data['state']
        if 'pincode' in data:
            hospital.pincode = data['pincode']
        if 'license_number' in data:
            hospital.license_number = data['license_number']
        if 'is_verified' in data:
            hospital.is_verified = data['is_verified']
        if 'is_active' in data:
            hospital.is_active = data['is_active']
        if 'featured' in data:
            hospital.featured = data['featured']
        if 'next_camp_date' in data:
            from datetime import datetime
            if data['next_camp_date'] and data['next_camp_date'].strip():
                try:
                    # Handle different date formats
                    date_str = data['next_camp_date'].split('T')[0]  # Get YYYY-MM-DD part
                    hospital.next_camp_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except Exception as date_error:
                    print(f"WARNING: Date parsing error: {str(date_error)}")
                    hospital.next_camp_date = None
            else:
                hospital.next_camp_date = None
        if 'image_url' in data:
            hospital.image_url = data['image_url']
        
        db.session.commit()
        
        return jsonify({"message": "Hospital updated successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Error updating hospital: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e) or "Failed to update hospital"}), 500


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


@admin_bp.route("/hospitals/<int:hospital_id>/staff", methods=["GET"])
@jwt_required()
def get_hospital_staff(hospital_id):
    """
    Get all staff members assigned to a hospital with their HospitalStaff status
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
        
        # Get staff members through HospitalStaff relationship
        from app.models import HospitalStaff
        hospital_staff_records = HospitalStaff.query.filter_by(hospital_id=hospital_id).all()
        
        staff_data = []
        active_staff = None
        old_staff = []
        
        for hs_record in hospital_staff_records:
            user = hs_record.user
            if user:
                # Determine if this is the active staff or old staff
                is_active_staff = (user.status == "active" and hs_record.status == "active")
                
                staff_info = {
                    "id": user.id,
                    "hospital_staff_id": hs_record.id,
                    "name": f"{user.first_name} {user.last_name or ''}".strip(),
                    "first_name": user.first_name,
                    "last_name": user.last_name or '',
                    "email": user.email or 'N/A',
                    "phone": user.phone,
                    "user_status": user.status,  # active, inactive, blocked, deleted
                    "staff_status": hs_record.status,  # pending, active, rejected, blocked, deleted
                    "is_active_staff": is_active_staff,  # True for current active staff, False for old staff
                    "invited_by": hs_record.invited_by,
                    "created_at": hs_record.created_at.isoformat() if hs_record.created_at else None,
                    "last_login": user.last_login.isoformat() if user.last_login else None
                }
                
                staff_data.append(staff_info)
                
                # Separate active staff from old staff
                if is_active_staff:
                    active_staff = staff_info
                else:
                    old_staff.append(staff_info)
        
        return jsonify({
            "staff": staff_data,
            "active_staff": active_staff,  # Current active staff (only one)
            "old_staff": old_staff,  # Previous staff (blocked/deleted)
            "total": len(staff_data)
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch hospital staff"}), 500


@admin_bp.route("/hospitals/<int:hospital_id>/staff/<int:staff_id>/block", methods=["PUT"])
@jwt_required()
def block_hospital_staff(hospital_id, staff_id):
    """
    Block or unblock a hospital staff member
    When blocked: Hospital is automatically unverified (no active staff)
    When unblocked: Hospital is automatically verified (has active staff)
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
        
        # Get staff user through HospitalStaff
        from app.models import HospitalStaff
        hs_record = HospitalStaff.query.filter_by(hospital_id=hospital_id, user_id=staff_id).first()
        if not hs_record or not hs_record.user:
            return jsonify({"error": "Staff member not found"}), 404
        
        user = hs_record.user
        
        # Toggle user status
        if user.status == "blocked":
            # Unblocking staff
            user.status = "active"
            hs_record.status = "active"
            hospital.is_verified = True  # Auto-verify hospital when staff is unblocked
            message = "Staff member unblocked successfully. Hospital is now verified."
            print(f"SUCCESS: Staff {user.email} unblocked - Hospital {hospital.name} verified")
        else:
            # Blocking staff
            user.status = "blocked"
            hs_record.status = "blocked"
            hospital.is_verified = False  # Auto-unverify hospital when staff is blocked
            message = "Staff member blocked successfully. Hospital is now unverified."
            print(f"INFO: Staff {user.email} blocked - Hospital {hospital.name} unverified")
        
        db.session.commit()
        
        return jsonify({
            "message": message,
            "user_status": user.status,
            "hospital_verified": hospital.is_verified
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Error blocking/unblocking staff: {str(e)}")
        return jsonify({"error": "Failed to update staff status"}), 500


@admin_bp.route("/hospitals/<int:hospital_id>/staff/<int:staff_id>", methods=["DELETE"])
@jwt_required()
def delete_hospital_staff(hospital_id, staff_id):
    """
    Soft delete a hospital staff member
    - Marks user as deleted (permanently restricted from system)
    - Marks HospitalStaff record as deleted
    - Auto-unverifies hospital (no active staff)
    - Staff cannot login anymore
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
        
        # Get HospitalStaff record
        from app.models import HospitalStaff
        hs_record = HospitalStaff.query.filter_by(hospital_id=hospital_id, user_id=staff_id).first()
        if not hs_record:
            return jsonify({"error": "Staff member not found"}), 404
        
        user = hs_record.user
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if already deleted
        if user.status == "deleted":
            return jsonify({"error": "Staff member is already deleted"}), 400
        
        # Soft delete: Mark user and staff record as deleted
        user.status = "deleted"
        hs_record.status = "deleted"
        
        # Auto-unverify hospital (no active staff)
        hospital.is_verified = False
        
        db.session.commit()
        
        print(f"INFO: Staff {user.email} permanently deleted")
        print(f"INFO: Hospital {hospital.name} unverified (no active staff)")
        
        return jsonify({
            "message": "Staff member deleted successfully. Hospital is now unverified.",
            "staff_name": f"{user.first_name} {user.last_name or ''}".strip(),
            "staff_email": user.email,
            "hospital_verified": False,
            "note": "Staff member is permanently restricted from the system and cannot login."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Error deleting staff: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e) or "Failed to delete staff member"}), 500


@admin_bp.route("/hospitals/<int:hospital_id>/staff/assign", methods=["POST"])
@jwt_required()
def assign_hospital_staff(hospital_id):
    """
    Assign a new staff member to a hospital (creates User and HospitalStaff records)
    If hospital already has staff, marks old staff as deleted and assigns new staff
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
        
        # Create new staff member
        required_fields = ['first_name', 'phone', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        from app.models import HospitalStaff
        
        # Check if hospital already has staff - if yes, mark as deleted
        existing_staff = HospitalStaff.query.filter_by(hospital_id=hospital_id).first()
        old_staff_info = None
        if existing_staff:
            old_user = existing_staff.user
            if old_user:
                old_staff_info = {
                    "id": old_user.id,
                    "name": f"{old_user.first_name} {old_user.last_name}".strip(),
                    "email": old_user.email
                }
                # Mark old staff as deleted
                old_user.status = "deleted"
                existing_staff.status = "deleted"
                print(f"INFO: Marking old staff {old_user.email} as deleted")
        
        # Check if phone already exists (excluding deleted users)
        existing_user = User.query.filter_by(phone=data['phone']).first()
        if existing_user and existing_user.status != 'deleted':
            return jsonify({"error": "Phone number already registered"}), 400
        
        # Check if email exists (if provided, excluding deleted users)
        if data.get('email'):
            existing_email = User.query.filter_by(email=data['email']).first()
            if existing_email and existing_email.status != 'deleted':
                return jsonify({"error": "Email already registered"}), 400
        
        # Create new staff user (SQLAlchemy dynamic model initialization)
        new_user = User(  # type: ignore
            first_name=data['first_name'],  # type: ignore
            last_name=data.get('last_name', ''),  # type: ignore
            email=data.get('email'),  # type: ignore
            phone=data['phone'],  # type: ignore
            role="staff",  # type: ignore
            status="inactive",  # type: ignore # Staff remains inactive until they accept invitation
            is_phone_verified=True,  # type: ignore
            is_email_verified=True,  # type: ignore
            password_needs_change=True  # type: ignore # Force password change on first login
        )
        new_user.set_password(data['password'])

        db.session.add(new_user)
        db.session.flush()  # Get the user ID

        # Create HospitalStaff relationship (SQLAlchemy dynamic model)
        hospital_staff = HospitalStaff(  # type: ignore
            user_id=new_user.id,  # type: ignore
            hospital_id=hospital_id,  # type: ignore
            invited_by=current_user_id,  # type: ignore
            status="pending"  # type: ignore # Waiting for staff to accept invitation
        )
        
        db.session.add(hospital_staff)

        # Don't auto-verify hospital yet - wait for staff to accept invitation
        # Hospital will be verified when staff accepts the invitation

        db.session.commit()

        # Send invitation email
        try:
            from app.utils.email_sender import send_email
            from app.utils.email_templates import get_staff_invitation_email

            staff_name = f"{new_user.first_name} {new_user.last_name}".strip()
            accept_url = f"{request.host_url}api/staff/accept-invitation/{new_user.id}"
            reject_url = f"{request.host_url}api/staff/reject-invitation/{new_user.id}"

            # Note: This function signature may need email and temp_password parameters
            invitation_email = get_staff_invitation_email(
                staff_name=staff_name,
                hospital_name=hospital.name,
                email=new_user.email,
                temp_password=data.get('password', ''),
                accept_url=accept_url,
                reject_url=reject_url
            )

            send_email(
                to_email=new_user.email,
                subject=f"Invitation to Join {hospital.name} - Smart Blood Connect",
                html_content=invitation_email
            )
            print(f"SUCCESS: Invitation email sent to {new_user.email}")
        except Exception as e:
            print(f"WARNING: Failed to send invitation email: {str(e)}")

        message = "New staff member invited successfully. Invitation email has been sent. Staff will be active once they accept the invitation."
        if old_staff_info:
            message = f"Staff reassigned successfully. Previous staff ({old_staff_info['name']}) marked as deleted. New invitation email has been sent."

        print(f"SUCCESS: New staff {new_user.email} invited to {hospital.name}")
        print(f"SUCCESS: Invitation pending acceptance from staff")

        return jsonify({
            "message": message,
            "old_staff": old_staff_info,
            "new_staff": {
                "id": new_user.id,
                "name": f"{new_user.first_name} {new_user.last_name or ''}".strip(),
                "email": new_user.email or 'N/A',
                "phone": new_user.phone,
                "status": "pending"
            },
            "hospital_verified": hospital.is_verified,
            "hospital_active": hospital.is_active,
            "invitation_status": "pending"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Error assigning staff: {str(e)}")
        return jsonify({"error": str(e) or "Failed to assign staff member"}), 500


@admin_bp.route("/hospitals/<int:hospital_id>/staff/<int:staff_id>", methods=["PUT"])
@jwt_required()
def update_hospital_staff(hospital_id, staff_id):
    """
    Update hospital staff user details (first_name, last_name, email, phone)
    If email or phone changes, generates new password and sends notification email
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
        
        # Get staff user
        staff_user = User.query.get(staff_id)
        if not staff_user or staff_user.role != 'staff':
            return jsonify({"error": "Staff user not found"}), 404
        
        # Verify staff is assigned to this hospital
        from app.models import HospitalStaff
        hs_record = HospitalStaff.query.filter_by(hospital_id=hospital_id, user_id=staff_id).first()
        if not hs_record:
            return jsonify({"error": "Staff member not assigned to this hospital"}), 404
        
        data = request.get_json() or {}
        
        # Track if email or phone changed
        email_changed = 'email' in data and data['email'] != staff_user.email
        phone_changed = 'phone' in data and data['phone'] != staff_user.phone
        credentials_changed = email_changed or phone_changed
        
        # Check if email is being changed and if it already exists
        if email_changed:
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != staff_user.id:
                # Check if it's a deleted user - allow reuse
                if existing_user.status != 'deleted':
                    return jsonify({"error": "Email already exists"}), 409
        
        # Store old email for notification
        old_email = staff_user.email
        
        # Update user fields
        if 'first_name' in data:
            staff_user.first_name = data['first_name']
        if 'last_name' in data:
            staff_user.last_name = data['last_name']
        if 'email' in data:
            staff_user.email = data['email']
        if 'phone' in data:
            staff_user.phone = data['phone']
        
        # Generate new password if email or phone changed
        new_password = None
        if credentials_changed:
            from app.utils.password_generator import generate_password
            new_password = generate_password()
            staff_user.set_password(new_password)
            staff_user.status = 'inactive'  # Require re-activation
            hs_record.status = 'pending'
        
        db.session.commit()
        
        # Send email notification if credentials changed
        email_sent = False
        if credentials_changed and new_password:
            try:
                from app.utils.email_sender import send_email
                from app.utils.email_templates import get_staff_invitation_email
                
                staff_name = f"{staff_user.first_name} {staff_user.last_name}".strip()
                accept_url = f"{request.host_url}api/staff/accept-invitation/{staff_user.id}"
                reject_url = f"{request.host_url}api/staff/reject-invitation/{staff_user.id}"
                
                email_html = get_staff_invitation_email(
                    staff_name=staff_name,
                    hospital_name=hospital.name,
                    email=staff_user.email,
                    temp_password=new_password,
                    accept_url=accept_url,
                    reject_url=reject_url
                )
                
                send_email(
                    to_email=staff_user.email,
                    subject=f"Updated Credentials - {hospital.name}",
                    html_content=email_html
                )
                email_sent = True
                print(f"SUCCESS: Credentials update email sent to {staff_user.email}")
            except Exception as email_error:
                print(f"WARNING: Failed to send email: {str(email_error)}")
        
        return jsonify({
            "message": "Staff details updated successfully",
            "credentials_changed": credentials_changed,
            "email_sent": email_sent,
            "staff": {
                "id": staff_user.id,
                "first_name": staff_user.first_name,
                "last_name": staff_user.last_name,
                "email": staff_user.email,
                "phone": staff_user.phone,
                "status": staff_user.status
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Error updating staff: {str(e)}")
        return jsonify({"error": str(e) or "Failed to update staff details"}), 500


@admin_bp.route("/hospitals/<int:hospital_id>/staff/<int:staff_id>/status", methods=["PUT"])
@jwt_required()
def update_staff_status(hospital_id, staff_id):
    """
    Update hospital staff status (pending/active/rejected)
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        data = request.get_json() or {}
        new_status = data.get('staff_status')
        
        if new_status not in ['pending', 'active', 'rejected']:
            return jsonify({"error": "Invalid status. Must be pending, active, or rejected"}), 400
        
        # Get HospitalStaff record
        from app.models import HospitalStaff
        hs_record = HospitalStaff.query.filter_by(hospital_id=hospital_id, user_id=staff_id).first()
        if not hs_record:
            return jsonify({"error": "Staff member not found"}), 404

        # Update hospital staff record
        hs_record.status = new_status

        # Also update the associated user status and hospital verification
        user = User.query.get(staff_id)
        hospital = Hospital.query.get(hospital_id)

        if user:
            if new_status == 'active':
                user.status = 'active'
            else:
                # pending or rejected -> keep user inactive
                user.status = 'inactive'

        if hospital:
            # Since each hospital has at most one staff, we can derive verification from this staff record
            hospital.is_verified = True if new_status == 'active' else False

        db.session.commit()

        return jsonify({
            "message": f"Staff status updated to {new_status}",
            "staff_status": new_status,
            "hospital_verified": hospital.is_verified if hospital else None
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update staff status"}), 500


@admin_bp.route("/hospitals/create-with-staff", methods=["POST"])
@jwt_required()
def create_hospital_with_staff():
    """
    Create a new hospital with staff members and send invitation emails
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        data = request.get_json() or {}
        hospital_data = data.get('hospital', {})
        staff_data = data.get('staff', {})
        
        print(f"INFO: Received data:")
        print(f"   Hospital data: {hospital_data}")
        print(f"   Staff data: {staff_data}")
        
        if not hospital_data or not staff_data:
            error_msg = "Hospital and staff data are required"
            print(f"ERROR: Validation error: {error_msg}")
            return jsonify({"error": error_msg}), 400
        
        # Validate required hospital fields
        required_hospital_fields = ['name', 'email', 'phone', 'address', 'city', 'district']
        for field in required_hospital_fields:
            if not hospital_data.get(field) or not str(hospital_data.get(field)).strip():
                error_msg = f"Hospital {field} is required"
                print(f"ERROR: Validation error: {error_msg}")
                print(f"   Missing field: {field}")
                print(f"   Hospital data keys: {list(hospital_data.keys())}")
                return jsonify({
                    "error": error_msg,
                    "field": f"hospital_{field}"
                }), 400
        
        # Check if hospital email already exists
        existing_hospital_email = Hospital.query.filter_by(email=hospital_data['email']).first()
        if existing_hospital_email:
            return jsonify({
                "error": "A hospital with this email address is already registered",
                "field": "hospital_email"
            }), 409
        
        # Check if hospital phone already exists
        existing_hospital_phone = Hospital.query.filter_by(phone=hospital_data['phone']).first()
        if existing_hospital_phone:
            return jsonify({
                "error": "A hospital with this phone number is already registered",
                "field": "hospital_phone"
            }), 409
        
        # Check if license number already exists (if provided)
        if hospital_data.get('license_number') and hospital_data['license_number'].strip():
            existing_license = Hospital.query.filter_by(license_number=hospital_data['license_number']).first()
            if existing_license:
                return jsonify({
                    "error": "A hospital with this license number is already registered",
                    "field": "hospital_license_number"
                }), 409
        
        from app.models import HospitalStaff
        from app.utils.password_generator import generate_password
        from app.utils.email_sender import send_email
        from app.utils.email_templates import get_staff_invitation_email
        
        # Validate staff data FIRST (single staff member)
        required_staff_fields = ['first_name', 'email', 'phone']
        for field in required_staff_fields:
            if not staff_data.get(field) or not str(staff_data.get(field)).strip():
                error_msg = f"Staff {field.replace('_', ' ')} is required"
                print(f"ERROR: Staff validation error: {error_msg}")
                print(f"   Staff data: {staff_data}")
                return jsonify({
                    "error": error_msg,
                    "field": f"staff_{field}"
                }), 400
        
        # Check if staff email already exists
        existing_user_email = User.query.filter_by(email=staff_data['email']).first()
        if existing_user_email:
            return jsonify({
                "error": "A user with this email address is already registered",
                "field": "staff_email"
            }), 409
        
        # Check if staff phone already exists
        existing_user_phone = User.query.filter_by(phone=staff_data['phone']).first()
        if existing_user_phone:
            return jsonify({
                "error": "A user with this phone number is already registered",
                "field": "staff_phone"
            }), 409
        
        # All validations passed, now create hospital (SQLAlchemy dynamic model)
        new_hospital = Hospital(  # type: ignore
            name=hospital_data['name'],  # type: ignore
            email=hospital_data['email'],  # type: ignore
            phone=hospital_data['phone'],  # type: ignore
            address=hospital_data['address'],  # type: ignore
            city=hospital_data['city'],  # type: ignore
            district=hospital_data['district'],  # type: ignore
            state=hospital_data.get('state'),  # type: ignore
            pincode=hospital_data.get('pincode'),  # type: ignore
            license_number=hospital_data.get('license_number'),  # type: ignore
            is_verified=False,  # type: ignore
            is_active=True  # type: ignore
        )
        
        db.session.add(new_hospital)
        db.session.flush()  # Get hospital ID
        
        # Generate password
        temp_password = generate_password()
        
        # Create user (SQLAlchemy dynamic model)
        new_user = User(  # type: ignore
            first_name=staff_data['first_name'],  # type: ignore
            last_name=staff_data.get('last_name', ''),  # type: ignore
            email=staff_data['email'],  # type: ignore
            phone=staff_data['phone'],  # type: ignore
            role="staff",  # type: ignore
            status="inactive",  # type: ignore # Will be active after accepting invitation
            is_phone_verified=True,  # type: ignore
            is_email_verified=True,  # type: ignore
            password_needs_change=True  # type: ignore # Force password change on first login
        )
        new_user.set_password(temp_password)
        
        db.session.add(new_user)
        db.session.flush()  # Get user ID
        
        # Create HospitalStaff relationship (one staff per hospital, SQLAlchemy dynamic model)
        hospital_staff = HospitalStaff(  # type: ignore
            user_id=new_user.id,  # type: ignore
            hospital_id=new_hospital.id,  # type: ignore
            invited_by=current_user_id,  # type: ignore
            status="pending"  # type: ignore # Waiting for acceptance
        )
        
        db.session.add(hospital_staff)
        
        # Prepare email data
        staff_name = f"{new_user.first_name} {new_user.last_name}".strip()
        accept_url = f"{request.host_url}api/staff/accept-invitation/{new_user.id}"
        reject_url = f"{request.host_url}api/staff/reject-invitation/{new_user.id}"
        
        # Commit first, then send email asynchronously
        db.session.commit()
        
        # Send invitation email in background (don't block response)
        email_sent = False
        email_error = None
        
        try:
            print(f"\n{'='*60}")
            print(f"📧 SENDING STAFF INVITATION EMAIL")
            print(f"{'='*60}")
            print(f"Hospital: {new_hospital.name}")
            print(f"Staff: {staff_name}")
            print(f"Email: {new_user.email}")
            print(f"{'='*60}\n")
            
            email_html = get_staff_invitation_email(
                staff_name=staff_name,
                hospital_name=new_hospital.name,
                email=new_user.email,
                temp_password=temp_password,
                accept_url=accept_url,
                reject_url=reject_url
            )
            
            # Send email (this may take time, but we've already committed)
            send_email(
                to_email=new_user.email,
                subject=f"Staff Invitation - {new_hospital.name}",
                html_content=email_html
            )
            
            email_sent = True
            print(f"\n{'='*60}")
            print(f"SUCCESS: INVITATION EMAIL SENT SUCCESSFULLY")
            print(f"{'='*60}\n")
            
        except Exception as e:
            email_error = str(e)
            print(f"\n{'='*60}")
            print(f"WARNING: EMAIL SENDING FAILED")
            print(f"{'='*60}")
            print(f"Error: {email_error}")
            print(f"{'='*60}\n")
            # Don't fail the request if email fails - hospital is already created
        
        # Prepare response message
        if email_sent:
            message = f"Hospital created successfully! Invitation email sent to {new_user.email}"
        else:
            message = f"Hospital created successfully, but email failed to send. Error: {email_error}"
        
        return jsonify({
            "message": message,
            "email_sent": email_sent,
            "email_error": email_error,
            "hospital": {
                "id": new_hospital.id,
                "name": new_hospital.name,
                "email": new_hospital.email
            },
            "staff": {
                "id": new_user.id,
                "name": staff_name,
                "email": new_user.email,
                "temp_password": temp_password  # Always include password for admin reference
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        error_details = traceback.format_exc()
        error_message = str(e)
        
        print(f"ERROR: Error creating hospital: {error_message}")
        print(f"Traceback: {error_details}")
        
        return jsonify({
            "error": "Failed to create hospital",
            "message": error_message
        }), 500


@admin_bp.route("/hospitals/<int:hospital_id>/staff/unblock", methods=["POST"])
@jwt_required()
def unblock_hospital_staff(hospital_id):
    """
    Unblock a hospital's staff member and reactivate hospital
    """
    try:
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        hospital = Hospital.query.get(hospital_id)
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404
        
        from app.models import HospitalStaff
        staff_relation = HospitalStaff.query.filter_by(hospital_id=hospital_id).first()
        
        if not staff_relation or not staff_relation.user:
            return jsonify({"error": "No staff member found for this hospital"}), 404
        
        staff_user = staff_relation.user
        
        # Unblock user
        staff_user.status = "active"
        staff_relation.status = "active"
        hospital.is_verified = True
        
        db.session.commit()
        
        return jsonify({
            "message": "Staff member unblocked successfully",
            "staff": {
                "id": staff_user.id,
                "name": f"{staff_user.first_name} {staff_user.last_name}",
                "email": staff_user.email,
                "status": staff_user.status
            },
            "hospital_verified": hospital.is_verified
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/hospitals/<int:hospital_id>/staff/<int:staff_id>/resend", methods=["POST"])
@jwt_required()
def resend_staff_invitation(hospital_id, staff_id):
    """
    Resend invitation to rejected or pending staff member
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get HospitalStaff record
        from app.models import HospitalStaff
        from app.utils.password_generator import generate_password
        from app.utils.email_sender import send_email
        from app.utils.email_templates import get_staff_invitation_email
        
        hs_record = HospitalStaff.query.filter_by(hospital_id=hospital_id, user_id=staff_id).first()
        if not hs_record or not hs_record.user:
            return jsonify({"error": "Staff member not found"}), 404
        
        hospital = Hospital.query.get(hospital_id)
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404
        
        user = hs_record.user
        
        # Generate new password
        new_password = generate_password()
        user.set_password(new_password)
        
        # Reset status to pending
        hs_record.status = "pending"
        user.status = "inactive"
        
        db.session.commit()
        
        # Send invitation email
        try:
            staff_name = f"{user.first_name} {user.last_name}".strip()
            accept_url = f"{request.host_url}api/staff/accept-invitation/{user.id}"
            reject_url = f"{request.host_url}api/staff/reject-invitation/{user.id}"
            
            email_html = get_staff_invitation_email(
                staff_name=staff_name,
                hospital_name=hospital.name,
                email=user.email,
                temp_password=new_password,
                accept_url=accept_url,
                reject_url=reject_url
            )
            
            send_email(
                to_email=user.email,
                subject=f"Staff Invitation (Resent) - {hospital.name}",
                html_content=email_html
            )
        except Exception as e:
            print(f"Failed to send email: {str(e)}")
        
        return jsonify({
            "message": "Invitation resent successfully",
            "staff_status": "pending"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to resend invitation"}), 500


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
                # Note: Donor model doesn't have 'name' field, using User fields instead
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
        
        # Get paginated results (SQLAlchemy query method)
        matches_pagination = query.paginate(  # type: ignore
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        matches_data = []
        for match, donor, request_obj, hospital in matches_pagination.items:
            try:
                # Calculate match score based on various factors
                match_score = calculate_match_score(donor, request_obj)

                # Safely get donor user information
                donor_user = None
                donor_name = 'Unknown Donor'
                donor_email = 'N/A'
                donor_phone = 'N/A'
                donor_city = 'N/A'  # Add donor city

                if hasattr(donor, 'user') and donor.user:
                    donor_user = donor.user
                    donor_name = f"{getattr(donor_user, 'first_name', '')} {getattr(donor_user, 'last_name', '')}".strip() or 'Unknown Donor'
                    donor_email = getattr(donor_user, 'email', 'N/A')
                    donor_phone = getattr(donor_user, 'phone', 'N/A')
                    donor_city = getattr(donor_user, 'city', 'N/A')  # Get city from user

                # Safely get hospital information
                hospital_name = getattr(hospital, 'name', 'Unknown Hospital')
                hospital_city = getattr(hospital, 'city', 'N/A')

                # Safely get request information
                patient_name = getattr(request_obj, 'patient_name', 'Unknown Patient')
                blood_group = getattr(request_obj, 'blood_group', 'N/A')
                units_required = getattr(request_obj, 'units_required', 0)
                urgency = getattr(request_obj, 'urgency', 'normal')

                matches_data.append({
                    "id": match.id,
                    "donor_name": donor_name,
                    "donor_email": donor_email,
                    "donor_phone": donor_phone,
                    "donor_city": donor_city,  # Include donor city in response
                    "hospital_name": hospital_name,
                    "hospital_city": hospital_city,
                    "patient_name": patient_name,
                    "blood_group": blood_group,
                    "units_required": units_required,
                    "urgency": urgency,
                    "match_score": match_score,
                    "status": match.status,
                    "matched_at": match.matched_at.isoformat() if match.matched_at else None,
                    "confirmed_at": match.confirmed_at.isoformat() if match.confirmed_at else None,
                    "completed_at": match.completed_at.isoformat() if match.completed_at else None,
                    "notes": match.notes
                })
            except Exception as e:
                current_app.logger.warning(f'Error processing match {match.id}: {str(e)}')
                continue
        
        return jsonify({
            "matches": matches_data,
            "total": matches_pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": matches_pagination.pages
        }), 200

    except Exception as e:
        current_app.logger.exception("Error fetching matches")
        return jsonify({
            "error": "Failed to fetch matches",
            "details": str(e) if current_app.debug else None
        }), 500


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


@admin_bp.route("/matches/export", methods=["GET"])
@jwt_required()
def export_matches():
    """
    Export blood matches to CSV
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
        
        # Get all results (no pagination for export)
        matches = query.all()
        
        # Create CSV content
        csv_content = "Match ID,Donor Name,Donor Email,Donor Phone,Donor City,Hospital Name,Hospital City,Patient Name,Blood Group,Units Required,Urgency,Match Score,Status,Matched Date,Confirmed Date,Completed Date,Notes\n"
        
        for match, donor, request_obj, hospital in matches:
            try:
                # Safely get donor user information
                donor_name = 'Unknown Donor'
                donor_email = 'N/A'
                donor_phone = 'N/A'
                donor_city = 'N/A'  # Add donor city
                
                if hasattr(donor, 'user') and donor.user:
                    donor_name = f"{getattr(donor.user, 'first_name', '')} {getattr(donor.user, 'last_name', '')}".strip() or 'Unknown Donor'
                    donor_email = getattr(donor.user, 'email', 'N/A')
                    donor_phone = getattr(donor.user, 'phone', 'N/A')
                    donor_city = getattr(donor.user, 'city', 'N/A')  # Get city from user
                
                # Safely get hospital information
                hospital_name = getattr(hospital, 'name', 'Unknown Hospital')
                hospital_city = getattr(hospital, 'city', 'N/A')
                
                # Safely get request information
                patient_name = getattr(request_obj, 'patient_name', 'Unknown Patient')
                blood_group = getattr(request_obj, 'blood_group', 'N/A')
                units_required = getattr(request_obj, 'units_required', 0)
                urgency = getattr(request_obj, 'urgency', 'normal')
                
                # Calculate match score
                match_score = calculate_match_score(donor, request_obj)
                
                # Format dates
                matched_date = match.matched_at.strftime('%Y-%m-%d %H:%M:%S') if match.matched_at else 'N/A'
                confirmed_date = match.confirmed_at.strftime('%Y-%m-%d %H:%M:%S') if match.confirmed_at else 'N/A'
                completed_date = match.completed_at.strftime('%Y-%m-%d %H:%M:%S') if match.completed_at else 'N/A'
                
                # Escape quotes in fields
                def escape_csv_field(value):
                    if isinstance(value, str):
                        return f'"{value.replace("\"", "\"\"")}"'
                    return value
                
                csv_content += f'{match.id},{escape_csv_field(donor_name)},{escape_csv_field(donor_email)},{escape_csv_field(donor_phone)},{escape_csv_field(donor_city)},{escape_csv_field(hospital_name)},{escape_csv_field(hospital_city)},{escape_csv_field(patient_name)},{escape_csv_field(blood_group)},{units_required},{escape_csv_field(urgency)},{match_score},{escape_csv_field(match.status)},{escape_csv_field(matched_date)},{escape_csv_field(confirmed_date)},{escape_csv_field(completed_date)},{escape_csv_field(match.notes or "N/A")}\n'
            except Exception as e:
                current_app.logger.warning(f'Error processing match {match.id} for export: {str(e)}')
                continue
        
        # Return CSV content
        from flask import Response
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=blood_matches.csv'}
        )
        
    except Exception as e:
        current_app.logger.exception("Error exporting matches")
        return jsonify({"error": "Failed to export matches"}), 500


@admin_bp.route("/matches/stats", methods=["GET"])
@jwt_required()
def get_matches_stats():
    """
    Get blood matches statistics
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Get statistics
        total_matches = db.session.query(Match).count()
        pending_matches = db.session.query(Match).filter(Match.status == 'pending').count()
        accepted_matches = db.session.query(Match).filter(Match.status == 'accepted').count()
        completed_matches = db.session.query(Match).filter(Match.status == 'completed').count()
        
        return jsonify({
            "total": total_matches,
            "pending": pending_matches,
            "accepted": accepted_matches,
            "completed": completed_matches
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Error fetching matches stats")
        return jsonify({"error": "Failed to fetch matches stats"}), 500


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
    # Fix: Access city through donor.user instead of donor.city
    if hasattr(donor, 'user') and donor.user and hasattr(request_obj, 'hospital') and request_obj.hospital:
        if getattr(donor.user, 'city', None) == getattr(request_obj.hospital, 'city', None):
            score += 20
        elif getattr(donor.user, 'district', None) == getattr(request_obj.hospital, 'district', None):
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
        
        # Get paginated results (SQLAlchemy query method)
        requests_pagination = query.paginate(  # type: ignore
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        requests_data = []
        for request_obj, hospital in requests_pagination.items:
            try:
                # Count existing matches for this request
                match_count = 0
                if hasattr(request_obj, 'id') and request_obj.id:
                    match_count = Match.query.filter_by(request_id=request_obj.id).count()

                # Safely get hospital information
                hospital_name = getattr(hospital, 'name', 'Unknown Hospital')
                hospital_city = getattr(hospital, 'city', 'N/A')
                hospital_district = getattr(hospital, 'district', 'N/A')

                # Safely get request information
                patient_name = getattr(request_obj, 'patient_name', 'Unknown Patient')
                blood_group = getattr(request_obj, 'blood_group', 'N/A')
                units_required = getattr(request_obj, 'units_required', 0)
                urgency = getattr(request_obj, 'urgency', 'normal')
                status = getattr(request_obj, 'status', 'pending')
                description = getattr(request_obj, 'description', '')
                contact_person = getattr(request_obj, 'contact_person', 'N/A')
                contact_phone = getattr(request_obj, 'contact_phone', 'N/A')

                requests_data.append({
                    "id": request_obj.id,
                    "hospital_name": hospital_name,
                    "hospital_city": hospital_city,
                    "hospital_district": hospital_district,
                    "patient_name": patient_name,
                    "blood_group": blood_group,
                    "units_required": units_required,
                    "urgency": urgency,
                    "status": status,
                    "description": description,
                    "contact_person": contact_person,
                    "contact_phone": contact_phone,
                    "required_by": request_obj.required_by.isoformat() if request_obj.required_by else None,
                    "created_at": request_obj.created_at.isoformat() if request_obj.created_at else None,
                    "updated_at": request_obj.updated_at.isoformat() if request_obj.updated_at else None,
                    "match_count": match_count
                })
            except Exception as e:
                current_app.logger.warning(f'Error processing request {request_obj.id}: {str(e)}')
                continue

        return jsonify({
            "requests": requests_data,
            "total": requests_pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": requests_pagination.pages
        }), 200

    except Exception as e:
        current_app.logger.exception("Error fetching requests")
        return jsonify({
            "error": "Failed to fetch requests",
            "details": str(e) if current_app.debug else None
        }), 500


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

        hospital = None
        if hasattr(request_obj, 'hospital_id') and request_obj.hospital_id:
            hospital = Hospital.query.get(request_obj.hospital_id)

        # Get existing matches for this request
        matches_data = []
        try:
            matches = db.session.query(Match, Donor).join(
                Donor, Match.donor_id == Donor.id
            ).filter(Match.request_id == request_id).all()

            for match, donor in matches:
                try:
                    # Safely get donor user information
                    donor_user = None
                    donor_name = 'Unknown Donor'
                    donor_email = 'N/A'
                    donor_phone = 'N/A'

                    if hasattr(donor, 'user') and donor.user:
                        donor_user = donor.user
                        donor_name = f"{getattr(donor_user, 'first_name', '')} {getattr(donor_user, 'last_name', '')}".strip() or 'Unknown Donor'
                        donor_email = getattr(donor_user, 'email', 'N/A')
                        donor_phone = getattr(donor_user, 'phone', 'N/A')

                    matches_data.append({
                        "id": match.id,
                        "donor_name": donor_name,
                        "donor_email": donor_email,
                        "donor_phone": donor_phone,
                        "donor_blood_group": getattr(donor, 'blood_group', 'N/A'),
                        "match_status": match.status,
                        "matched_at": match.matched_at.isoformat() if match.matched_at else None,
                        "confirmed_at": match.confirmed_at.isoformat() if match.confirmed_at else None
                    })
                except Exception as e:
                    current_app.logger.warning(f'Error processing match {match.id}: {str(e)}')
                    continue
        except Exception as e:
            current_app.logger.warning(f'Error fetching matches for request {request_id}: {str(e)}')

        # Safely get hospital information
        hospital_name = 'Unknown Hospital'
        hospital_city = 'N/A'
        hospital_district = 'N/A'
        hospital_address = 'N/A'
        hospital_phone = 'N/A'

        if hospital:
            hospital_name = getattr(hospital, 'name', 'Unknown Hospital')
            hospital_city = getattr(hospital, 'city', 'N/A')
            hospital_district = getattr(hospital, 'district', 'N/A')
            hospital_address = getattr(hospital, 'address', 'N/A')
            hospital_phone = getattr(hospital, 'phone', 'N/A')

        request_data = {
            "id": request_obj.id,
            "hospital_name": hospital_name,
            "hospital_city": hospital_city,
            "hospital_district": hospital_district,
            "hospital_address": hospital_address,
            "hospital_phone": hospital_phone,
            "patient_name": getattr(request_obj, 'patient_name', 'Unknown Patient'),
            "blood_group": getattr(request_obj, 'blood_group', 'N/A'),
            "units_required": getattr(request_obj, 'units_required', 0),
            "urgency": getattr(request_obj, 'urgency', 'normal'),
            "status": getattr(request_obj, 'status', 'pending'),
            "description": getattr(request_obj, 'description', ''),
            "contact_person": getattr(request_obj, 'contact_person', 'N/A'),
            "contact_phone": getattr(request_obj, 'contact_phone', 'N/A'),
            "required_by": request_obj.required_by.isoformat() if request_obj.required_by else None,
            "created_at": request_obj.created_at.isoformat() if request_obj.created_at else None,
            "updated_at": request_obj.updated_at.isoformat() if request_obj.updated_at else None,
            "matches": matches_data
        }

        return jsonify(request_data), 200

    except Exception as e:
        current_app.logger.exception("Error fetching request details")
        return jsonify({
            "error": "Failed to fetch request details",
            "details": str(e) if current_app.debug else None
        }), 500


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
        
        # Create new match (SQLAlchemy dynamic model)
        match = Match(  # type: ignore
            request_id=request_id,  # type: ignore
            donor_id=donor_id,  # type: ignore
            status='pending'  # type: ignore
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
        
        # Get paginated results (SQLAlchemy query method)
        donations_pagination = query.paginate(  # type: ignore
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


@admin_bp.route("/activity-table", methods=["GET"])
@jwt_required()
def get_activity_table():
    """
    Get activity table data with pagination
    Returns donation history with donor, hospital, and request details
    """
    try:
        # Verify admin user
        current_user_id = get_jwt_identity()
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({
                "error": "Unauthorized",
                "message": "Admin access required"
            }), 401
        
        # Get pagination parameters
        try:
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 10))
            status_filter = request.args.get('status', 'all')
            
            if page < 1:
                page = 1
            if per_page < 1 or per_page > 100:
                per_page = 10
        except ValueError:
            return jsonify({
                "error": "Invalid pagination parameters",
                "message": "Page and per_page must be valid integers"
            }), 400
        
        # Check if DonationHistory table has any records
        total_records = db.session.query(DonationHistory).count()
        
        if total_records == 0:
            # Return empty result if no donation history exists
            return jsonify({
                "activities": [],
                "total": 0,
                "page": page,
                "per_page": per_page,
                "pages": 0,
                "has_next": False,
                "has_prev": False
            }), 200
        
        # Build query - get donation history with joins
        query = db.session.query(
            DonationHistory.id,
            DonationHistory.units,
            DonationHistory.donation_date,
            User.first_name.label('donor_first_name'),
            User.last_name.label('donor_last_name'),
            Donor.blood_group,
            Hospital.name.label('hospital_name'),
            Request.status.label('request_status'),
            Request.urgency.label('priority')
        ).join(
            Donor, DonationHistory.donor_id == Donor.id
        ).join(
            User, Donor.user_id == User.id
        ).join(
            Hospital, DonationHistory.hospital_id == Hospital.id
        ).outerjoin(
            Request, DonationHistory.request_id == Request.id
        )
        
        # Apply status filter if specified
        if status_filter != 'all':
            query = query.filter(Request.status == status_filter)
        
        # Order by donation date (most recent first)
        query = query.order_by(DonationHistory.donation_date.desc())
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        paginated_query = query.limit(per_page).offset((page - 1) * per_page)
        results = paginated_query.all()
        
        # Format response
        activities = []
        for row in results:
            # Calculate time ago
            time_diff = datetime.utcnow() - row.donation_date
            if time_diff.days > 0:
                time_ago = f"{time_diff.days} days ago"
            elif time_diff.seconds // 3600 > 0:
                time_ago = f"{time_diff.seconds // 3600} hours ago"
            else:
                time_ago = f"{time_diff.seconds // 60} minutes ago"
            
            # Format donor name
            donor_name = f"{row.donor_first_name}"
            if row.donor_last_name:
                donor_name += f" {row.donor_last_name}"
            
            activities.append({
                "id": row.id,
                "donor": donor_name,
                "hospital": row.hospital_name,
                "bloodType": row.blood_group,
                "units": row.units,
                "status": row.request_status or "completed",
                "priority": row.priority or "medium",
                "time": time_ago
            })
        
        # Calculate pagination metadata
        pages = (total + per_page - 1) // per_page if total > 0 else 0
        
        return jsonify({
            "activities": activities,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching activity table: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to fetch activity table",
            "message": "An error occurred while retrieving activity data"
        }), 500