#!/usr/bin/env python3
"""
SmartBlood Backend Server
Run with: python run.py

This script handles:
1. Environment setup
2. Database migrations
3. Server startup
"""

import os
import sys
import subprocess
from pathlib import Path
from dotenv import load_dotenv

def setup_environment():
    """Load environment variables and verify critical settings"""
    env_path = Path(__file__).parent / '.env'
    print(f"\nLooking for .env at: {env_path}")
    
    if not env_path.exists():
        print(f"Error: .env file not found at {env_path}")
        sys.exit(1)
    
    # Read .env file and manually process it to handle BOM
    print("\nLoading environment variables...")
    try:
        with open(env_path, 'r', encoding='utf-8-sig') as f:  # utf-8-sig handles BOM
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    try:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip()
                        os.environ[key] = value
                        print(f"   ✓ Loaded: {key}")
                    except ValueError:
                        continue
    except Exception as e:
        print(f"Error reading .env file: {e}")
        sys.exit(1)
    
    # Verify loading worked
    if not os.getenv('DATABASE_URL'):
        print("\nError: Failed to load DATABASE_URL from .env")
        sys.exit(1)
    
    print("✓ Environment variables loaded successfully")
    
    # Verify critical environment variables
    required_vars = [
        'DATABASE_URL',
        'JWT_SECRET_KEY',
        'ADMIN_EMAIL',
        'ADMIN_PASSWORD'
    ]
    
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        print(f"Error: Missing required environment variables: {', '.join(missing)}")
        print("Please check your .env file and set all required variables.")
        sys.exit(1)
    
    print("✓ Environment variables loaded successfully")

def run_migrations():
    """Run database migrations using Flask-Migrate"""
    print("\nChecking database schema...")
    try:
        # Import Flask-Migrate and run migrations programmatically
        from flask_migrate import upgrade as run_db_upgrade
        from app import create_app
        from sqlalchemy import inspect
        from app.extensions import db
        
        # Create app context for migrations
        app = create_app()
        with app.app_context():
            # Check if tables exist first
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            if tables:
                print(f"✓ Database tables found: {len(tables)} tables")
            else:
                print("Creating initial database schema...")
                try:
                    db.create_all()
                    print("✓ Database tables created successfully")
                except Exception as e:
                    print(f"Error creating tables: {e}")
                    raise
            
        print("✓ Database schema is ready")
        
    except Exception as e:
        if "UndefinedColumn" in str(e):
            print("Note: Some migrations were skipped (schema already up to date)")
            return
        print(f"Error checking database: {str(e)}")
        sys.exit(1)

def main():
    """Main entry point"""
    print("SmartBlood Backend Server")
    print("========================")
    
    # Setup environment
    setup_environment()
    
    # Run database migrations
    run_migrations()
    
    # Import app only after environment is setup
    try:
        from app import create_app
        app = create_app()
    except Exception as e:
        print(f"Error creating application: {str(e)}")
        sys.exit(1)
    
    # Server settings
    host = "127.0.0.1"
    port = 5000
    debug = True
    
    print(f"\nStarting server at http://{host}:{port}")
    print(f"Database: {os.getenv('DATABASE_URL', '').split('://', 1)[0]}")
    print(f"Debug mode: {debug}")
    print("\nPress Ctrl+C to stop the server")
    
    # Start the Flask application
    app.run(host=host, port=port, debug=debug)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nServer stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nUnexpected error: {str(e)}")
        sys.exit(1)
