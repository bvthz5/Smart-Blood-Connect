from flask import Blueprint, jsonify, request, current_app, send_file
from app.extensions import db
from app.models import User, Donor, Match, DonationHistory, Hospital, MatchPrediction, ModelPredictionLog
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import os
from app.utils.id_encoder import encode_id, decode_id, IDEncodingError
from app.ml.feature_builder import FeatureBuilder
from app.ml.model_client import model_client

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

    # ML-Powered Insights
    ml_insights = {}
    try:
        # Predict donor availability
        availability_features = FeatureBuilder.build_availability_features(donor)
        availability_df = FeatureBuilder.features_to_dataframe(availability_features)
        availability_pred, _ = model_client.predict_proba('donor_availability', availability_df)
        availability_prob = float(availability_pred[0][1]) if len(availability_pred) > 0 else 0.5
        
        # Calculate AI reliability index
        ml_insights = {
            "ai_availability_score": round(availability_prob, 3),
            "ai_reliability_index": round(float(donor.reliability_score or 0.5), 3),
            "predicted_response_time": 12.0,  # Default, can be enhanced with actual prediction
            "match_success_rate": 85.0,  # Can be calculated from historical data
            "demand_forecast_area": user.district or "Not Available"
        }
        
        # Log ML prediction
        log_entry = ModelPredictionLog(
            model_name='donor_availability',
            model_version='1.0.0',
            endpoint='/api/donors/dashboard',
            input_data={'donor_id': donor.id},
            prediction_output={'availability_score': availability_prob},
            inference_time_ms=50.0,
            success=True
        )
        db.session.add(log_entry)
        db.session.commit()
        
    except Exception as e:
        current_app.logger.warning(f"ML insights failed for donor {donor.id}: {str(e)}")
        ml_insights = {
            "ai_availability_score": 0.5,
            "ai_reliability_index": round(float(donor.reliability_score or 0.5), 3),
            "predicted_response_time": 24.0,
            "match_success_rate": 75.0,
            "demand_forecast_area": user.district or "Not Available"
        }

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
        "pending_matches": pending_matches_detail,
        "ml_insights": ml_insights
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
                "phone": hospital.phone,  # Fixed: use hospital.phone not hospital.contact_phone
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
    
    # Check for certificate (now stored in DonationHistory)
    certificate_url = None
    certificate_number = donation.certificate_number
    if donation.certificate_url:
        # Return relative URL path for frontend
        certificate_url = f"/api/donors/certificates/{os.path.basename(donation.certificate_url)}"
    certificate_generated_at = donation.certificate_generated_at.isoformat() if donation.certificate_generated_at else None
    
    # Calculate next eligible donation date
    donor_gender = donor.gender.lower() if donor.gender else None
    waiting_days = 90 if donor_gender == 'male' else 120 if donor_gender == 'female' else 90
    next_eligible_date = donation.donation_date + timedelta(days=waiting_days)
    
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
        "certificate_generated_at": certificate_generated_at,
        "next_eligible_date": next_eligible_date.isoformat() if next_eligible_date else None,
        "waiting_period_days": waiting_days,
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


