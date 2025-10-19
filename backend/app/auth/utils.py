import hmac
import hashlib
from functools import wraps
from flask import current_app, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from passlib.hash import bcrypt
from werkzeug.security import generate_password_hash, check_password_hash

def generate_otp(length=6):
    import random
    start = 10**(length-1)
    return str(random.randint(start, start*10 - 1))

def otp_hash(otp: str):
    # HMAC-based deterministic hash using OTP_SECRET
    key = current_app.config.get("OTP_SECRET", "otp-secret")
    return hmac.new(key.encode(), otp.encode(), hashlib.sha256).hexdigest()

def verify_otp(otp: str, hashed: str):
    return hmac.compare_digest(otp_hash(otp), hashed)

def hash_password(password: str):
    """Hash password using werkzeug for compatibility with existing system"""
    return generate_password_hash(password)

def verify_password(password: str, hashed: str):
    """Verify password against werkzeug hashes (scrypt/pbkdf2) and bcrypt for backward compatibility"""
    try:
        # Try werkzeug first (scrypt/pbkdf2 - used by admin and existing users)
        return check_password_hash(hashed, password)
    except Exception:
        try:
            # Try bcrypt (new format)
            return bcrypt.verify(password, hashed)
        except Exception:
            # If both fail, return False
            return False

def check_user_status(fn):
    """
    Decorator to check if user is blocked before allowing access to protected routes
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            
            # Import here to avoid circular imports
            from app.models import User
            
            user = User.query.get(current_user_id)
            
            if not user:
                return jsonify({
                    "success": False,
                    "error": "User not found",
                    "message": "Your account could not be found"
                }), 404
            
            if user.status == 'blocked':
                return jsonify({
                    "success": False,
                    "error": "Account blocked",
                    "message": "Your account has been blocked by an administrator. Please contact support for assistance.",
                    "blocked": True
                }), 403
            
            return fn(*args, **kwargs)
        except Exception as e:
            return jsonify({
                "success": False,
                "error": "Authorization failed",
                "message": str(e)
            }), 401
    
    return wrapper
