from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

from app.models import db, User, Hospital, HospitalStaff, Request, Match, Donor, MatchPrediction

seeker_bp = Blueprint('seeker', __name__, url_prefix='/api/seeker')


def _current_staff_and_hospital():
    """Resolve current staff user and their hospital. Returns (user, hospital, error_response_or_none)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != 'staff':
        return None, None, (jsonify({"error": "only hospital staff can access seeker APIs"}), 403)
    staff_rel = HospitalStaff.query.filter_by(user_id=user.id).first()
    if not staff_rel:
        return user, None, (jsonify({"error": "no hospital linked for this staff user"}), 404)
    hospital = Hospital.query.get(staff_rel.hospital_id)
    if not hospital:
        return user, None, (jsonify({"error": "hospital not found"}), 404)
    return user, hospital, None


@seeker_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change password for staff user"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'staff':
        return jsonify({"error": "only hospital staff can access this endpoint"}), 403
    
    data = request.get_json() or {}
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({"error": "old_password and new_password are required"}), 400
    
    # Verify old password
    if not check_password_hash(user.password_hash, old_password):
        return jsonify({"error": "current password is incorrect"}), 401
    
    # Validate new password strength
    if len(new_password) < 8:
        return jsonify({"error": "new password must be at least 8 characters long"}), 400
    
    # Update password
    user.password_hash = generate_password_hash(new_password)
    user.password_needs_change = False  # Clear the flag after password change
    
    try:
        db.session.commit()
        
        # Create new tokens with the updated user state
        from flask_jwt_extended import create_access_token, create_refresh_token
        from datetime import timedelta
        from flask import current_app
        
        access = create_access_token(
            identity=str(user.id), 
            expires_delta=timedelta(minutes=current_app.config.get("ACCESS_EXPIRES_MINUTES", 15))
        )
        refresh = create_refresh_token(
            identity=str(user.id), 
            expires_delta=timedelta(days=current_app.config.get("REFRESH_EXPIRES_DAYS", 7))
        )
        
        return jsonify({
            "message": "Password changed successfully",
            "access_token": access,
            "refresh_token": refresh
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update password", "details": str(e)}), 500


@seeker_bp.route('/hospital', methods=['GET'])
@jwt_required()
def get_hospital():
    """Get current staff user's hospital profile and minimal staff info."""
    user, hospital, err = _current_staff_and_hospital()
    if err:
        return err

    # Type guard for user and hospital
    if not user or not hospital:
        return jsonify({"error": "invalid user or hospital"}), 500

    staff_name = f"{user.first_name} {user.last_name or ''}".strip()
    payload = {
        "id": hospital.id,
        "name": hospital.name,
        "address": hospital.address,
        "district": hospital.district,
        "city": hospital.city,
        "state": hospital.state,
        "pincode": hospital.pincode,
        "phone": user.phone or hospital.phone,
        "email": user.email or hospital.email,
        # also include nested object for compatibility
        "hospital": {
            "id": hospital.id,
            "name": hospital.name,
            "verified": bool(hospital.is_verified),
        },
        "staff_name": staff_name,
        "staff_status": hospital.get_staff_status().get("staff_status"),
    }
    return jsonify(payload), 200


@seeker_bp.route('/hospital', methods=['PUT'])
@jwt_required()
def update_hospital_staff_profile():
    """Update staff-facing profile fields (name/phone/email). Does not mutate core hospital record."""
    user, hospital, err = _current_staff_and_hospital()
    if err:
        return err

    # Type guard
    if not user:
        return jsonify({"error": "invalid user"}), 500

    data = request.get_json() or {}
    staff_name = (data.get('staff_name') or '').strip()
    phone = (data.get('phone') or '').strip()
    email = (data.get('email') or '').strip()

    # Update user fields
    if staff_name:
        parts = staff_name.split()
        user.first_name = parts[0]
        user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else None
    if phone:
        user.phone = phone
    if email:
        user.email = email

    db.session.commit()

    return jsonify({
        "message": "updated",
        "staff_name": f"{user.first_name} {user.last_name or ''}".strip(),
        "phone": user.phone,
        "email": user.email,
    }), 200


