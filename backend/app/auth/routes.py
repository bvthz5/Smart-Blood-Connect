from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
from app.extensions import db
from app.models import User, Donor, HospitalStaff
from .auth_token import TokenStore
from .otp_store import OTPStore
from .utils import generate_otp, otp_hash, verify_otp, hash_password, verify_password
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token
import logging
from app.config.email_config import EmailConfig
from app.services.email_service import email_service
from app.services.sms_service import sms_service

import re
from sqlalchemy import func

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
logger = logging.getLogger(__name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    phone = data.get("phone")
    password = data.get("password")
    name = (data.get("name") or "").strip()
    email = data.get("email")
    blood_group = data.get("blood_group")
    dob_str = data.get("date_of_birth")

    # Validate DOB: must be at least 18 years old
    if not dob_str:
        return jsonify({"error": "date_of_birth is required"}), 400
    try:
        dob = datetime.fromisoformat(dob_str).date() if isinstance(dob_str, str) else dob_str
    except Exception:
        return jsonify({"error": "Invalid date_of_birth format. Use YYYY-MM-DD."}), 400
    today = datetime.utcnow().date()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 18:
        return jsonify({"error": "You must be at least 18 years old to register as a donor."}), 400

    if not phone or not password:
        return jsonify({"error":"phone and password required"}), 400

    # uniqueness check
    if User.query.filter((User.phone==phone)|(User.email==email)).first():
        return jsonify({"error":"user with phone/email exists"}), 409

    # Split name into first/last
    first_name, last_name = (name.split(" ", 1) + [""])[:2] if name else ("Donor", "")

    pw_hash = hash_password(password)
    user = User(first_name=first_name, last_name=last_name, email=email, phone=phone, password_hash=pw_hash, role="donor", status="active")
    db.session.add(user)
    db.session.commit()

    # donor profile
    donor = Donor(user_id=user.id, blood_group=blood_group, date_of_birth=dob)
    db.session.add(donor)
    db.session.commit()

    # create OTP session
    otp = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=current_app.config.get("ACCESS_EXPIRES_MINUTES", 5))
    otp_store = OTPStore.get_instance()
    otp_key = otp_store.add_otp(user.id, "phone", phone, otp, expires)

    # Attempt to send initial OTP via SMS if Twilio is configured; otherwise log in DEBUG
    sent_initial = False
    try:
        ttl_min = int(current_app.config.get("ACCESS_EXPIRES_MINUTES", 5))
        sent_initial = sms_service.send_sms(phone, f"SmartBlood OTP: {otp}. Valid {ttl_min} min. Do not share.")
    except Exception as e:
        current_app.logger.error(f"Initial SMS send error: {e}")
        sent_initial = False

    if not sent_initial and current_app.config.get('DEBUG', False):
        logger.info(f"[DEV ONLY] Initial OTP for {phone}: {otp}")

    return jsonify({
        "user_id": user.id, 
        "pending_otp": True, 
        "masked_phone": (phone[:-4].replace(phone[:-4], "*"*max(0, len(phone[:-4]))) + phone[-4:]),
        "otp_key": otp_key
    }), 201

