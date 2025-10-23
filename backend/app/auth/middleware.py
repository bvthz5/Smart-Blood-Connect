"""Authentication middleware and decorators."""

from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from .token_store import TokenStore

def check_blocked_user():
    """Middleware to check if user is blocked."""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            user_id = int(get_jwt_identity())
            
            # Check if user is blocked
            if TokenStore.get_instance().is_user_blocked(user_id):
                return jsonify({
                    "error": "Account blocked",
                    "message": "Your account has been blocked. Please contact support.",
                    "blocked": True
                }), 403
                
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def admin_required():
    """Verify the JWT has an admin role claim."""
    def wrapper(fn):
        @wraps(fn)
        @check_blocked_user()
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") != "admin":
                return jsonify({"error": "Admin access required"}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper