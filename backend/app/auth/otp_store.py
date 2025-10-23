"""In-memory OTP store with cleanup for development purposes."""

from datetime import datetime, timedelta
from threading import Lock
from typing import Dict
from werkzeug.security import generate_password_hash, check_password_hash
import logging

logger = logging.getLogger(__name__)

class OTPStore:
    _instance = None
    _lock = Lock()

    def __init__(self):
        self._otps: Dict[str, Dict] = {}  # key -> metadata
        self._last_cleanup = datetime.utcnow()
    
    @classmethod
    def get_instance(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = cls()
        return cls._instance
    
    def _cleanup(self):
        """Remove expired OTPs. Called periodically."""
        now = datetime.utcnow()
        if (now - self._last_cleanup) < timedelta(minutes=5):
            return  # Only cleanup every 5 minutes
            
        expired = []
        for key, meta in self._otps.items():
            if now > meta['expires_at']:
                expired.append(key)
                
        for key in expired:
            del self._otps[key]
            
        self._last_cleanup = now
    
    def add_otp(self, user_id: int, channel: str, destination: str, otp: str, expires_at: datetime):
        """Add a new OTP session."""
        self._cleanup()
        key = f"{user_id}:{channel}:{destination}"
        self._otps[key] = {
            'user_id': user_id,
            'channel': channel,
            'destination': destination,
            'otp_hash': generate_password_hash(otp),
            'expires_at': expires_at,
            'attempts': 0,
            'used': False,
            'created_at': datetime.utcnow()
        }
        return key
    
    def verify_otp(self, key: str, otp: str) -> bool:
        """Verify an OTP and mark it as used if correct."""
        self._cleanup()
        if key not in self._otps:
            return False
            
        meta = self._otps[key]
        if meta['used'] or datetime.utcnow() > meta['expires_at']:
            return False
            
        meta['attempts'] += 1
        if meta['attempts'] > 3:  # Max attempts
            return False
            
        if check_password_hash(meta['otp_hash'], otp):
            meta['used'] = True
            return True
            
        return False
    
    def get_latest_unused(self, user_id: int, channel: str) -> Dict:
        """Get the latest unused OTP session for a user/channel."""
        self._cleanup()
        latest = None
        latest_time = None
        
        for key, meta in self._otps.items():
            if (meta['user_id'] == user_id and 
                meta['channel'] == channel and 
                not meta['used'] and 
                datetime.utcnow() <= meta['expires_at']):
                if not latest_time or meta['created_at'] > latest_time:
                    latest = meta
                    latest_time = meta['created_at']
        
        return latest or {}