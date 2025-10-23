"""Admin token store implementation."""

from datetime import datetime, timedelta
from threading import Lock
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class AdminTokenStore:
    _instance = None
    _lock = Lock()

    def __init__(self):
        self._tokens: Dict[str, Dict] = {}  # refresh_token -> metadata
    
    @classmethod
    def get_instance(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = cls()
        return cls._instance
    
    def _cleanup(self):
        """Remove expired tokens."""
        now = datetime.utcnow()
        expired = [token for token, meta in self._tokens.items() 
                  if now > meta['expires_at']]
        for token in expired:
            del self._tokens[token]
    
    def create_token(self, user_id: int, expires_in_days: int = 7) -> str:
        """Create a new refresh token."""
        from secrets import token_urlsafe
        
        self._cleanup()
        token = token_urlsafe(32)
        self._tokens[token] = {
            'user_id': user_id,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(days=expires_in_days),
            'revoked': False
        }
        return token
    
    def validate_token(self, token: str) -> Optional[int]:
        """Validate a token and return user_id if valid."""
        self._cleanup()
        meta = self._tokens.get(token)
        if not meta or meta['revoked']:
            return None
        if datetime.utcnow() > meta['expires_at']:
            del self._tokens[token]
            return None
        return meta['user_id']
    
    def revoke_token(self, token: str) -> bool:
        """Revoke a specific token."""
        if token in self._tokens:
            self._tokens[token]['revoked'] = True
            return True
        return False
    
    def revoke_all_user_tokens(self, user_id: int):
        """Revoke all tokens for a user."""
        for meta in self._tokens.values():
            if meta['user_id'] == user_id:
                meta['revoked'] = True
    
    def get_user_tokens(self, user_id: int) -> list:
        """Get all tokens for a user."""
        self._cleanup()
        user_tokens = []
        for token, meta in self._tokens.items():
            if meta['user_id'] == user_id:
                user_tokens.append({
                    'token': token,
                    'created_at': meta['created_at'],
                    'expires_at': meta['expires_at'],
                    'revoked': meta['revoked']
                })
        return sorted(user_tokens, key=lambda x: x['created_at'], reverse=True)