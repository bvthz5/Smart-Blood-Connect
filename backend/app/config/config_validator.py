"""
Configuration Validator - Ensures config values are correct types
This prevents bugs like SECRET_KEY being a function instead of a string
"""
import os
import sys
import logging

logger = logging.getLogger(__name__)

class ConfigValidator:
    """Validate configuration values to prevent runtime errors"""
    
    @staticmethod
    def validate_secret_key(secret_key):
        """Ensure SECRET_KEY is a string, not a function or other type"""
        if callable(secret_key):
            error_msg = (
                "CRITICAL CONFIG ERROR: SECRET_KEY is a function, not a string!\n"
                "This will cause 'TypeError: function object is not iterable'\n"
                "Check backend/app/config/__init__.py and ensure SECRET_KEY is:\n"
                "  SECRET_KEY = EnvVar(..., default=os.urandom(24).hex()).get_value()\n"
                "NOT:\n"
                "  SECRET_KEY = EnvVar(..., default=lambda: os.urandom(24).hex()).get_value()"
            )
            logger.error(error_msg)
            print("\n" + "="*70)
            print(error_msg)
            print("="*70 + "\n")
            sys.exit(1)
        
        if not isinstance(secret_key, (str, bytes)):
            error_msg = f"CRITICAL: SECRET_KEY must be string or bytes, got {type(secret_key)}"
            logger.error(error_msg)
            print(f"\n{'='*70}\n{error_msg}\n{'='*70}\n")
            sys.exit(1)
        
        if isinstance(secret_key, str) and len(secret_key) < 16:
            logger.warning("SECRET_KEY is shorter than recommended (16+ characters)")
        
        logger.info("✓ SECRET_KEY validation passed")
        return True
    
    @staticmethod
    def validate_jwt_secret_key(jwt_secret_key):
        """Ensure JWT_SECRET_KEY is a string"""
        if callable(jwt_secret_key):
            error_msg = "CRITICAL: JWT_SECRET_KEY is a function, not a string!"
            logger.error(error_msg)
            print(f"\n{'='*70}\n{error_msg}\n{'='*70}\n")
            sys.exit(1)
        
        if not isinstance(jwt_secret_key, str):
            error_msg = f"CRITICAL: JWT_SECRET_KEY must be string, got {type(jwt_secret_key)}"
            logger.error(error_msg)
            print(f"\n{'='*70}\n{error_msg}\n{'='*70}\n")
            sys.exit(1)
        
        if len(jwt_secret_key) < 32:
            logger.warning("JWT_SECRET_KEY should be at least 32 characters for security")
        
        logger.info("✓ JWT_SECRET_KEY validation passed")
        return True
    
    @staticmethod
    def validate_database_url(database_url):
        """Validate database URL format"""
        if not database_url:
            error_msg = "DATABASE_URL is not set"
            logger.error(error_msg)
            return False
        
        valid_schemes = ['postgresql', 'postgresql+psycopg2', 'sqlite', 'mysql']
        scheme = database_url.split('://')[0] if '://' in database_url else ''
        
        if scheme not in valid_schemes:
            logger.warning(f"Unusual database scheme: {scheme}")
        
        logger.info(f"✓ DATABASE_URL validation passed (scheme: {scheme})")
        return True
    
    @staticmethod
    def validate_url(url, name="URL"):
        """Validate URL format"""
        if not url:
            logger.warning(f"{name} is not set")
            return False
        
        if not url.startswith(('http://', 'https://')):
            logger.warning(f"{name} should start with http:// or https://")
            return False
        
        logger.info(f"✓ {name} validation passed")
        return True
    
    @classmethod
    def validate_all_config(cls, config_obj):
        """Validate all critical configuration values"""
        logger.info("Starting configuration validation...")
        
        try:
            # Validate SECRET_KEY
            if hasattr(config_obj, 'SECRET_KEY'):
                cls.validate_secret_key(config_obj.SECRET_KEY)
            
            # Validate JWT_SECRET_KEY
            if hasattr(config_obj, 'JWT_SECRET_KEY'):
                cls.validate_jwt_secret_key(config_obj.JWT_SECRET_KEY)
            
            # Validate DATABASE_URL
            if hasattr(config_obj, 'DATABASE_URL'):
                cls.validate_database_url(config_obj.DATABASE_URL)
            
            # Validate FRONTEND_URL
            if hasattr(config_obj, 'FRONTEND_URL'):
                cls.validate_url(config_obj.FRONTEND_URL, "FRONTEND_URL")
            
            logger.info("✅ All configuration validation passed!")
            return True
            
        except Exception as e:
            logger.error(f"Configuration validation failed: {str(e)}")
            raise
    
    @staticmethod
    def print_config_summary(config_obj):
        """Print non-sensitive config summary"""
        print("\n" + "="*70)
        print("CONFIGURATION SUMMARY")
        print("="*70)
        
        safe_attrs = {
            'DEBUG': getattr(config_obj, 'DEBUG', None),
            'FLASK_ENV': getattr(config_obj, 'FLASK_ENV', None),
            'DATABASE_URL': getattr(config_obj, 'DATABASE_URL', '').split('://', 1)[0] + '://***',
            'FRONTEND_URL': getattr(config_obj, 'FRONTEND_URL', None),
            'SECRET_KEY': '***' + str(getattr(config_obj, 'SECRET_KEY', ''))[-4:] if hasattr(config_obj, 'SECRET_KEY') else None,
            'JWT_SECRET_KEY': '***' + str(getattr(config_obj, 'JWT_SECRET_KEY', ''))[-4:] if hasattr(config_obj, 'JWT_SECRET_KEY') else None,
        }
        
        for key, value in safe_attrs.items():
            print(f"  {key}: {value}")
        
        print("="*70 + "\n")

# Convenience function
def validate_config(config_obj):
    """Main validation function to call at startup"""
    return ConfigValidator.validate_all_config(config_obj)
