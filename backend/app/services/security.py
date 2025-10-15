"""
Security utilities for SmartBlood Connect
Handles encryption, authentication, and API protection
"""

import jwt
import hashlib
import secrets
import base64
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from cryptography.fernet import Fernet
import os
import json

class SecurityManager:
    """Centralized security management"""
    
    def __init__(self, app=None):
        self.app = app
        self.encryption_key = None
        self.api_keys = {}
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize security manager with Flask app"""
        self.app = app
        
        # Generate or load encryption key
        self.encryption_key = app.config.get('ENCRYPTION_KEY')
        if not self.encryption_key:
            # Generate new key if not exists
            self.encryption_key = Fernet.generate_key()
            app.config['ENCRYPTION_KEY'] = self.encryption_key.decode()
        
        # Initialize Fernet cipher
        self.cipher = Fernet(self.encryption_key.encode() if isinstance(self.encryption_key, str) else self.encryption_key)
        
        # Load API keys from environment or database
        self._load_api_keys()
    
    def _load_api_keys(self):
        """Load API keys from environment variables"""
        # Default API keys for different access levels
        self.api_keys = {
            'homepage_read': os.getenv('API_KEY_HOMEPAGE_READ', 'homepage_read_key_12345'),
            'homepage_write': os.getenv('API_KEY_HOMEPAGE_WRITE', 'homepage_write_key_67890'),
            'admin_full': os.getenv('API_KEY_ADMIN_FULL', 'admin_full_key_abcdef'),
        }
    
    def encrypt_data(self, data):
        """Encrypt sensitive data"""
        try:
            if isinstance(data, dict):
                data = json.dumps(data)
            elif not isinstance(data, str):
                data = str(data)
            
            encrypted_data = self.cipher.encrypt(data.encode())
            return base64.b64encode(encrypted_data).decode()
        except Exception as e:
            current_app.logger.error(f"Encryption error: {e}")
            return None
    
    def decrypt_data(self, encrypted_data):
        """Decrypt sensitive data"""
        try:
            decoded_data = base64.b64decode(encrypted_data.encode())
            decrypted_data = self.cipher.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            current_app.logger.error(f"Decryption error: {e}")
            return None
    
    def generate_jwt_token(self, user_id, role, expires_in=3600):
        """Generate JWT token for user authentication"""
        payload = {
            'user_id': user_id,
            'role': role,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iss': 'smartblood-api'
        }
        
        secret_key = current_app.config.get('SECRET_KEY', 'default-secret-key')
        return jwt.encode(payload, secret_key, algorithm='HS256')
    
    def verify_jwt_token(self, token):
        """Verify and decode JWT token"""
        try:
            secret_key = current_app.config.get('SECRET_KEY', 'default-secret-key')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def verify_api_key(self, api_key, required_level):
        """Verify API key and check access level"""
        if not api_key:
            return False
        
        # Check if API key exists and has required level access
        for level, key in self.api_keys.items():
            if key == api_key and self._has_access_level(level, required_level):
                return True
        
        return False
    
    def _has_access_level(self, key_level, required_level):
        """Check if API key has required access level"""
        access_hierarchy = {
            'homepage_read': ['homepage_read'],
            'homepage_write': ['homepage_read', 'homepage_write'],
            'admin_full': ['homepage_read', 'homepage_write', 'admin_full']
        }
        
        return required_level in access_hierarchy.get(key_level, [])
    
    def hash_password(self, password):
        """Hash password using SHA-256 with salt"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{password_hash}"
    
    def verify_password(self, password, hashed_password):
        """Verify password against hash"""
        try:
            salt, stored_hash = hashed_password.split(':')
            password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
            return password_hash == stored_hash
        except:
            return False

# Global security manager instance
security_manager = SecurityManager()

def init_security(app):
    """Initialize security manager with Flask app"""
    security_manager.init_app(app)

# Authentication decorators
def jwt_required(f):
    """Decorator to require JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Authorization token is missing'}), 401
        
        try:
            payload = security_manager.verify_jwt_token(token)
            if payload is None:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Add user info to request context
            request.current_user = payload
            
        except Exception as e:
            return jsonify({'error': 'Token verification failed'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function

def api_key_required(required_level='homepage_read'):
    """Decorator to require API key authentication"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            api_key = request.headers.get('X-API-Key')
            
            if not api_key:
                return jsonify({'error': 'API key is required'}), 401
            
            if not security_manager.verify_api_key(api_key, required_level):
                return jsonify({'error': 'Invalid or insufficient API key'}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def rate_limit(max_requests=100, window_seconds=3600):
    """Decorator to implement rate limiting"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Simple in-memory rate limiting (in production, use Redis)
            client_ip = request.remote_addr
            current_time = datetime.utcnow()
            
            # Check rate limit (simplified implementation)
            # In production, implement proper rate limiting with Redis
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def validate_input(schema):
    """Decorator to validate input data"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.is_json:
                data = request.get_json()
                # Basic validation (implement proper schema validation)
                if not data:
                    return jsonify({'error': 'Invalid JSON data'}), 400
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def sanitize_data(data):
    """Sanitize input data to prevent injection attacks"""
    if isinstance(data, dict):
        return {k: sanitize_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    elif isinstance(data, str):
        # Basic HTML sanitization
        import html
        return html.escape(data)
    else:
        return data

def log_security_event(event_type, user_id=None, details=None):
    """Log security events for monitoring"""
    try:
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'user_id': user_id,
            'ip_address': request.remote_addr if request else None,
            'user_agent': request.headers.get('User-Agent') if request else None,
            'details': details
        }
        
        current_app.logger.info(f"Security Event: {json.dumps(log_data)}")
        
        # In production, send to security monitoring system
        # send_to_security_monitor(log_data)
        
    except Exception as e:
        current_app.logger.error(f"Security logging error: {e}")

# Encryption utilities for specific data types
class DataEncryption:
    """Specialized encryption for different data types"""
    
    @staticmethod
    def encrypt_personal_info(data):
        """Encrypt personal information"""
        return security_manager.encrypt_data(data)
    
    @staticmethod
    def decrypt_personal_info(encrypted_data):
        """Decrypt personal information"""
        decrypted = security_manager.decrypt_data(encrypted_data)
        try:
            return json.loads(decrypted) if decrypted else None
        except:
            return decrypted
    
    @staticmethod
    def encrypt_api_response(data):
        """Encrypt API response data"""
        # Only encrypt sensitive fields
        if isinstance(data, dict) and 'success' in data:
            if data.get('success'):
                # Encrypt sensitive fields in response
                sensitive_fields = ['donors_registered', 'personal_info', 'contact_details']
                for field in sensitive_fields:
                    if field in data.get('data', {}):
                        data['data'][field] = security_manager.encrypt_data(data['data'][field])
        
        return data
    
    @staticmethod
    def create_secure_hash(data):
        """Create secure hash for data integrity"""
        data_str = json.dumps(data, sort_keys=True) if isinstance(data, dict) else str(data)
        return hashlib.sha256(data_str.encode()).hexdigest()

# CORS security configuration
def configure_secure_cors(app):
    """Configure secure CORS settings"""
    from flask_cors import CORS
    
    CORS(app, origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://yourdomain.com"  # Replace with actual domain
    ], methods=['GET', 'POST', 'PUT', 'DELETE'], 
       allow_headers=['Content-Type', 'Authorization', 'X-API-Key'],
       supports_credentials=True)

# Security headers middleware
def add_security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    return response
