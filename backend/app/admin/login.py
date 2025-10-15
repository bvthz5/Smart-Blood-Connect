"""
Admin Authentication Routes
"""

"""
Admin Authentication Routes
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, decode_token
from app.models import User, RefreshToken
from app.extensions import db
from app.services.auth import verify_password, hash_password
from app.services.email_service import email_service
from app.config.email_config import EmailConfig
from datetime import timedelta, datetime
import secrets

admin_auth_bp = Blueprint("admin_auth", __name__, url_prefix="/admin/auth")

@admin_auth_bp.route("/forgot-password", methods=["POST"])
def admin_forgot_password():
    """Send admin password reset email with time-limited link"""
    import logging
    logger = logging.getLogger(__name__)
    
    data = request.get_json() or {}
    email = data.get("email")
    
    logger.info(f"[ADMIN FORGOT PASSWORD] Request received for email: {email}")
    
    if not email:
        logger.warning("[ADMIN FORGOT PASSWORD] No email provided")
        return jsonify({"message": "If account exists, password reset instructions have been sent"}), 200
    
    user = User.query.filter_by(email=email, role="admin").first()
    
    # Always respond generically
    if not user:
        logger.info(f"[ADMIN FORGOT PASSWORD] No admin user found for email: {email}")
        return jsonify({"message": "If account exists, password reset instructions have been sent"}), 200

    try:
        logger.info(f"[ADMIN FORGOT PASSWORD] Admin user found: {user.id}")
        
        minutes = int(current_app.config.get("RESET_EXPIRES_MINUTES", 15))
        logger.info(f"[ADMIN FORGOT PASSWORD] Token expiry minutes: {minutes}")
        
        reset_token = create_access_token(identity=str(user.id), additional_claims={"pr": "admin_reset"}, expires_delta=timedelta(minutes=minutes))
        logger.info(f"[ADMIN FORGOT PASSWORD] Reset token created")
        
        base = getattr(EmailConfig, 'FRONTEND_URL', 'http://localhost:3000')
        reset_link = f"{base}/admin/reset-password?token={reset_token}"
        logger.info(f"[ADMIN FORGOT PASSWORD] Reset link: {reset_link}")
        
        logger.info(f"[ADMIN FORGOT PASSWORD] SMTP Config - Server: {EmailConfig.SMTP_SERVER}, Port: {EmailConfig.SMTP_PORT}, SSL: {EmailConfig.SMTP_USE_SSL}, TLS: {EmailConfig.SMTP_USE_TLS}")
        logger.info(f"[ADMIN FORGOT PASSWORD] Sender: {EmailConfig.SENDER_EMAIL}, Name: {EmailConfig.SENDER_NAME}")
        
        email_sent = email_service.send_password_reset_email(email, reset_link, (user.first_name or "User"))
        
        if email_sent:
            logger.info(f"[ADMIN FORGOT PASSWORD] Email sent successfully to {email}")
        else:
            logger.error(f"[ADMIN FORGOT PASSWORD] Email sending failed for {email}")
            
    except Exception as e:
        # Log the error but respond generically
        logger.error(f"[ADMIN FORGOT PASSWORD] Exception occurred: {str(e)}", exc_info=True)
        
    return jsonify({"message": "If account exists, password reset instructions have been sent"}), 200


@admin_auth_bp.route("/reset-password", methods=["POST"])
def admin_reset_password():
    """Reset admin password using token"""
    import logging
    logger = logging.getLogger(__name__)
    
    data = request.get_json() or {}
    token = data.get("token")
    new_password = data.get("new_password")
    
    logger.info(f"[ADMIN RESET PASSWORD] Request received")
    logger.info(f"[ADMIN RESET PASSWORD] Token present: {bool(token)}")
    logger.info(f"[ADMIN RESET PASSWORD] Password present: {bool(new_password)}")
    
    if not token or not new_password:
        logger.warning(f"[ADMIN RESET PASSWORD] Missing required fields - token: {bool(token)}, password: {bool(new_password)}")
        return jsonify({"error": "token and new_password required"}), 400
    try:
        decoded = decode_token(token)
        logger.info(f"[ADMIN RESET PASSWORD] Token decoded successfully")
    except Exception as e:
        logger.error(f"[ADMIN RESET PASSWORD] Token decode failed: {str(e)}")
        return jsonify({"error": "invalid or expired token"}), 400
    if decoded.get("type") != "access":
        logger.error(f"[ADMIN RESET PASSWORD] Invalid token type: {decoded.get('type')}")
        return jsonify({"error": "invalid token type"}), 400
    
    # Check for 'pr' claim in both claims object and main token body
    claims = decoded.get("claims") or {}
    pr_claim = claims.get("pr") or decoded.get("pr")
    
    if pr_claim != "admin_reset":
        logger.error(f"[ADMIN RESET PASSWORD] Invalid reset token claim: {pr_claim}")
        return jsonify({"error": "invalid reset token"}), 400
    user_id = decoded.get("sub")
    logger.info(f"[ADMIN RESET PASSWORD] User ID from token: {user_id}")
    try:
        user_id = int(user_id) if user_id is not None else None
    except (TypeError, ValueError):
        logger.error(f"[ADMIN RESET PASSWORD] Invalid user ID format: {user_id}")
        return jsonify({"error": "invalid user id in token"}), 400
    user = User.query.filter_by(id=user_id, role="admin").first()
    if not user:
        logger.error(f"[ADMIN RESET PASSWORD] Admin user not found: {user_id}")
        return jsonify({"error": "user not found"}), 404
    logger.info(f"[ADMIN RESET PASSWORD] Updating password for user: {user.email}")
    user.password_hash = hash_password(new_password)
    try:
        # Revoke admin refresh tokens
        RefreshToken.query.filter_by(user_id=user.id).update({"revoked": True, "revoked_at": datetime.utcnow()})
        db.session.commit()
        logger.info(f"[ADMIN RESET PASSWORD] Password updated successfully for user: {user.email}")
    except Exception as e:
        db.session.rollback()
        logger.error(f"[ADMIN RESET PASSWORD] Database error: {str(e)}")
        return jsonify({"error": "failed to update password"}), 500
    return jsonify({"message": "password updated"}), 200

@admin_auth_bp.route("/login", methods=["OPTIONS"])
def admin_login_options():
    """Handle CORS preflight requests"""
    response = jsonify({})
    # CORS headers are handled globally, no need to set them here
    return response

@admin_auth_bp.route("/login", methods=["POST"])
def admin_login():
    """
    Admin Login
    ---
    tags:
      - Admin
    summary: Authenticate admin user
    description: Login endpoint for admin users to access the admin dashboard
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: credentials
        description: Admin login credentials
        required: true
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              format: email
              example: admin@smartblood.com
              description: Admin email address
            password:
              type: string
              format: password
              example: Admin@123
              description: Admin password
    responses:
      200:
        description: Login successful
        schema:
          type: object
          properties:
            message:
              type: string
              example: Login successful
            admin:
              type: object
              properties:
                id:
                  type: integer
                  example: 1
                name:
                  type: string
                  example: Admin User
                email:
                  type: string
                  example: admin@smartblood.com
                role:
                  type: string
                  example: admin
            access_token:
              type: string
              example: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
              description: JWT access token for authenticated requests
            token_type:
              type: string
              example: bearer
      401:
        description: Invalid credentials
        schema:
          type: object
          properties:
            error:
              type: string
              example: Invalid email or password
      400:
        description: Missing required fields
        schema:
          type: object
          properties:
            error:
              type: string
              example: Email and password are required
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body is required"}), 400
            
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Find admin user
        admin_user = User.query.filter_by(email=email, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Invalid email or password"}), 401
            
        # Verify password (hash, password)
        if not verify_password(admin_user.password_hash, password):
            return jsonify({"error": "Invalid email or password"}), 401
            
        # Check if user is active
        if admin_user.status != "active":
            return jsonify({"error": "Account is deactivated"}), 401
        
        # Create JWT access token using configured expiry
        access_minutes = int(current_app.config.get("ACCESS_EXPIRES_MINUTES", 60))
        access_token = create_access_token(
            identity=str(admin_user.id),
            expires_delta=timedelta(minutes=access_minutes),
            additional_claims={"role": "admin"}
        )
        
        # Create refresh token
        refresh_days = int(current_app.config.get("REFRESH_EXPIRES_DAYS", 7))
        refresh_token_value = secrets.token_urlsafe(32)
        refresh_token_expires = datetime.utcnow() + timedelta(days=refresh_days)
        
        # Store refresh token in database
        refresh_token = RefreshToken(
            user_id=admin_user.id,
            token=refresh_token_value,
            expires_at=refresh_token_expires
        )
        db.session.add(refresh_token)
        
        # Update last login
        admin_user.last_login = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "message": "Login successful",
            "admin": {
                "id": admin_user.id,
                "name": f"{admin_user.first_name} {admin_user.last_name}".strip(),
                "email": admin_user.email,
                "role": admin_user.role
            },
            "access_token": access_token,
            "refresh_token": refresh_token_value,
            "token_type": "bearer",
            "expires_in": access_minutes * 60
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@admin_auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def admin_logout():
    """
    Admin Logout
    ---
    tags:
      - Admin
    summary: Logout admin user
    description: Logout endpoint for admin users (token will be invalidated on client side)
    security:
      - Bearer: []
    produces:
      - application/json
    responses:
      200:
        description: Logout successful
        schema:
          type: object
          properties:
            message:
              type: string
              example: Logout successful
      401:
        description: Unauthorized - Invalid or missing JWT token
        schema:
          type: object
          properties:
            error:
              type: string
              example: Unauthorized
    """
    try:
        current_user_id = get_jwt_identity()
        
        # In a real application, you might want to blacklist the token
        # For now, we'll just return a success message
        # The client should remove the token from storage
        
        return jsonify({
            "message": "Logout successful"
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@admin_auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_admin_profile():
    """
    Get Admin Profile
    ---
    tags:
      - Admin
    summary: Get current admin user profile
    description: Retrieve the profile information of the currently authenticated admin user
    security:
      - Bearer: []
    produces:
      - application/json
    responses:
      200:
        description: Admin profile retrieved successfully
        schema:
          type: object
          properties:
            admin:
              type: object
              properties:
                id:
                  type: integer
                  example: 1
                name:
                  type: string
                  example: Admin User
                email:
                  type: string
                  example: admin@smartblood.com
                role:
                  type: string
                  example: admin
                phone:
                  type: string
                  example: +91-9876543210
                created_at:
                  type: string
                  format: date-time
                  example: "2024-01-01T00:00:00Z"
                last_login:
                  type: string
                  format: date-time
                  example: "2024-01-01T12:00:00Z"
      401:
        description: Unauthorized - Invalid or missing JWT token
        schema:
          type: object
          properties:
            error:
              type: string
              example: Unauthorized
      404:
        description: Admin user not found
        schema:
          type: object
          properties:
            error:
              type: string
              example: Admin user not found
    """
    try:
        current_user_id = get_jwt_identity()
        
        admin_user = User.query.filter_by(id=current_user_id, role="admin").first()
        
        if not admin_user:
            return jsonify({"error": "Admin user not found"}), 404
        
        return jsonify({
            "admin": {
                "id": admin_user.id,
                "name": f"{admin_user.first_name} {admin_user.last_name}".strip(),
                "email": admin_user.email,
                "role": admin_user.role,
                "phone": admin_user.phone,
                "created_at": admin_user.created_at.isoformat() if admin_user.created_at else None,
                "last_login": admin_user.last_login.isoformat() if admin_user.last_login else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@admin_auth_bp.route("/refresh", methods=["POST"])
def refresh_token():
    """
    Refresh Access Token
    ---
    tags:
      - Admin
    summary: Refresh access token using refresh token
    description: Get a new access token using a valid refresh token
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: refresh_token
        description: Refresh token
        required: true
        schema:
          type: object
          required:
            - refresh_token
          properties:
            refresh_token:
              type: string
              description: Valid refresh token
    responses:
      200:
        description: Token refreshed successfully
        schema:
          type: object
          properties:
            access_token:
              type: string
              description: New access token
            token_type:
              type: string
              example: bearer
            expires_in:
              type: integer
              example: 3600
      401:
        description: Invalid or expired refresh token
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body is required"}), 400
            
        refresh_token_value = data.get("refresh_token")
        
        if not refresh_token_value:
            return jsonify({"error": "Refresh token is required"}), 400
        
        # Find valid refresh token
        refresh_token = RefreshToken.query.filter_by(
            token=refresh_token_value,
            revoked=False
        ).first()
        
        if not refresh_token:
            return jsonify({"error": "Invalid refresh token"}), 401
            
        # Check if refresh token is expired
        if refresh_token.expires_at < datetime.utcnow():
            # Mark as revoked
            refresh_token.revoked = True
            refresh_token.revoked_at = datetime.utcnow()
            db.session.commit()
            return jsonify({"error": "Refresh token expired"}), 401
        
        # Get user
        user = User.query.filter_by(id=refresh_token.user_id, role="admin").first()
        
        if not user or user.status != "active":
            return jsonify({"error": "User not found or inactive"}), 401
        
        # Create new access token with configured expiry
        access_minutes = int(current_app.config.get("ACCESS_EXPIRES_MINUTES", 60))
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(minutes=access_minutes),
            additional_claims={"role": "admin"}
        )
        
        return jsonify({
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": access_minutes * 60
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

@admin_auth_bp.route("/sessions", methods=["GET"])
@jwt_required()
def list_sessions():
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(id=current_user_id, role="admin").first()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    tokens = (
        RefreshToken.query
        .filter_by(user_id=user.id)
        .order_by(RefreshToken.created_at.desc())
        .all()
    )
    items = []
    for t in tokens:
        items.append({
            "id": t.id,
            "revoked": t.revoked,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "expires_at": t.expires_at.isoformat() if t.expires_at else None
        })
    return jsonify({"sessions": items}), 200

@admin_auth_bp.route("/sessions/revoke-all", methods=["POST"])
@jwt_required()
def revoke_all_sessions():
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(id=current_user_id, role="admin").first()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        RefreshToken.query.filter_by(user_id=user.id, revoked=False).update({"revoked": True, "revoked_at": datetime.utcnow()})
        db.session.commit()
        return jsonify({"message": "All sessions revoked"}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to revoke sessions"}), 500

@admin_auth_bp.route("/sessions/revoke-one", methods=["POST"])
@jwt_required()
def revoke_one_session():
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(id=current_user_id, role="admin").first()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    session_id = data.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id required"}), 400
    try:
        token_row = RefreshToken.query.filter_by(id=session_id, user_id=user.id).first()
        if not token_row:
            return jsonify({"error": "Session not found"}), 404
        if not token_row.revoked:
            token_row.revoked = True
            token_row.revoked_at = datetime.utcnow()
            db.session.commit()
        return jsonify({"message": "Session revoked"}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to revoke session"}), 500