@donor_bp.route("/donations/<int:donation_id>/certificate", methods=["POST"])
@jwt_required()
def generate_certificate(donation_id):
    """Generate certificate for a donation"""
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    # Get the donation and verify it belongs to current donor
    donation = DonationHistory.query.filter_by(id=donation_id, donor_id=donor.id).first()
    if not donation:
        return jsonify({"error": "Donation not found"}), 404
    
    # Check if certificate already exists
    if donation.certificate_url and donation.certificate_number:
        return jsonify({
            "message": "Certificate already exists",
            "certificate_url": f"/api/donors/certificates/{os.path.basename(donation.certificate_url)}",
            "certificate_number": donation.certificate_number
        }), 200
    
    # Get hospital details
    hospital = Hospital.query.get(donation.hospital_id) if donation.hospital_id else None
    
    # Calculate next eligible donation date
    # Standard waiting periods: 90 days for males, 120 days for females
    donation_date = donation.donation_date
    donor_gender = donor.gender.lower() if donor.gender else None
    
    if donor_gender == 'male':
        waiting_days = 90
    elif donor_gender == 'female':
        waiting_days = 120
    else:
        waiting_days = 90  # Default to male waiting period
    
    next_eligible_date = donation_date + timedelta(days=waiting_days)
    
    # Prepare donation data for certificate generation
    from app.services.certificate_service import get_certificate_service
    cert_service = get_certificate_service()
    
    donor_name = f"{user.first_name} {user.last_name or ''}".strip()
    
    donation_data = {
        'donor_name': donor_name,
        'donor_id': donor.id,
        'blood_group': donor.blood_group,
        'donation_date': donation.donation_date,
        'hospital_name': hospital.name if hospital else 'Unknown Hospital',
        'hospital_city': hospital.city if hospital else '',
        'hospital_district': hospital.district if hospital else '',
        'units': donation.units,
        'donation_id': donation.id,
        'hospital_id': donation.hospital_id or 0,
        'next_eligible_date': next_eligible_date,
        'gender': donor_gender
    }
    
    try:
        # Generate certificate PDF
        filename, certificate_number = cert_service.generate_certificate_pdf(donation_data)
        
        # Update donation record with certificate info
        donation.certificate_number = certificate_number
        donation.certificate_url = filename  # Store just filename, not full path
        donation.certificate_generated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "message": "Certificate generated successfully",
            "certificate_url": f"/api/donors/certificates/{filename}",
            "certificate_number": certificate_number
        }), 201
        
    except Exception as e:
        current_app.logger.exception("Failed to generate certificate")
        return jsonify({"error": "Failed to generate certificate", "details": str(e)}), 500