@seeker_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """Aggregate dashboard metrics for the staff user's hospital."""
    user, hospital, err = _current_staff_and_hospital()
    if err:
        return err

    # Type guard
    if not hospital:
        return jsonify({"error": "invalid hospital"}), 500

    # Base query for this hospital
    q = Request.query.filter_by(hospital_id=hospital.id)

    # Totals
    total_requests = q.count()

    # Urgent requests (treat critical/emergency/urgent as urgent)
    urgent_requests = q.filter(Request.urgency.in_(["critical", "emergency", "urgent"]))\
                        .filter(Request.status.in_(["pending", "open", "active", "matched", "inprogress"]))\
                        .count()

    # Confirmed matches: any match for this hospital's requests that is confirmed/accepted/completed
    confirmed_matches = db.session.query(Match).join(Request, Match.request_id == Request.id)\
        .filter(Request.hospital_id == hospital.id)\
        .filter((Match.confirmed_at.isnot(None)) | (Match.completed_at.isnot(None)) | (Match.status.in_(["accepted", "confirmed", "completed"])) )\
        .count()

    # Requests in last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    requests_last_7d = q.filter(Request.created_at >= seven_days_ago).count()

    # Demand by group: open/active requests grouped by blood group
    demand_rows = db.session.query(Request.blood_group, func.count(Request.id))\
        .filter(Request.hospital_id == hospital.id)\
        .filter(Request.status.in_(["pending", "open", "active", "matched", "inprogress"]))\
        .group_by(Request.blood_group).all()
    demand_by_group = [ { 'group': bg, 'count': int(cnt) } for (bg, cnt) in demand_rows ]

    # Monthly trend: last 6 months including current
    labels = []
    data = []
    today = datetime.utcnow().replace(day=1)
    for i in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=30*i))
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        label = month_start.strftime('%b %Y')
        count = q.filter(Request.created_at >= month_start, Request.created_at < month_end).count()
        labels.append(label)
        data.append(count)

    # Recent activity: last 10
    recent = q.order_by(Request.created_at.desc()).limit(10).all()
    activity = [
        {
            'title': f"{r.blood_group} • {r.units_required} units • {r.urgency.capitalize()}",
            'time': r.created_at.strftime('%Y-%m-%d %H:%M'),
            'type': 'warning' if r.urgency in ('critical','emergency','urgent') else 'info'
        }
        for r in recent
    ]

    return jsonify({
        'urgent_requests': urgent_requests,
        'total_requests': total_requests,
        'confirmed_matches': confirmed_matches,
        'requests_last_7d': requests_last_7d,
        'demand_by_group': demand_by_group,
        'monthly': { 'labels': labels, 'data': data },
        'activity': activity,
    }), 200


@seeker_bp.route('/matches', methods=['GET'])
@jwt_required()
def list_matches():
    """List matches for this hospital's requests (brief fields for dashboard/overview)."""
    user, hospital, err = _current_staff_and_hospital()
    if err:
        return err

    # Type guard
    if not hospital:
        return jsonify({"error": "invalid hospital"}), 500

    # Get query parameters
    request_id = request.args.get('request_id', type=int)
    
    # Build base query - this already filters by hospital_id
    query = db.session.query(Match, Request).join(Request, Match.request_id == Request.id)\
        .filter(Request.hospital_id == hospital.id)
    
    # If specific request_id is provided, filter by that as well
    if request_id:
        query = query.filter(Request.id == request_id)
    
    rows = query.order_by(Match.matched_at.desc()).limit(100).all()

    out = []
    for m, r in rows:
        # Get donor information
        donor = Donor.query.get(m.donor_id)
        donor_user = User.query.get(donor.user_id) if donor else None
        
        # Get match prediction information for additional scores
        match_prediction = None
        if hasattr(m, 'request_id'):
            match_prediction = MatchPrediction.query.filter_by(
                request_id=m.request_id, 
                donor_id=m.donor_id
            ).first()
        
        match_obj = {
            'match_id': m.id,
            'request_id': r.id,
            'status': m.status,
            'match_score': getattr(m, 'match_score', None) or (match_prediction.match_score if match_prediction else None),
            'availability_score': match_prediction.availability_score if match_prediction else None,
            'reliability_score': match_prediction.reliability_score if match_prediction else (getattr(donor, 'reliability_score', None) if donor else None),
            'response_time_hours': match_prediction.response_time_hours if match_prediction else None,
            'distance_km': match_prediction.feature_vector.get('distance_km', 0) if match_prediction and match_prediction.feature_vector else 0,
            'notified_at': m.matched_at.isoformat() if m.matched_at else None,
            'confirmed_at': m.confirmed_at.isoformat() if m.confirmed_at else None,
            'completed_at': m.completed_at.isoformat() if m.completed_at else None,
            'blood_group': r.blood_group,
            'urgency': r.urgency,
            'units_required': r.units_required,
            'patient_name': r.patient_name,
            'donor_name': f"{donor_user.first_name} {donor_user.last_name}" if donor_user else "Unknown Donor",
            'donor_blood_group': getattr(donor, 'blood_group', 'N/A') if donor else 'N/A',
            'donor_phone': donor_user.phone if donor_user and match_prediction and match_prediction.notified else None,
            'donor_email': donor_user.email if donor_user and match_prediction and match_prediction.notified else None,
            'donor_city': getattr(donor_user, 'city', 'N/A') if donor_user else 'N/A',
            'donor_district': getattr(donor_user, 'district', 'N/A') if donor_user else 'N/A',
            'last_donation_date': donor.last_donation_date.isoformat() if donor and donor.last_donation_date else None,
        }
        out.append(match_obj)
    return jsonify({ 'items': out }), 200