@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp_route():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    otp = data.get("otp")
    otp_key = data.get("otp_key")
    if not otp_key:
        return jsonify({"error": "otp_key required"}), 400
    
    otp_store = OTPStore.get_instance()
    if not otp_store.verify_otp(otp_key, otp):
        return jsonify({"error":"invalid or expired otp"}), 400
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error":"user not found"}), 404
    user.is_phone_verified = True
    db.session.commit()

    # create tokens
    access = create_access_token(identity=str(user.id), expires_delta=timedelta(minutes=current_app.config.get("ACCESS_EXPIRES_MINUTES", 15)))
    refresh = create_refresh_token(identity=str(user.id), expires_delta=timedelta(days=current_app.config.get("REFRESH_EXPIRES_DAYS", 7)))
    # TODO: Implement refresh token storage with new schema
    return jsonify({"access_token": access, "refresh_token": refresh, "user": {"id": user.id, "name": user.first_name}})

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    ident = data.get("email_or_phone")
    password = data.get("password")

    if not ident or not password:
        return jsonify({"error": "email_or_phone and password required"}), 400

    # Find user by email or phone
    if "@" in ident:
        user = User.query.filter_by(email=ident).first()
    else:
        user = User.query.filter_by(phone=ident).first()

    # Validate credentials
    if not user or not verify_password(password, user.password_hash):
        return jsonify({"error": "invalid credentials"}), 401

    # Enforce donor role for this endpoint
    if user.role != "donor":
        return jsonify({"error": "not a donor account"}), 403

    # Account status checks
    if user.status == 'deleted':
        return jsonify({
            "error": "account deleted",
            "message": "This account has been permanently deleted. Please contact support or create a new account."
        }), 403
    if user.status == 'blocked':
        return jsonify({
            "error": "account blocked",
            "message": "Your account has been blocked. Please contact support for assistance."
        }), 403

    # Require active accounts only
    if user.status != 'active':
        return jsonify({"error": "account not active"}), 403

    # Phone verification is mandatory
    if not user.is_phone_verified:
        return jsonify({"error": "phone not verified"}), 403

    # If logging in with email, require email verification
    if "@" in ident and not user.is_email_verified:
        return jsonify({"error": "email not verified"}), 403

    # Issue tokens
    access = create_access_token(identity=str(user.id), expires_delta=timedelta(minutes=current_app.config.get("ACCESS_EXPIRES_MINUTES", 15)))
    refresh = create_refresh_token(identity=str(user.id), expires_delta=timedelta(days=current_app.config.get("REFRESH_EXPIRES_DAYS", 7)))

    # Basic user info in response
    return jsonify({
        "access_token": access,
        "refresh_token": refresh,
        "user": {
            "id": user.id,
            "name": user.first_name,
            "role": user.role,
            "email": user.email,
            "phone": user.phone
        }
    })

@auth_bp.route("/seeker-login", methods=["POST"])
def seeker_login():
    """Seeker login endpoint - allows login for any user type (donor, staff, admin)"""
    data = request.get_json() or {}
    ident = data.get("email_or_phone")
    password = data.get("password")

    if not ident or not password:
        return jsonify({"error": "email_or_phone and password required"}), 400

    user = None
    if "@" in ident:
        user = User.query.filter_by(email=ident).first()
    else:
        user = User.query.filter_by(phone=ident).first()

    if not user or not verify_password(password, user.password_hash):
        return jsonify({"error": "invalid credentials"}), 401

    # Check if user is deleted
    if user.status == 'deleted':
        return jsonify({
            "error": "account deleted",
            "message": "This account has been permanently deleted. Please contact support or create a new account."
        }), 403

    # Check if user is blocked
    if user.status == 'blocked':
        return jsonify({
            "error": "account blocked",
            "message": "Your account has been blocked. Please contact support for assistance."
        }), 403

    if not user.is_phone_verified:
        return jsonify({"error": "account not verified"}), 403

    # Restrict seeker login to staff users only and fetch corresponding hospital
    if user.role != "staff":
        return jsonify({"error": "only hospital staff accounts can access seeker portal"}), 403

    staff = HospitalStaff.query.filter_by(user_id=user.id).first()
    if not staff:
        return jsonify({"error": "staff profile not found"}), 403
    if staff.status != "active":
        return jsonify({"error": "staff account is not active"}), 403

    # Create tokens
    access = create_access_token(identity=str(user.id), expires_delta=timedelta(minutes=current_app.config.get("ACCESS_EXPIRES_MINUTES", 15)))
    refresh = create_refresh_token(identity=str(user.id), expires_delta=timedelta(days=current_app.config.get("REFRESH_EXPIRES_DAYS", 7)))

    # Update last login timestamp
    try:
        user.last_login = datetime.utcnow()
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({
        "access_token": access,
        "refresh_token": refresh,
        "user": {
            "id": user.id,
            "name": user.first_name,
            "role": user.role,
            "email": user.email,
            "phone": user.phone,
            "hospital_id": staff.hospital_id
        }
    })

