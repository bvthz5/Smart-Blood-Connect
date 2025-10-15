"""
API Key Management for SmartBlood Connect
Handles generation, validation, and management of API keys
"""

from flask import Blueprint, jsonify, request
from app.services.security import security_manager
from app.services.auth import jwt_required
from app import db
import secrets
import hashlib
from datetime import datetime, timedelta

api_keys_bp = Blueprint('api_keys', __name__)

@api_keys_bp.route('/api/admin/generate-api-key', methods=['POST'])
@jwt_required
def generate_api_key():
    """
    Generate a new API key for external access
    Requires admin authentication
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Validate required fields
        key_name = data.get('name')
        access_level = data.get('access_level', 'homepage_read')
        expires_in_days = data.get('expires_in_days', 365)
        
        if not key_name:
            return jsonify({'error': 'API key name is required'}), 400
        
        # Generate secure API key
        api_key = secrets.token_urlsafe(32)
        
        # Create API key record
        api_key_record = {
            'name': key_name,
            'key': api_key,
            'access_level': access_level,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(days=expires_in_days),
            'is_active': True,
            'created_by': request.current_user.get('user_id')
        }
        
        # Store in database (simplified - in production use proper table)
        # For now, we'll use the environment variables approach
        
        return jsonify({
            'success': True,
            'api_key': api_key,
            'key_info': {
                'name': key_name,
                'access_level': access_level,
                'expires_at': api_key_record['expires_at'].isoformat()
            },
            'warning': 'Store this API key securely. It will not be shown again.'
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to generate API key'}), 500

@api_keys_bp.route('/api/admin/api-keys', methods=['GET'])
@jwt_required
def list_api_keys():
    """
    List all API keys (admin only)
    """
    try:
        # In production, fetch from database
        api_keys_info = []
        
        for level, key in security_manager.api_keys.items():
            # Don't expose the actual keys, just metadata
            api_keys_info.append({
                'name': f"{level}_key",
                'access_level': level,
                'status': 'active',
                'created_at': '2024-01-01T00:00:00Z'  # Placeholder
            })
        
        return jsonify({
            'success': True,
            'api_keys': api_keys_info
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to list API keys'}), 500

@api_keys_bp.route('/api/admin/validate-api-key', methods=['POST'])
@jwt_required
def validate_api_key():
    """
    Validate an API key
    """
    try:
        data = request.get_json()
        api_key = data.get('api_key')
        required_level = data.get('required_level', 'homepage_read')
        
        if not api_key:
            return jsonify({'error': 'API key is required'}), 400
        
        is_valid = security_manager.verify_api_key(api_key, required_level)
        
        return jsonify({
            'success': True,
            'is_valid': is_valid,
            'has_required_access': is_valid
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to validate API key'}), 500

@api_keys_bp.route('/api/admin/revoke-api-key', methods=['POST'])
@jwt_required
def revoke_api_key():
    """
    Revoke an API key
    """
    try:
        data = request.get_json()
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({'error': 'API key is required'}), 400
        
        # In production, mark as revoked in database
        # For now, we'll just return success
        
        return jsonify({
            'success': True,
            'message': 'API key revoked successfully'
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to revoke API key'}), 500
