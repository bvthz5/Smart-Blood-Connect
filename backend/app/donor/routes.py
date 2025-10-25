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
    """Get current donor's complete profile"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    # Count total donations
    donation_count = DonationHistory.query.filter_by(donor_id=donor.id).count()
    
    return jsonify({
        "id": encode_id(user.id),
        "donor_id": encode_id(donor.id),
        "first_name": user.first_name,
        "last_name": user.last_name or "",
        "name": f"{user.first_name} {user.last_name or ''}".strip(),
        "email": user.email,
        "phone": user.phone,
        "date_of_birth": donor.date_of_birth.isoformat() if donor.date_of_birth else None,
        "gender": donor.gender,
        "profile_pic_url": user.profile_pic_url,
        "address": user.address,
        "city": user.city,
        "district": user.district,
        "state": user.state,
        "pincode": user.pincode,
        "blood_group": donor.blood_group,
        "is_available": donor.is_available,
        "availability_status": "available" if donor.is_available else "unavailable",
        "last_donation_date": donor.last_donation_date.isoformat() if donor.last_donation_date else None,
        "reliability_score": donor.reliability_score,
        "donation_count": donation_count,
        "location_lat": float(donor.location_lat) if donor.location_lat else None,
        "location_lng": float(donor.location_lng) if donor.location_lng else None
    })

@donor_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    """Update donor profile - handles all profile fields"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    data = request.get_json() or {}
    
    # Update user fields
    if "first_name" in data:
        user.first_name = data["first_name"]
    if "last_name" in data:
        user.last_name = data["last_name"]
    if "phone" in data:
        user.phone = data["phone"]
    if "address" in data:
        user.address = data["address"]
    if "city" in data:
        user.city = data["city"]
    if "district" in data:
        user.district = data["district"]
    if "state" in data:
        user.state = data["state"]
    if "pincode" in data:
        user.pincode = data["pincode"]
    
    # Update donor fields
    if "blood_group" in data:
        donor.blood_group = data["blood_group"]
    if "gender" in data:
        donor.gender = data["gender"]
    if "location_lat" in data:
        donor.location_lat = data["location_lat"]
    if "location_lng" in data:
        donor.location_lng = data["location_lng"]

    # Handle date_of_birth with age validation
    dob_str = data.get("date_of_birth")
    if dob_str:
        try:
            dob = datetime.fromisoformat(dob_str.split('T')[0]).date()
        except Exception:
            return jsonify({"error": "Invalid date_of_birth format. Use YYYY-MM-DD."}), 400
        today = datetime.utcnow().date()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age < 18:
            return jsonify({"error": "You must be at least 18 years old to register as a donor."}), 400
        donor.date_of_birth = dob

    user.updated_at = datetime.utcnow()
    donor.updated_at = datetime.utcnow()
    
    db.session.commit()
    return jsonify({
        "message": "Profile updated successfully",
        "profile": {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "blood_group": donor.blood_group
        }
    })

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
    """
    Consolidated dashboard endpoint - returns all donor data in one call
    Includes: profile, stats, donations, matches, eligibility, location
    """
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

    # Recent donation history (last 5)
    recent_donations = DonationHistory.query.filter_by(donor_id=donor.id)\
        .order_by(DonationHistory.donation_date.desc())\
        .limit(5).all()
    
    donation_history = []
    for d in recent_donations:
        hosp = Hospital.query.get(d.hospital_id) if d.hospital_id else None
        donation_history.append({
            "id": d.id,
            "date": d.donation_date.isoformat() if d.donation_date else None,
            "hospital": hosp.name if hosp else "Unknown",
            "units": d.units
        })

    # Pending matches with details
    pending_match_records = Match.query.filter_by(donor_id=donor.id, status="pending")\
        .order_by(Match.matched_at.desc()).limit(5).all()
    
    pending_matches_detail = []
    for m in pending_match_records:
        req = m.request
        if req:
            hosp = Hospital.query.get(req.hospital_id) if req.hospital_id else None
            pending_matches_detail.append({
                "match_id": m.id,
                "request_id": req.id,
                "hospital": hosp.name if hosp else "Unknown",
                "blood_group": req.blood_group,
                "urgency": req.urgency,
                "units_required": req.units_required,
                "matched_at": m.matched_at.isoformat() if m.matched_at else None
            })

    # Consolidated response
    return jsonify({
        "user": {
            "id": encode_id(user.id),
            "first_name": user.first_name,
            "last_name": user.last_name or "",
            "email": user.email,
            "phone": user.phone,
            "district": user.district,
            "city": user.city,
            "profile_pic_url": user.profile_pic_url
        },
        "donor": {
            "id": encode_id(donor.id),
            "blood_group": donor.blood_group,
            "is_available": donor.is_available,
            "last_donation_date": last_donation_date,
            "next_eligible_date": eligible_date,
            "eligible_in_days": eligible_in_days,
            "reliability_score": donor.reliability_score,
            "location": {
                "lat": float(donor.location_lat) if donor.location_lat else None,
                "lng": float(donor.location_lng) if donor.location_lng else None
            }
        },
        "stats": {
            "total_donations": total_donations,
            "last_hospital": last_hospital_name,
            "pending_matches_count": active_matches,
            "availability_status": "available" if donor.is_available else "unavailable"
        },
        "recent_donations": donation_history,
        "pending_matches": pending_matches_detail
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


@donor_bp.route("/donations", methods=["GET"])
@jwt_required()
def get_donations():
    """Get donor's donation history"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    donations = DonationHistory.query.filter_by(donor_id=donor.id)\
        .order_by(DonationHistory.donation_date.desc()).all()
    
    result = []
    for d in donations:
        hospital_name = None
        if d.hospital_id:
            hosp = Hospital.query.get(d.hospital_id)
            hospital_name = hosp.name if hosp else None
        
        result.append({
            "id": d.id,
            "donation_date": d.donation_date.isoformat() if d.donation_date else None,
            "hospital_name": hospital_name,
            "units": d.units,
            "request_id": d.request_id
        })
    
    return jsonify({"donations": result, "total": len(result)})


@donor_bp.route("/donations/<int:donation_id>", methods=["GET"])
@jwt_required()
def get_donation_details(donation_id):
    """Get detailed information about a specific donation"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    # Get the donation and verify it belongs to current donor
    donation = DonationHistory.query.filter_by(id=donation_id, donor_id=donor.id).first()
    if not donation:
        return jsonify({"error": "Donation not found"}), 404
    
    # Get hospital details
    hospital = None
    hospital_data = {}
    if donation.hospital_id:
        hospital = Hospital.query.get(donation.hospital_id)
        if hospital:
            hospital_data = {
                "id": hospital.id,
                "name": hospital.name,
                "address": hospital.address,
                "city": hospital.city,
                "district": hospital.district,
                "phone": hospital.contact_phone,
                "lat": None,  # Add when hospital model has lat/lng
                "lng": None
            }
    
    # Get request details if linked
    request_data = None
    if donation.request_id:
        from app.models import Request
        req = Request.query.get(donation.request_id)
        if req:
            request_data = {
                "urgency": req.urgency,
                "contact_person": req.contact_person,
                "contact_phone": req.contact_phone
            }
    
    # Count donation number for this donor
    donation_number = DonationHistory.query.filter_by(donor_id=donor.id)\
        .filter(DonationHistory.donation_date <= donation.donation_date)\
        .count()
    
    # Check for certificate
    certificate_url = None
    certificate_number = None
    # TODO: Query certificates table when implemented
    # cert = Certificate.query.filter_by(donation_id=donation.id).first()
    # if cert:
    #     certificate_url = cert.certificate_url
    #     certificate_number = cert.certificate_number
    
    # Get badges earned (if any)
    badges_earned = []
    # TODO: Query badges when implemented
    # donor_badges = DonorBadge.query.filter_by(donor_id=donor.id).all()
    # for db_badge in donor_badges:
    #     badge = Badge.query.get(db_badge.badge_id)
    #     if badge:
    #         badges_earned.append({
    #             "name": badge.name,
    #             "description": badge.description,
    #             "icon": badge.icon
    #         })
    
    return jsonify({
        "id": donation.id,
        "donation_date": donation.donation_date.isoformat() if donation.donation_date else None,
        "blood_group": donor.blood_group,
        "units": donation.units,
        "donation_type": "Whole Blood",  # Can be enhanced later
        "status": "completed",
        "donation_number": donation_number,
        "hospital_name": hospital_data.get("name") if hospital_data else None,
        "hospital_address": hospital_data.get("address") if hospital_data else None,
        "hospital_city": hospital_data.get("city") if hospital_data else None,
        "hospital_district": hospital_data.get("district") if hospital_data else None,
        "hospital_phone": hospital_data.get("phone") if hospital_data else None,
        "hospital_lat": hospital_data.get("lat") if hospital_data else None,
        "hospital_lng": hospital_data.get("lng") if hospital_data else None,
        "contact_person": request_data.get("contact_person") if request_data else None,
        "contact_phone": request_data.get("contact_phone") if request_data else None,
        "certificate_url": certificate_url,
        "certificate_number": certificate_number,
        "badges_earned": badges_earned,
        "notes": None,  # Can add notes field to DonationHistory model
        "created_at": donation.created_at.isoformat() if hasattr(donation, 'created_at') and donation.created_at else None
    })


@donor_bp.route("/donations", methods=["POST"])
@jwt_required()
def record_donation():
    """Record a new donation"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    data = request.get_json() or {}
    hospital_id = data.get("hospital_id")
    units = data.get("units", 1)
    request_id = data.get("request_id")
    donation_date = data.get("donation_date")
    
    if donation_date:
        try:
            donation_date = datetime.fromisoformat(donation_date)
        except Exception:
            donation_date = datetime.utcnow()
    else:
        donation_date = datetime.utcnow()
    
    donation = DonationHistory(
        donor_id=donor.id,
        hospital_id=hospital_id,
        request_id=request_id,
        units=units,
        donation_date=donation_date
    )
    
    # Update donor's last donation date
    donor.last_donation_date = donation_date.date()
    
    db.session.add(donation)
    db.session.commit()
    
    return jsonify({"message": "Donation recorded", "donation_id": donation.id}), 201


@donor_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    """Get donor notifications (matches + system messages)"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    # Get recent matches as notifications
    matches = Match.query.filter_by(donor_id=donor.id)\
        .filter(Match.status == 'pending')\
        .order_by(Match.matched_at.desc())\
        .limit(20).all()
    
    notifications = []
    for m in matches:
        req = m.request
        if req:
            hosp = Hospital.query.get(req.hospital_id) if req.hospital_id else None
            notifications.append({
                "id": f"match_{m.id}",
                "type": "match",
                "title": "New Blood Request Match",
                "message": f"You've been matched to a {req.blood_group} request at {hosp.name if hosp else 'a hospital'}",
                "created_at": m.matched_at.isoformat() if m.matched_at else None,
                "read": m.status != 'pending',
                "data": {
                    "match_id": m.id,
                    "request_id": req.id,
                    "blood_group": req.blood_group,
                    "urgency": req.urgency,
                    "hospital_name": hosp.name if hosp else None
                }
            })
    
    return jsonify({"notifications": notifications, "unread_count": len([n for n in notifications if not n['read']])})


@donor_bp.route("/notifications/<int:notification_id>/read", methods=["PUT"])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark a notification as read (placeholder - extend based on notification system)"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    # For now, notifications are based on matches, so this is a no-op
    # In future, implement a separate Notification model
    return jsonify({"message": "Notification marked as read"})


@donor_bp.route("/notifications/read-all", methods=["PUT"])
@jwt_required()
def mark_all_notifications_read():
    """Mark all notifications as read"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    # Placeholder for future notification system
    return jsonify({"message": "All notifications marked as read"})


@donor_bp.route("/me/certificates", methods=["GET"])
@jwt_required()
def get_donor_certificates():
    """Get all certificates for current donor"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    # TODO: Implement when Certificate model is ready
    # For now, return certificates based on completed donations
    donations = DonationHistory.query.filter_by(donor_id=donor.id)\
        .order_by(DonationHistory.donation_date.desc()).all()
    
    certificates = []
    for idx, donation in enumerate(donations, 1):
        hospital = None
        if donation.hospital_id:
            hospital = Hospital.query.get(donation.hospital_id)
        
        certificates.append({
            "id": donation.id,
            "certificate_number": f"CERT-{donor.id}-{donation.id}",
            "donation_id": donation.id,
            "donation_date": donation.donation_date.isoformat() if donation.donation_date else None,
            "hospital_name": hospital.name if hospital else "Unknown",
            "blood_group": donor.blood_group,
            "units": donation.units,
            "certificate_url": None,  # Will be populated when cloud storage is integrated
            "generated_at": donation.donation_date.isoformat() if donation.donation_date else None
        })
    
    return jsonify({"certificates": certificates, "total": len(certificates)})


@donor_bp.route("/me/badges", methods=["GET"])
@jwt_required()
def get_donor_badges():
    """Get all badges (earned and locked) for current donor"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    # Count total donations
    total_donations = DonationHistory.query.filter_by(donor_id=donor.id).count()
    
    # Define badge requirements
    badge_definitions = [
        {"id": 1, "name": "First Drop", "description": "Complete your first donation", "icon": "🩸", "requirement": 1},
        {"id": 2, "name": "Life Saver", "description": "Complete 5 donations", "icon": "💉", "requirement": 5},
        {"id": 3, "name": "Blood Hero", "description": "Complete 10 donations", "icon": "🦸", "requirement": 10},
        {"id": 4, "name": "Champion Donor", "description": "Complete 25 donations", "icon": "🏆", "requirement": 25},
        {"id": 5, "name": "Legend", "description": "Complete 50 donations", "icon": "⭐", "requirement": 50},
        {"id": 6, "name": "Century Donor", "description": "Complete 100 donations", "icon": "💯", "requirement": 100},
    ]
    
    badges = []
    for badge_def in badge_definitions:
        earned = total_donations >= badge_def["requirement"]
        earned_date = None
        
        if earned:
            # Find the donation that unlocked this badge
            nth_donation = DonationHistory.query.filter_by(donor_id=donor.id)\
                .order_by(DonationHistory.donation_date.asc())\
                .offset(badge_def["requirement"] - 1)\
                .first()
            if nth_donation:
                earned_date = nth_donation.donation_date.isoformat()
        
        badges.append({
            "id": badge_def["id"],
            "name": badge_def["name"],
            "description": badge_def["description"],
            "icon": badge_def["icon"],
            "earned": earned,
            "earned_at": earned_date,
            "requirement": badge_def["requirement"],
            "progress": min(total_donations, badge_def["requirement"]),
            "locked": not earned
        })
    
    earned_count = sum(1 for badge in badges if badge["earned"])
    
    return jsonify({
        "badges": badges,
        "total": len(badges),
        "earned": earned_count,
        "locked": len(badges) - earned_count
    })


@donor_bp.route("/profile-picture", methods=["POST"])
@jwt_required()
def upload_profile_picture():
    """Upload donor profile picture"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    if 'profile_picture' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['profile_picture']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # For now, save locally (in production, use S3 or similar)
    # This is a placeholder - implement actual file upload logic
    import os
    from werkzeug.utils import secure_filename
    
    filename = secure_filename(file.filename)
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads/profile_pictures')
    os.makedirs(upload_folder, exist_ok=True)
    
    filepath = os.path.join(upload_folder, f"donor_{user.id}_{filename}")
    file.save(filepath)
    
    user.profile_pic_url = filepath
    db.session.commit()
    
    return jsonify({"message": "Profile picture uploaded", "url": filepath})


@donor_bp.route("/me", methods=["DELETE"])
@jwt_required()
def delete_account():
    """Delete donor account (soft delete)"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    # Soft delete: mark as deleted instead of removing from database
    user.status = "deleted"
    donor.is_available = False
    db.session.commit()
    
    return jsonify({"message": "Account deleted successfully"})


@donor_bp.route("/update-location", methods=["POST"])
@jwt_required()
def update_donor_location():
    """Update donor's geographic location automatically"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    data = request.get_json() or {}
    lat = data.get("lat")
    lng = data.get("lng")
    
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400
    
    # Update location
    donor.location_lat = lat
    donor.location_lng = lng
    donor.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        "message": "Location updated successfully",
        "location": {
            "lat": float(donor.location_lat),
            "lng": float(donor.location_lng)
        }
    })