# TODO: Implement refresh endpoint with new schema
# @auth_bp.route("/refresh", methods=["POST"])
# def refresh():
#     # Refresh token functionality temporarily disabled
#     return jsonify({"error": "refresh tokens not implemented in new schema"}), 501

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    ident = data.get("email_or_phone")
    user = None
    if "@" in (ident or ""):
        user = User.query.filter_by(email=ident).first()
    else:
        user = User.query.filter_by(phone=ident).first()

    if user:
        # Email-based reset: send a time-limited reset link
        if "@" in ident:
            try:
                from app.services.email_service import email_service
                reset_token = create_access_token(identity=str(user.id), additional_claims={"pr": "reset"}, expires_delta=timedelta(minutes=current_app.config.get("RESET_EXPIRES_MINUTES", 15)))
                reset_link = f"{getattr(EmailConfig, 'FRONTEND_URL', 'http://localhost:3000')}/seeker/reset-password?token={reset_token}"
                email_sent = email_service.send_password_reset_email(ident, reset_link, (user.first_name or "User"))
                if email_sent:
                    logger.info(f"Password reset email sent to {ident}")
                else:
                    logger.error(f"Failed to send password reset email to {ident}")
            except Exception as e:
                logger.error(f"Error sending password reset email to {ident}: {str(e)}")
        else:
            # For phone numbers, log the request (SMS not implemented)
            logger.info(f"Password reset requested for phone {ident}")

    # Always return generic response for security
    return jsonify({"message": "If account exists, password reset instructions have been sent"}), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    token = data.get("token")
    new_password = data.get("new_password")
    if not token or not new_password:
        return jsonify({"error": "token and new_password required"}), 400
    try:
        decoded = decode_token(token)
    except Exception:
        return jsonify({"error": "invalid or expired token"}), 400
    if decoded.get("type") != "access":
        return jsonify({"error": "invalid token type"}), 400

    # Check for 'pr' claim in both claims object and main token body
    claims = decoded.get("claims") or {}
    pr_claim = claims.get("pr") or decoded.get("pr")

    if pr_claim != "reset":
        return jsonify({"error": "invalid reset token"}), 400
    user_id = decoded.get("sub")
    try:
        user_id = int(user_id) if user_id is not None else None
    except (TypeError, ValueError):
        return jsonify({"error": "invalid user id in token"}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404
    user.password_hash = hash_password(new_password)
    try:
        # Revoke existing refresh tokens on password change
        TokenStore.get_instance().revoke_all_user_tokens(user.id)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "failed to update password"}), 500
    return jsonify({"message": "password updated"}), 200

@auth_bp.route("/change-password", methods=["POST"])
def change_password():
    auth = request.headers.get("Authorization", "")
    # require bearer access token
    token = None
    if auth.startswith("Bearer "):
        token = auth.split(" ",1)[1]
    if not token:
        return jsonify({"error":"missing access token"}), 401
    try:
        decoded = decode_token(token)
    except Exception:
        return jsonify({"error":"invalid token"}), 401
    user_id = decoded.get("sub")
    try:
        user_id = int(user_id) if user_id is not None else None
    except (TypeError, ValueError):
        return jsonify({"error":"invalid token"}), 401
    user = User.query.get(user_id)
    data = request.get_json() or {}
    old = data.get("old_password")
    new = data.get("new_password")
    if not old or not new:
        return jsonify({"error":"old_password and new_password required"}), 400
    if not user:
        return jsonify({"error":"user not found"}), 404
    if not verify_password(old, user.password_hash):
        return jsonify({"error":"wrong old password"}), 400
    user.password_hash = hash_password(new)
    TokenStore.get_instance().revoke_all_user_tokens(user.id)
    db.session.commit()
    return jsonify({"message":"password changed"}), 200

@auth_bp.route("/change-password", methods=["OPTIONS"])

