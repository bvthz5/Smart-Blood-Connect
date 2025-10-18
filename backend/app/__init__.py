import os
import sys
from flask import Flask, jsonify
# from flask_cors import CORS  # Removed - using manual CORS headers
from dotenv import load_dotenv
from flasgger import Swagger
from .config import config
from .extensions import db, migrate, jwt
from .services.database import check_database_connection
from .services.auth import seed_admin_user
from app.config.email_config import EmailConfig

def configure_cors(app):
    """Configure CORS for cross-origin requests"""
    # Manual CORS headers for all requests
    @app.after_request
    def after_request(response):
        # Only add CORS headers if they don't already exist
        if 'Access-Control-Allow-Origin' not in response.headers:
            response.headers['Access-Control-Allow-Origin'] = '*'
        if 'Access-Control-Allow-Headers' not in response.headers:
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
        if 'Access-Control-Allow-Methods' not in response.headers:
            response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        if 'Access-Control-Allow-Credentials' not in response.headers:
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

def configure_swagger(app):
    """Configure Swagger UI for API documentation"""
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": 'apispec',
                "route": '/apispec.json',
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/apidocs"
    }
    
    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "SmartBlood API",
            "version": "1.0.0",
            "description": "API documentation for SmartBlood blood donation platform. Connect donors with those in need of blood transfusions across Kerala.",
            "contact": {
                "name": "SmartBlood Team",
                "email": "support@smartblood.com"
            }
        },
        "host": "localhost:5000",
        "basePath": "/",
        "schemes": ["http", "https"],
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
            }
        },
        "security": [
            {
                "Bearer": []
            }
        ],
        "tags": [
            {
                "name": "Authentication",
                "description": "User authentication and authorization"
            },
            {
                "name": "Admin",
                "description": "Administrative operations and dashboard"
            },
            {
                "name": "Donor",
                "description": "Blood donor management and operations"
            },
            {
                "name": "Requests",
                "description": "Blood request management"
            },
            {
                "name": "Health",
                "description": "System health and status checks"
            }
        ]
    }
    
    Swagger(app, config=swagger_config, template=swagger_template)

def register_blueprints(app):
    """Register all blueprints"""
    from .auth.routes import auth_bp
    from .donor.routes import donor_bp
    from .admin.routes import admin_bp
    from .admin.login import admin_auth_bp
    from .admin.dashboard import admin_dashboard_bp
    from .requests.routes import req_bp
    from .admin.match_routes import admin_match_bp
    from .api.health import health_bp
    from .homepage.routes import homepage_bp
    from .ml.routes import ml_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(donor_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(admin_auth_bp)
    app.register_blueprint(admin_dashboard_bp)
    app.register_blueprint(req_bp)
    app.register_blueprint(admin_match_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(homepage_bp)
    app.register_blueprint(ml_bp)

def initialize_ml_models(app):
    """Initialize ML model client"""
    with app.app_context():
        try:
            from pathlib import Path
            from app.ml.model_client import model_client
            
            # Get paths
            base_dir = Path(app.root_path).parent
            artifacts_dir = base_dir / 'models_artifacts'
            model_map_path = artifacts_dir / 'model_map.json'
            
            # Initialize model client
            model_client.initialize(str(artifacts_dir), str(model_map_path))
            
            # Optionally preload critical models
            try:
                model_client.load_model('donor_seeker_match')
                model_client.load_model('donor_availability')
                print("[ML] Critical models preloaded successfully")
            except Exception as e:
                print(f"[ML] Warning: Could not preload models: {e}")
                
        except Exception as e:
            print(f"[ML] Model initialization error: {e}")
            print("[ML] ML features will be unavailable")

def initialize_database(app):
    """Initialize database and create tables if they don't exist"""
    with app.app_context():
        try:
            # Check if tables exist
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            if not existing_tables:
                print("No tables found. Creating database tables...")
                # Create all tables
                db.create_all()
                print("Database tables created successfully")
            else:
                print(f"Database tables already exist: {len(existing_tables)} tables found")
            
            # Seed admin user
            from app.services.auth import seed_admin_user
            seed_admin_user()
                
        except Exception as e:
            print(f"Database initialization error: {e}")
            # Try to create tables directly if migrations fail
            try:
                print("Attempting to create tables directly...")
                db.create_all()
                print("Database tables created successfully")
                
                # Seed admin user
                from app.services.auth import seed_admin_user
                seed_admin_user()
            except Exception as e2:
                print(f"Direct table creation also failed: {e2}")
                # Don't raise, just continue - tables might already exist
                print("Continuing with existing database...")

def create_app(config_name='default'):
    """Application factory pattern"""
    # Load environment variables from .env file
    load_dotenv()
    
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Validate email (SMTP) configuration early and warn if missing
    try:
        print("\n" + "="*60)
        EmailConfig.validate_config()
        print("="*60 + "\n")
    except Exception as e:
        print(f"\n[EmailConfig] Warning: {e}. Forgot password emails will fail until SMTP credentials are set.\n")

    # Configure CORS
    configure_cors(app)

    # Configure Swagger UI
    configure_swagger(app)

    # Register blueprints
    register_blueprints(app)

    # Check database connection at startup
    with app.app_context():
        if not check_database_connection():
            print("Failed to connect to database. Please check your DATABASE_URL and ensure PostgreSQL is running.")
            sys.exit(1)
        
        # Initialize database and create tables if they don't exist
        initialize_database(app)
        
        # Initialize ML models
        initialize_ml_models(app)

    # Register main routes
    @app.route("/")
    def index():
        return {"status":"ok","service":"SmartBlood backend"}

    return app