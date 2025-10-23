"""Token Store with enhanced user blocking support."""

from datetime import datetime, timedelta
from threading import Lock
from typing import Dict, Set, Optional
import logging

logger = logging.getLogger(__name__)

class TokenStore:
    _instance = None
    _lock = Lock()

    def __init__(self):
        self._tokens: Dict[str, Dict] = {}  # token -> metadata
        self._user_tokens: Dict[int, Set[str]] = {}  # user_id -> set of tokens
        self._blocked_users: Set[int] = set()  # blocked user IDs
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

    def block_user(self, user_id: int):
        """Block a user and revoke all their tokens."""
        self._blocked_users.add(user_id)
        self.revoke_all_user_tokens(user_id)

    def unblock_user(self, user_id: int):
        """Unblock a user."""
        self._blocked_users.discard(user_id)
    
    def is_user_blocked(self, user_id: int) -> bool:
        """Check if a user is blocked."""
        return user_id in self._blocked_users
        
    def add_token(self, token: str, user_id: int, expires_at: datetime):
        """Add a new token."""
        if self.is_user_blocked(user_id):
            return None
        
        self._cleanup()
        self._tokens[token] = {
            'user_id': user_id,
            'expires_at': expires_at,
            'created_at': datetime.utcnow()
        }
        if user_id not in self._user_tokens:
            self._user_tokens[user_id] = set()
        self._user_tokens[user_id].add(token)
        return token
    
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
        """Check if a token exists, is not expired, and user is not blocked."""
        self._cleanup()
        if token not in self._tokens:
            return False
        
        token_info = self._tokens[token]
        if datetime.utcnow() > token_info['expires_at']:
            return False
            
        if self.is_user_blocked(token_info['user_id']):
            return False
            
        return True
    
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