@auth_bp.route("/send-contact-otp", methods=["POST"])
def send_contact_otp():
    """Send OTP to a user's email or phone for verification.
    Body: { user_id, channel: "email"|"phone", destination? }
    If destination not provided, uses user's current email/phone.
    """
    data = request.get_json() or {}
    user_id = data.get("user_id")
    channel = (data.get("channel") or "").lower()
    destination = data.get("destination")

    if channel not in ("email", "phone"):
        return jsonify({"error": "invalid channel"}), 400
    try:
        user_id = int(user_id)
    except Exception:
        return jsonify({"error": "invalid user_id"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    if channel == "email":
        dest = destination or user.email
        if not dest:
            return jsonify({"error": "email not set"}), 400
    else:
        dest = destination or user.phone
        if not dest:
            return jsonify({"error": "phone not set"}), 400

    # Generate and persist OTP session
    code = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=current_app.config.get("RESET_EXPIRES_MINUTES", 15))
    otp_store = OTPStore.get_instance()
    otp_key = otp_store.add_otp(user.id, channel, dest, code, expires)

    # Send via channel: try real send first; if it fails and DEBUG is on, log and succeed with debug_code
    sent = False
    try:
        if channel == "email":
            sent = email_service.send_verification_code_email(dest, code, getattr(user, 'first_name', 'User'))
        else:
            ttl_min = int(current_app.config.get("RESET_EXPIRES_MINUTES", 15))
            sent = sms_service.send_sms(dest, f"SmartBlood OTP: {code}. Valid {ttl_min} min. Do not share.")
    except Exception as e:
        current_app.logger.error(f"OTP send error via {channel} to {dest}: {e}")
        sent = False

    if not sent:
        if current_app.config.get('DEBUG', False):
            current_app.logger.info(f"[DEV ONLY] OTP for {channel}:{dest} -> {code}")
        else:
            return jsonify({"error": "failed to send otp"}), 500

    # Mask destination in response
    def mask_email(e):
        try:
            name, domain = e.split("@", 1)
            return f"{name[0]}***@{domain}"
        except Exception:
            return "***"
    def mask_phone(p):
        return (p[:-4].replace(p[:-4], "*"*max(0, len(p[:-4]))) + p[-4:]) if isinstance(p, str) and len(p) >= 4 else "****"

    masked = mask_email(dest) if channel == "email" else mask_phone(dest)
    resp = {"message": "otp sent", "channel": channel, "masked": masked, "expires_in": int((expires - datetime.utcnow()).total_seconds())}
    if current_app.config.get('DEBUG', False):
        resp["debug_code"] = code
        resp["twilio_sent"] = bool(sent)
    return jsonify(resp), 200


@auth_bp.route("/verify-email-otp", methods=["POST"])
def verify_email_otp():
    """Verify latest email OTP for a user and mark email verified."""
    data = request.get_json() or {}
    user_id = data.get("user_id")
    otp = data.get("otp")
    try:
        user_id = int(user_id)
    except Exception:
        return jsonify({"error": "invalid user_id"}), 400

    otp_key = data.get("otp_key")
    if not otp_key:
        return jsonify({"error": "otp_key required"}), 400
        
    otp_store = OTPStore.get_instance()
    if not otp_store.verify_otp(otp_key, otp or ""):
        return jsonify({"error": "invalid or expired otp"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404
    user.is_email_verified = True
    db.session.commit()
    return jsonify({"message": "email verified"}), 200

def change_password_options():
    return jsonify({}), 200


@auth_bp.route("/check-availability", methods=["POST"])
def check_availability():
    """Check if email or phone already exist. Public endpoint for live validation."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    phone_raw = (data.get("phone") or "").strip()

    email_exists = False
    phone_exists = False

    # Email check (case-insensitive)
    if email:
        existing = db.session.query(User.id).filter(func.lower(User.email) == email).first()
        email_exists = existing is not None

    # Phone check: accept 10-digit; match common stored variants (+91, 91, 0 prefix)
    if phone_raw:
        digits = re.sub(r"\D", "", phone_raw)
        if digits:
            candidates = [digits, "+91" + digits, "91" + digits, "0" + digits]
            existing = db.session.query(User.id).filter(User.phone.in_(candidates)).first()
            phone_exists = existing is not None

    return jsonify({"email_exists": email_exists, "phone_exists": phone_exists}), 200
