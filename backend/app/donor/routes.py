from flask import Blueprint, jsonify, request, current_app
from app.extensions import db
from app.models import User, Donor, Match, DonationHistory, Hospital
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app.utils.id_encoder import encode_id, decode_id, IDEncodingError

donor_bp = Blueprint("donor", __name__, url_prefix="/api/donors")


# Helper to validate current donor identity (role=donor, status=active) and fetch user+donor
from flask import jsonify

def _get_current_donor():
    uid = get_jwt_identity()
    try:
        uid = int(uid)
    except Exception:
        return None, None, (jsonify({"error": "invalid token"}), 401)

    user = User.query.get(uid)
    if not user:
        return None, None, (jsonify({"error": "user not found"}), 404)
    if user.role != "donor" or user.status != "active":
        return None, None, (jsonify({"error": "forbidden"}), 403)

    donor = Donor.query.filter_by(user_id=uid).first()
    if not donor:
        return None, None, (jsonify({"error": "donor profile not found"}), 404)

    return user, donor, None


@donor_bp.route("/profile/<encoded_id>", methods=["GET"])
@jwt_required()
def get_profile_by_id(encoded_id):
    """Get donor profile by encoded ID."""
    try:
        # Decode the ID
        donor_id = decode_id(encoded_id)

        # Find the donor
        donor = Donor.query.get(donor_id)
        if not donor:
            return jsonify({"error": "Donor not found"}), 404

        # Get user info
        user = User.query.get(donor.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "id": encode_id(user.id),
            "donor_id": encode_id(donor.id),
            "name": f"{user.first_name} {user.last_name or ''}".strip(),
            "email": user.email,
            "phone": user.phone,
            "blood_group": donor.blood_group,
            "availability_status": "available" if donor.is_available else "unavailable",
            "last_donation_date": donor.last_donation_date.isoformat() if donor.last_donation_date else None,
            "reliability_score": donor.reliability_score
        })

    except IDEncodingError as e:
        return jsonify({"error": f"Invalid ID format: {str(e)}"}), 400
    except Exception as e:
        current_app.logger.exception("Error fetching donor profile")
        return jsonify({"error": "Internal server error"}), 500


@donor_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user, donor, err = _get_current_donor()
    if err:
        return err
    return jsonify({
        "id": encode_id(user.id),
        "donor_id": encode_id(donor.id),
        "name": f"{user.first_name} {user.last_name or ''}".strip(),
        "email": user.email,
        "phone": user.phone,
        "blood_group": donor.blood_group,
        "availability_status": "available" if donor.is_available else "unavailable",
        "last_donation_date": donor.last_donation_date.isoformat() if donor.last_donation_date else None
    })

@donor_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    user, donor, err = _get_current_donor()
    if err:
        return err
    data = request.get_json() or {}
    user.first_name = data.get("name", user.first_name)
    donor.blood_group = data.get("blood_group", donor.blood_group)
    donor.location_lat = data.get("location_lat", donor.location_lat)
    donor.location_lng = data.get("location_lon", donor.location_lng)

    # Optional: allow setting date_of_birth but enforce 18+
    dob_str = data.get("date_of_birth")
    if dob_str:
        try:
            dob = datetime.fromisoformat(dob_str).date()
        except Exception:
            return jsonify({"error": "Invalid date_of_birth format. Use YYYY-MM-DD."}), 400
        today = datetime.utcnow().date()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age < 18:
            return jsonify({"error": "You must be at least 18 years old to register as a donor."}), 400
        donor.date_of_birth = dob

    db.session.commit()
    return jsonify({"message":"profile updated"})

@donor_bp.route("/availability", methods=["POST"])
@jwt_required()
def set_availability():
    user, donor, err = _get_current_donor()
    if err:
        return err
    data = request.get_json() or {}
    status = (data.get("status") or "").lower()
    donor.is_available = status == "available"
    db.session.commit()
    return jsonify({"status": "available" if donor.is_available else "unavailable"})

@donor_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    user, donor, err = _get_current_donor()
    if err:
        return err

    # Active matches (pending)
    active_matches = Match.query.filter_by(donor_id=donor.id, status="pending").count()

    # Donation metrics
    total_donations = DonationHistory.query.filter_by(donor_id=donor.id).count()
    last_donation = DonationHistory.query.filter_by(donor_id=donor.id).order_by(DonationHistory.donation_date.desc()).first()
    last_donation_date = last_donation.donation_date.isoformat() if last_donation else None
    last_hospital_name = None
    if last_donation and last_donation.hospital_id:
        hosp = Hospital.query.get(last_donation.hospital_id)
        last_hospital_name = hosp.name if hosp else None

    # Eligibility: 56 days after last donation
    eligible_date = None
    eligible_in_days = 0
    if last_donation and last_donation.donation_date:
        try:
            next_eligible = last_donation.donation_date + timedelta(days=56)
            eligible_date = next_eligible.date().isoformat()
            delta = (next_eligible - datetime.utcnow())
            eligible_in_days = max(0, (delta.days if delta.days is not None else 0))
        except Exception:
            eligible_date = None
            eligible_in_days = 0

    return jsonify({
        "name": f"{user.first_name} {user.last_name or ''}".strip(),
        "blood_group": donor.blood_group,
        "availability_status": "available" if donor.is_available else "unavailable",
        "reliability_score": donor.reliability_score,
        "active_matches_count": active_matches,
        "total_donations": total_donations,
        "last_donation_date": last_donation_date,
        "last_donated_to": last_hospital_name,
        "eligible_date": eligible_date,
        "eligible_in_days": eligible_in_days
    })

@donor_bp.route("/matches", methods=["GET"])
@jwt_required()
def list_matches():
    user, donor, err = _get_current_donor()
    if err:
        return err
    # list pending or recent matches
    q = Match.query.filter_by(donor_id=donor.id).order_by(Match.matched_at.desc()).limit(50)
    rows = []
    for m in q:
        rows.append({
            "match_id": m.id,
            "request_id": m.request_id,
            "score": None,
            "response": m.status,
            "response_at": (m.confirmed_at.isoformat() if m.confirmed_at else (m.completed_at.isoformat() if m.completed_at else None)),
            "notified_at": m.matched_at.isoformat() if m.matched_at else None
        })
    return jsonify(rows)

@donor_bp.route("/respond", methods=["POST"])
@jwt_required()
def respond_to_match():
    """
    Body: { match_id, action }  action = "accept" or "reject"
    Atomic: update match record, set response and response_at.
    If accepted -> optionally set request.status = 'matched' (first accepted)
    """
    user, donor, err = _get_current_donor()
    if err:
        return err

    data = request.get_json() or {}
    match_id = data.get("match_id")
    action = (data.get("action") or "").lower()
    if action not in ("accept", "reject"):
        return jsonify({"error":"invalid action"}), 400

    mr = Match.query.with_for_update().filter_by(id=match_id, donor_id=donor.id).first()
    if not mr:
        return jsonify({"error":"match not found"}), 404
    if mr.status != "pending":
        return jsonify({"error":"already responded"}), 409

    try:
        # atomic update
        mr.status = "accepted" if action == "accept" else "declined"
        mr.confirmed_at = datetime.utcnow()
        db.session.add(mr)

        if action == "accept":
            # set request status to 'matched' if not already
            req = mr.request
            if req and req.status not in ("fulfilled", "matched"):
                req.status = "matched"
                db.session.add(req)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("error responding to match")
        return jsonify({"error":"internal"}), 500

    return jsonify({"match_id": mr.id, "response": mr.status}), 200