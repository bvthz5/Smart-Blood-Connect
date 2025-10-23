"""Simple in-memory token store with cleanup for development purposes."""

from datetime import datetime, timedelta
from threading import Lock
import logging
from typing import Dict, Set

logger = logging.getLogger(__name__)

class TokenStore:
    _instance = None
    _lock = Lock()

    def __init__(self):
        self._tokens: Dict[str, Dict] = {}  # token -> metadata
        self._user_tokens: Dict[int, Set[str]] = {}  # user_id -> set of tokens
        self._last_cleanup = datetime.utcnow()
        
    @classmethod
    def get_instance(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = cls()
        return cls._instance
    
    def _cleanup(self):
        """Remove expired tokens. Called periodically."""
        now = datetime.utcnow()
        if (now - self._last_cleanup) < timedelta(minutes=5):
            return  # Only cleanup every 5 minutes
            
        expired = []
        for token, meta in self._tokens.items():
            if now > meta['expires_at']:
                expired.append(token)
                
        for token in expired:
            self.remove_token(token)
            
        self._last_cleanup = now
    
    def add_token(self, token: str, user_id: int, expires_at: datetime):
        """Add a new token."""
        self._cleanup()
        self._tokens[token] = {
            'user_id': user_id,
            'expires_at': expires_at,
            'created_at': datetime.utcnow()
        }
        if user_id not in self._user_tokens:
            self._user_tokens[user_id] = set()
        self._user_tokens[user_id].add(token)
    
    def remove_token(self, token: str):
        """Remove a token."""
        if token in self._tokens:
            user_id = self._tokens[token]['user_id']
            del self._tokens[token]
            if user_id in self._user_tokens:
                self._user_tokens[user_id].discard(token)
                if not self._user_tokens[user_id]:
                    del self._user_tokens[user_id]
    
    def is_valid(self, token: str) -> bool:
        """Check if a token exists and is not expired."""
        self._cleanup()
        if token not in self._tokens:
            return False
        return datetime.utcnow() <= self._tokens[token]['expires_at']
    
    def revoke_all_user_tokens(self, user_id: int):
        """Revoke all tokens for a user."""
        if user_id in self._user_tokens:
            tokens = list(self._user_tokens[user_id])  # Copy to avoid modification during iteration
            for token in tokens:
                self.remove_token(token)
    
    def get_token_info(self, token: str) -> Dict:
        """Get token metadata if valid."""
        if self.is_valid(token):
            return self._tokens.get(token, {})
        return {}