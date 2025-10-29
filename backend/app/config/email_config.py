"""
Email Configuration for SmartBlood Admin
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class EmailConfig:
    """Email configuration settings"""
    
    # SMTP Settings
    SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').strip().lower() in ('1', 'true', 'yes', 'on')
    SMTP_USE_SSL = os.getenv('SMTP_USE_SSL', 'false').strip().lower() in ('1', 'true', 'yes', 'on')
    
    # Sender Information
    SENDER_EMAIL = os.getenv('SENDER_EMAIL', 'smartblooda@gmail.com')
    SENDER_PASSWORD = os.getenv('SENDER_PASSWORD', '')
    SENDER_NAME = os.getenv('SENDER_NAME', 'SmartBlood Team')
    
    # Frontend URL for reset links
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    
    # Reset token expiry
    RESET_EXPIRES_MINUTES = int(os.getenv('RESET_EXPIRES_MINUTES', '15'))
    
    # Email Templates
    RESET_SUBJECT = "Password Reset Request - SmartBlood Admin"
    OTP_SUBJECT = "Password Reset OTP - SmartBlood Admin"
    
    @classmethod
    def validate_config(cls):
        """Validate email configuration"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info("[EMAIL CONFIG] Validating email configuration...")
        logger.info(f"[EMAIL CONFIG] SMTP_SERVER: {cls.SMTP_SERVER}")
        logger.info(f"[EMAIL CONFIG] SMTP_PORT: {cls.SMTP_PORT}")
        logger.info(f"[EMAIL CONFIG] SMTP_USE_TLS: {cls.SMTP_USE_TLS}")
        logger.info(f"[EMAIL CONFIG] SMTP_USE_SSL: {cls.SMTP_USE_SSL}")
        logger.info(f"[EMAIL CONFIG] SENDER_EMAIL: {cls.SENDER_EMAIL}")
        logger.info(f"[EMAIL CONFIG] SENDER_PASSWORD: {'*' * len(cls.SENDER_PASSWORD) if cls.SENDER_PASSWORD else 'NOT SET'}")
        logger.info(f"[EMAIL CONFIG] SENDER_NAME: {cls.SENDER_NAME}")
        logger.info(f"[EMAIL CONFIG] FRONTEND_URL: {cls.FRONTEND_URL}")
        logger.info(f"[EMAIL CONFIG] RESET_EXPIRES_MINUTES: {cls.RESET_EXPIRES_MINUTES}")
        
        required_fields = [
            'SENDER_EMAIL',
            'SENDER_PASSWORD'
        ]
        
        missing_fields = []
        for field in required_fields:
            if not getattr(cls, field):
                missing_fields.append(field)
        
        if missing_fields:
            logger.error(f"[EMAIL CONFIG] Missing required fields: {', '.join(missing_fields)}")
            raise ValueError(f"Missing required email configuration: {', '.join(missing_fields)}")
        
        logger.info("[EMAIL CONFIG] Email configuration validated successfully")
        return True





