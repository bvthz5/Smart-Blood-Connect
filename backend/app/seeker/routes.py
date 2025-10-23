from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func

from app.models import db, User, Hospital, HospitalStaff, Request, Match

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


@seeker_bp.route('/hospital', methods=['GET'])
@jwt_required()
def get_hospital():
    """Get current staff user's hospital profile and minimal staff info."""
    user, hospital, err = _current_staff_and_hospital()
    if err:
        return err

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

    rows = db.session.query(Match, Request).join(Request, Match.request_id == Request.id)\
        .filter(Request.hospital_id == hospital.id)\
        .order_by(Match.matched_at.desc()).limit(100).all()

    out = []
    for m, r in rows:
        out.append({
            'match_id': m.id,
            'request_id': r.id,
            'status': m.status,
            'match_score': getattr(m, 'match_score', None),
            'notified_at': m.matched_at.isoformat() if m.matched_at else None,
            'confirmed_at': m.confirmed_at.isoformat() if m.confirmed_at else None,
            'completed_at': m.completed_at.isoformat() if m.completed_at else None,
            'blood_group': r.blood_group,
            'urgency': r.urgency,
        })
    return jsonify({ 'items': out }), 200