@donor_bp.route("/certificates/<filename>", methods=["GET"])
def download_certificate(filename):
    """Download certificate PDF file"""
    try:
        from app.services.certificate_service import get_certificate_service
        cert_service = get_certificate_service()
        
        # Get full path to certificate
        filepath = cert_service.get_certificate_path(filename)
        
        if not os.path.exists(filepath):
            return jsonify({"error": "Certificate not found"}), 404
        
        # Send file with proper MIME type and download disposition
        return send_file(
            filepath,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        current_app.logger.exception("Failed to download certificate")
        return jsonify({"error": "Failed to download certificate"}), 500


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


@donor_bp.route("/accept-request/<int:match_id>", methods=["GET"])
def accept_blood_request(match_id):
    """
    Accept a blood request (via email link or direct access)
    """
    try:
        # Get match
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Request not found"}), 404
        
        # Verify token if provided
        token = request.args.get('token')
        if token and match.notes and f"token:{token}" not in match.notes:
            return jsonify({"error": "Invalid token"}), 401
        
        # Update match status
        match.status = 'accepted'
        match.confirmed_at = datetime.utcnow()
        
        # Update request status if it's still pending
        blood_request = Request.query.get(match.request_id)
        if blood_request and blood_request.status == 'pending':
            blood_request.status = 'in_progress'
        
        db.session.commit()
        
        # Send notification to admin/hospital
        try:
            from app.services.email_service import email_service
            from flask import current_app
            
            # Get donor and request info
            donor = Donor.query.get(match.donor_id)
            request_obj = Request.query.get(match.request_id)
            hospital = Hospital.query.get(request_obj.hospital_id) if request_obj.hospital_id else None
            
            if request_obj:
                # Notify hospital staff if exists
                if hospital and hospital.email:
                    email_html = f"""
                    <h2>Donor Accepted Blood Request</h2>
                    <p>A donor has accepted your blood request:</p>
                    <ul>
                        <li>Donor: {donor.user.first_name} {donor.user.last_name if donor.user.last_name else ''}</li>
                        <li>Patient: {request_obj.patient_name}</li>
                        <li>Blood Group: {request_obj.blood_group}</li>
                        <li>Units Needed: {request_obj.units_required}</li>
                        <li>Hospital: {hospital.name if hospital else 'N/A'}</li>
                    </ul>
                    <p>Please coordinate with the donor for the donation process.</p>
                    <p><small>Smart Blood Connect</small></p>
                    """
                    
                    email_service.send_email(
                        to=hospital.email,
                        subject=f'Donor Accepted: {request_obj.blood_group} Blood Request for {request_obj.patient_name}',
                        html=email_html
                    )
                
                # Notify admin
                admin_email = current_app.config.get('ADMIN_EMAIL')
                if admin_email:
                    email_html = f"""
                    <h2>Donor Accepted Blood Request</h2>
                    <p>A donor has accepted a blood request:</p>
                    <ul>
                        <li>Donor: {donor.user.first_name} {donor.user.last_name if donor.user.last_name else ''}</li>
                        <li>Patient: {request_obj.patient_name}</li>
                        <li>Blood Group: {request_obj.blood_group}</li>
                        <li>Units Needed: {request_obj.units_required}</li>
                        <li>Hospital: {hospital.name if hospital else 'N/A'}</li>
                    </ul>
                    <p><small>Smart Blood Connect</small></p>
                    """
                    
                    email_service.send_email(
                        to=admin_email,
                        subject=f'Donor Accepted: {request_obj.blood_group} Blood Request',
                        html=email_html
                    )
        except Exception as e:
            current_app.logger.error(f"Failed to send acceptance notification: {str(e)}")
        
        return jsonify({
            "message": "Request accepted successfully",
            "match_id": match_id,
            "status": "accepted"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to accept request: {str(e)}")
        return jsonify({"error": "Failed to accept request"}), 500


@donor_bp.route("/reject-request/<int:match_id>", methods=["GET"])
def reject_blood_request(match_id):
    """
    Reject a blood request (via email link or direct access)
    """
    try:
        # Get match
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Request not found"}), 404
        
        # Verify token if provided
        token = request.args.get('token')
        if token and match.notes and f"token:{token}" not in match.notes:
            return jsonify({"error": "Invalid token"}), 401
        
        # Update match status
        match.status = 'declined'
        
        # Update request status if needed
        blood_request = Request.query.get(match.request_id)
        
        db.session.commit()
        
        # Send notification to admin/hospital
        try:
            from app.services.email_service import email_service
            from flask import current_app
            
            # Get donor and request info
            donor = Donor.query.get(match.donor_id)
            request_obj = Request.query.get(match.request_id)
            hospital = Hospital.query.get(request_obj.hospital_id) if request_obj.hospital_id else None
            
            if request_obj:
                # Notify hospital staff if exists
                if hospital and hospital.email:
                    email_html = f"""
                    <h2>Donor Declined Blood Request</h2>
                    <p>A donor has declined your blood request:</p>
                    <ul>
                        <li>Donor: {donor.user.first_name} {donor.user.last_name if donor.user.last_name else ''}</li>
                        <li>Patient: {request_obj.patient_name}</li>
                        <li>Blood Group: {request_obj.blood_group}</li>
                        <li>Units Needed: {request_obj.units_required}</li>
                        <li>Hospital: {hospital.name if hospital else 'N/A'}</li>
                    </ul>
                    <p>You may need to find another donor for this request.</p>
                    <p><small>Smart Blood Connect</small></p>
                    """
                    
                    email_service.send_email(
                        to=hospital.email,
                        subject=f'Donor Declined: {request_obj.blood_group} Blood Request for {request_obj.patient_name}',
                        html=email_html
                    )
                
                # Notify admin
                admin_email = current_app.config.get('ADMIN_EMAIL')
                if admin_email:
                    email_html = f"""
                    <h2>Donor Declined Blood Request</h2>
                    <p>A donor has declined a blood request:</p>
                    <ul>
                        <li>Donor: {donor.user.first_name} {donor.user.last_name if donor.user.last_name else ''}</li>
                        <li>Patient: {request_obj.patient_name}</li>
                        <li>Blood Group: {request_obj.blood_group}</li>
                        <li>Units Needed: {request_obj.units_required}</li>
                        <li>Hospital: {hospital.name if hospital else 'N/A'}</li>
                    </ul>
                    <p><small>Smart Blood Connect</small></p>
                    """
                    
                    email_service.send_email(
                        to=admin_email,
                        subject=f'Donor Declined: {request_obj.blood_group} Blood Request',
                        html=email_html
                    )
        except Exception as e:
            current_app.logger.error(f"Failed to send rejection notification: {str(e)}")
        
        return jsonify({
            "message": "Request declined successfully",
            "match_id": match_id,
            "status": "declined"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to reject request: {str(e)}")
        return jsonify({"error": "Failed to reject request"}), 500


@donor_bp.route("/analytics", methods=["GET"])
@jwt_required()
def donor_analytics():
    """
    ML-powered donor analytics endpoint
    Returns comprehensive analytics including predictions and insights
    """
    user, donor, err = _get_current_donor()
    if err:
        return err
    
    try:
        # Build comprehensive features
        availability_features = FeatureBuilder.build_availability_features(donor)
        availability_df = FeatureBuilder.features_to_dataframe(availability_features)
        
        # Get ML predictions
        availability_pred, avail_time = model_client.predict_proba('donor_availability', availability_df)
        availability_prob = float(availability_pred[0][1]) if len(availability_pred) > 0 else 0.5
        
        # Calculate historical metrics
        total_donations = DonationHistory.query.filter_by(donor_id=donor.id).count()
        completed_matches = Match.query.filter_by(donor_id=donor.id, status="accepted").count()
        total_matches = Match.query.filter_by(donor_id=donor.id).count()
        
        # Calculate success rate
        success_rate = (completed_matches / total_matches * 100) if total_matches > 0 else 0
        
        # Get recent activity
        recent_donations = DonationHistory.query.filter_by(donor_id=donor.id)\
            .order_by(DonationHistory.donation_date.desc()).limit(10).all()
        
        # Calculate average response time (mock for now)
        avg_response_time = 2.5  # hours
        
        analytics = {
            "donor_id": encode_id(donor.id),
            "ml_predictions": {
                "availability_score": round(availability_prob, 3),
                "predicted_response_time_hours": avg_response_time,
                "reliability_score": round(float(donor.reliability_score or 0.5), 3),
                "inference_time_ms": round(avail_time, 2)
            },
            "historical_metrics": {
                "total_donations": total_donations,
                "total_matches": total_matches,
                "completed_matches": completed_matches,
                "success_rate": round(success_rate, 2),
                "avg_response_time_hours": avg_response_time
            },
            "recent_activity": [
                {
                    "date": d.donation_date.isoformat(),
                    "hospital_id": d.hospital_id,
                    "units": d.units,
                    "status": "completed"
                } for d in recent_donations
            ],
            "recommendations": {
                "optimal_donation_times": ["Morning (8-10 AM)", "Evening (6-8 PM)"],
                "high_demand_areas": [user.district or "Your Area"],
                "improvement_suggestions": [
                    "Maintain consistent availability",
                    "Respond quickly to urgent requests",
                    "Keep profile information updated"
                ]
            }
        }
        
        # Log analytics request
        log_entry = ModelPredictionLog(
            model_name='donor_analytics',
            model_version='1.0.0',
            endpoint='/api/donors/analytics',
            input_data={'donor_id': donor.id},
            prediction_output={'analytics_generated': True},
            inference_time_ms=avail_time,
            success=True
        )
        db.session.add(log_entry)
        db.session.commit()
        
        return jsonify(analytics)
        
    except Exception as e:
        current_app.logger.error(f"Analytics generation failed for donor {donor.id}: {str(e)}")
        return jsonify({"error": "Failed to generate analytics"}), 500