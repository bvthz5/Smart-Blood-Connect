from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
from app.extensions import db
from app.models import User, Donor, OTPSession, HospitalStaff, RefreshToken
from .utils import generate_otp, otp_hash, verify_otp, hash_password, verify_password
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token
import logging
from app.config.email_config import EmailConfig

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
logger = logging.getLogger(__name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    phone = data.get("phone")
    password = data.get("password")
    name = data.get("name")
    email = data.get("email")
    blood_group = data.get("blood_group")

    if not phone or not password:
        return jsonify({"error":"phone and password required"}), 400

    # uniqueness check
    if User.query.filter((User.phone==phone)|(User.email==email)).first():
        return jsonify({"error":"user with phone/email exists"}), 409

    pw_hash = hash_password(password)
    user = User(name=name, email=email, phone=phone, password_hash=pw_hash, role="donor", is_verified=False)
    db.session.add(user)
    db.session.commit()

    # donor profile
    donor = Donor(user_id=user.id, blood_group=blood_group)
    db.session.add(donor)
    db.session.commit()

    # create OTP session
    otp = generate_otp()
    code_h = otp_hash(otp)
    expires = datetime.utcnow() + timedelta(minutes=current_app.config.get("ACCESS_EXPIRES_MINUTES", 5))
    otp_sess = OTPSession(user_id=user.id, otp_hash=code_h, channel="phone", destination=phone, expires_at=expires)
    db.session.add(otp_sess)
    db.session.commit()

    # Only log OTP in development environment for debugging
    if current_app.config.get('DEBUG', False):
        logger.info(f"DEV OTP for {phone}: {otp}")
    else:
        logger.info(f"OTP sent to {phone}")

    return jsonify({"user_id": user.id, "pending_otp": True, "masked_phone": (phone[:-4].replace(phone[:-4], "*"*max(0, len(phone[:-4]))) + phone[-4:])}), 201

@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp_route():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    otp = data.get("otp")
    sess = OTPSession.query.filter_by(user_id=user_id, channel="phone", used=False).order_by(OTPSession.created_at.desc()).first()
    if not sess:
        return jsonify({"error":"no otp session"}), 400
    if sess.expires_at < datetime.utcnow():
        return jsonify({"error":"otp expired"}), 400
    if not verify_otp(otp, sess.otp_hash):
        sess.attempts_left = (sess.attempts_left or 0) + 1
        db.session.commit()
        return jsonify({"error":"invalid otp"}), 400
    sess.used = True
    user = User.query.get(user_id)
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
    user = None
    if "@" in (ident or ""):
        user = User.query.filter_by(email=ident).first()
    else:
        user = User.query.filter_by(phone=ident).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({"error":"invalid credentials"}), 401
    
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
        return jsonify({"error":"not verified"}), 403

    access = create_access_token(identity=user.id, expires_delta=timedelta(minutes=current_app.config.get("ACCESS_EXPIRES_MINUTES", 15)))
    refresh = create_refresh_token(identity=user.id, expires_delta=timedelta(days=current_app.config.get("REFRESH_EXPIRES_DAYS", 7)))
    # TODO: Implement refresh token storage with new schema
    return jsonify({"access_token": access, "refresh_token": refresh, "user": {"id": user.id, "name": user.first_name}})

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
    access = create_access_token(identity=user.id, expires_delta=timedelta(minutes=current_app.config.get("ACCESS_EXPIRES_MINUTES", 15)))
    refresh = create_refresh_token(identity=user.id, expires_delta=timedelta(days=current_app.config.get("REFRESH_EXPIRES_DAYS", 7)))
    
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
        RefreshToken.query.filter_by(user_id=user.id).update({"revoked": True})
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
    RefreshToken.query.filter_by(user_id=user.id).update({"revoked": True})
    db.session.commit()
    return jsonify({"message":"password changed"}), 200

@auth_bp.route("/change-password", methods=["OPTIONS"])
def change_password_options():
    return jsonify({}), 200
