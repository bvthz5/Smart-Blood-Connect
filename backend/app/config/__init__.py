import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Local development configuration"""
    DEBUG = True
    FLASK_ENV = 'development'
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
    
    # Database configuration - PostgreSQL for local development
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg2://postgres:123@localhost:5432/smartblood")
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "5e26281f3383022e638471a811bebb70b2f084b0740d612ac11b26fa52040708")
    OTP_SECRET = os.environ.get("OTP_SECRET", "otp-secret")
    ACCESS_EXPIRES_MINUTES = int(os.environ.get("ACCESS_EXPIRES_MINUTES", 60))  # 1 hour
    REFRESH_EXPIRES_DAYS = int(os.environ.get("REFRESH_EXPIRES_DAYS", 7))  # 7 days
    
    # Frontend URL for building password reset links
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    
    # Admin seeding configuration
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "smartblooda@gmail.com")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@123")

# Single configuration for local development
config = {
    'default': Config
}
