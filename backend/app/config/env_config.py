"""
Environment Configuration Manager
Handles loading and validating environment variables
"""

import os
from typing import Any, Dict
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class ConfigurationError(Exception):
    """Raised when environment configuration is invalid."""
    pass

class EnvConfig:
    """Environment configuration manager"""
    
    REQUIRED_VARS = {
        'DATABASE_URL': str,
        'JWT_SECRET_KEY': str,
        'ACCESS_EXPIRES_MINUTES': int,
        'REFRESH_EXPIRES_DAYS': int,
        'RESET_EXPIRES_MINUTES': int,
        'ADMIN_EMAIL': str,
        'ADMIN_PASSWORD': str
    }
    
    OPTIONAL_VARS = {
        'SMTP_SERVER': str,
        'SMTP_PORT': int,
        'SMTP_USE_TLS': bool,
        'SMTP_USE_SSL': bool,
        'SENDER_EMAIL': str,
        'SENDER_PASSWORD': str,
        'SENDER_NAME': str,
        'HUGGINGFACE_HUB_TOKEN': str,
        'TWILIO_ACCOUNT_SID': str,
        'TWILIO_AUTH_TOKEN': str,
        'TWILIO_FROM': str,
        'FRONTEND_URL': str,
        'FLASK_APP': str,
        'FLASK_ENV': str
    }
    
    DEFAULT_VALUES = {
        'FLASK_APP': 'app',
        'FLASK_ENV': 'development',
        'SMTP_SERVER': 'smtp.gmail.com',
        'SMTP_PORT': 465,
        'SMTP_USE_TLS': False,
        'SMTP_USE_SSL': True,
        'SENDER_NAME': 'SmartBlood',
        'FRONTEND_URL': 'http://localhost:3000',
        'ACCESS_EXPIRES_MINUTES': 60,
        'REFRESH_EXPIRES_DAYS': 7,
        'RESET_EXPIRES_MINUTES': 15
    }
    
    @classmethod
    def load(cls, env_file: str = None) -> Dict[str, Any]:
        """Load and validate environment variables."""
        # Load environment variables from file if specified
        if env_file:
            if not os.path.exists(env_file):
                raise ConfigurationError(f"Environment file not found: {env_file}")
            load_dotenv(env_file)
            logger.info(f"Loaded environment from: {env_file}")
        
        config = {}
        missing_vars = []
        invalid_vars = []
        
        # Validate required variables
        for var_name, var_type in cls.REQUIRED_VARS.items():
            value = os.getenv(var_name)
            if value is None:
                missing_vars.append(var_name)
                continue
            
            try:
                if var_type == bool:
                    config[var_name] = value.lower() in ('true', '1', 'yes')
                else:
                    config[var_name] = var_type(value)
            except ValueError:
                invalid_vars.append(f"{var_name} (expected {var_type.__name__})")
        
        # Load optional variables with defaults
        for var_name, var_type in cls.OPTIONAL_VARS.items():
            value = os.getenv(var_name)
            if value is None:
                if var_name in cls.DEFAULT_VALUES:
                    config[var_name] = cls.DEFAULT_VALUES[var_name]
                continue
            
            try:
                if var_type == bool:
                    config[var_name] = value.lower() in ('true', '1', 'yes')
                else:
                    config[var_name] = var_type(value)
            except ValueError:
                invalid_vars.append(f"{var_name} (expected {var_type.__name__})")
        
        # Report any configuration errors
        if missing_vars or invalid_vars:
            error_msg = []
            if missing_vars:
                error_msg.append(f"Missing required variables: {', '.join(missing_vars)}")
            if invalid_vars:
                error_msg.append(f"Invalid variable types: {', '.join(invalid_vars)}")
            raise ConfigurationError('\n'.join(error_msg))
        
        # Basic validation of values
        if config.get('DATABASE_URL') and not config['DATABASE_URL'].startswith(('postgresql://', 'postgresql+psycopg2://')):
            raise ConfigurationError("DATABASE_URL must be a PostgreSQL connection string")
        
        if len(str(config.get('JWT_SECRET_KEY', ''))) < 32:
            raise ConfigurationError("JWT_SECRET_KEY must be at least 32 characters long")
        
        if config.get('SMTP_USE_TLS') and config.get('SMTP_USE_SSL'):
            raise ConfigurationError("Cannot enable both SMTP_USE_TLS and SMTP_USE_SSL")
        
        return config
    
    @classmethod
    def get_database_components(cls) -> Dict[str, str]:
        """Extract database connection components from DATABASE_URL."""
        url = os.getenv('DATABASE_URL', '')
        if not url:
            return {}
        
        try:
            # Remove driver prefix if present
            if '+' in url:
                url = url.split('+')[0] + url.split('/', 2)[2]
            
            # Parse URL components
            auth, rest = url.split('@')
            userpass, dbtype = auth.rsplit('://', 1)
            if ':' in userpass:
                user, password = userpass.split(':')
            else:
                user, password = userpass, ''
            
            if '/' in rest:
                host_port, dbname = rest.split('/')
            else:
                host_port, dbname = rest, ''
            
            if ':' in host_port:
                host, port = host_port.split(':')
            else:
                host, port = host_port, '5432'
            
            return {
                'host': host,
                'port': port,
                'database': dbname,
                'user': user,
                'password': password
            }
        except Exception as e:
            logger.error(f"Failed to parse DATABASE_URL: {e}")
            return {}