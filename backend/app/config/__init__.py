import os
import pathlib
from typing import Dict, Any, Optional
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

@dataclass
class EnvVar:
    """Environment variable configuration with validation"""
    key: str
    required: bool = True
    default: Any = None
    validator: Optional[callable] = None
    
    def get_value(self) -> Any:
        """Get and validate environment variable value"""
        value = os.environ.get(self.key)
        
        if value is None:
            if self.required:
                raise ValueError(f"Required environment variable {self.key} is not set")
            return self.default
            
        if self.validator and value is not None:
            try:
                return self.validator(value)
            except Exception as e:
                raise ValueError(f"Invalid value for {self.key}: {str(e)}")
        
        return value

def validate_url(url: str) -> str:
    """Validate URL format"""
    if not url.startswith(('http://', 'https://')):
        raise ValueError("URL must start with http:// or https://")
    return url

def validate_positive_int(value: str) -> int:
    """Validate positive integer values"""
    result = int(value)
    if result <= 0:
        raise ValueError("Value must be positive")
    return result

class Config:
    """Application configuration with environment validation"""
    
    # Core configuration
    DEBUG = True
    FLASK_ENV = 'development'
    SECRET_KEY = EnvVar("SECRET_KEY", required=False, default=lambda: os.urandom(24).hex()).get_value()
    
    # Database configuration
    _DB_ENV = EnvVar("DATABASE_URL", required=False).get_value()
    if not _DB_ENV:
        db_path = pathlib.Path(__file__).parent.parent.parent / "smartblood.db"
        _DB_ENV = f"sqlite:///{db_path}"
    DATABASE_URL = _DB_ENV
    
    # Handle Docker development configuration
    if ('@postgres:' in DATABASE_URL) and os.environ.get('FLASK_ENV', 'development') == 'development':
        DATABASE_URL = DATABASE_URL.replace('@postgres:', '@localhost:')
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT and Authentication configuration
    JWT_SECRET_KEY = EnvVar("JWT_SECRET_KEY", required=True).get_value()
    OTP_SECRET = EnvVar("OTP_SECRET", required=False, default="otp-secret").get_value()
    ACCESS_EXPIRES_MINUTES = EnvVar(
        "ACCESS_EXPIRES_MINUTES", 
        required=False, 
        default=60,
        validator=validate_positive_int
    ).get_value()
    REFRESH_EXPIRES_DAYS = EnvVar(
        "REFRESH_EXPIRES_DAYS", 
        required=False, 
        default=7,
        validator=validate_positive_int
    ).get_value()
    RESET_EXPIRES_MINUTES = EnvVar(
        "RESET_EXPIRES_MINUTES", 
        required=False, 
        default=15,
        validator=validate_positive_int
    ).get_value()
    
    # Frontend configuration
    FRONTEND_URL = EnvVar(
        "FRONTEND_URL", 
        required=False, 
        default="http://localhost:3000",
        validator=validate_url
    ).get_value()
    
    # Admin configuration
    ADMIN_EMAIL = EnvVar("ADMIN_EMAIL").get_value()
    ADMIN_PASSWORD = EnvVar("ADMIN_PASSWORD").get_value()

    @classmethod
    def validate_all(cls) -> None:
        """Validate all configuration values at once"""
        instance = cls()
        # Access all attributes to trigger validation
        for attr in dir(instance):
            if not attr.startswith('_'):
                getattr(instance, attr)

# Single configuration for application
config: Dict[str, Config] = {
    'default': Config
}

# Validate all configuration values on import
Config.validate_all()
