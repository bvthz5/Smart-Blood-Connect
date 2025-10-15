import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Local development configuration"""
    DEBUG = True
    FLASK_ENV = 'development'
    # Do not hardcode secrets; use env or generate ephemeral for dev
    SECRET_KEY = os.environ.get("SECRET_KEY") or os.urandom(24).hex()
    
    # Database configuration - must come from env in dev
    _DB_ENV = os.environ.get("DATABASE_URL")
    if not _DB_ENV:
        raise RuntimeError("DATABASE_URL is not set in environment. Please set it in backend/.env")
    DATABASE_URL = _DB_ENV
    # If .env was copied from a Docker setup using host name 'postgres', fall back to localhost in dev
    if ('@postgres:' in DATABASE_URL) and os.environ.get('FLASK_ENV', 'development') == 'development':
        DATABASE_URL = DATABASE_URL.replace('@postgres:', '@localhost:')
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT configuration (no literals)
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY is not set in environment. Please set it in backend/.env")
    OTP_SECRET = os.environ.get("OTP_SECRET") or "otp-secret"
    ACCESS_EXPIRES_MINUTES = int(os.environ.get("ACCESS_EXPIRES_MINUTES", 60))  # 1 hour
    REFRESH_EXPIRES_DAYS = int(os.environ.get("REFRESH_EXPIRES_DAYS", 7))  # 7 days
    RESET_EXPIRES_MINUTES = int(os.environ.get("RESET_EXPIRES_MINUTES", 15))  # reset link validity
    
    # Frontend URL for building password reset links
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    
    # Admin seeding configuration (from env only)
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

# Single configuration for local development
config = {
    'default': Config
}
