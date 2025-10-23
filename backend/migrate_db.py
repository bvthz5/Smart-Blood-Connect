#!/usr/bin/env python3
"""
Database Migration Script for SmartBlood
Run with: python migrate_db.py

This script runs database migrations to ensure all tables are created.
"""

import os
import sys
from dotenv import load_dotenv
from flask_migrate import upgrade, init, migrate, current, revision
from app import create_app, db

def run_migrations():
    """Run database migrations"""
    # Load environment variables from .env file
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if not os.path.exists(env_path):
        print("Error: .env file not found at:", env_path)
        sys.exit(1)
        
    load_dotenv(env_path)
    print("Environment variables loaded from:", env_path)
    
    # Check for required environment variables
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is required")
        print("Please check .env file contents. Current value:", db_url)
        sys.exit(1)
    else:
        print("Found DATABASE_URL:", db_url)
    
    app = create_app()
    
    with app.app_context():
        try:
            print("Running database migrations...")
            
            # Check if tables already exist
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            if existing_tables and 'alembic_version' not in existing_tables:
                print("Tables exist but migration table not found. Marking current migration as applied...")
                from flask_migrate import stamp
                stamp()
                print("Migration table created and marked as current.")
            else:
                # Check if migrations table exists
                try:
                    current()
                    print("Migration table exists, running upgrade...")
                    upgrade()
                except Exception as e:
                    print(f"Migration table not found or error: {e}")
                    print("Initializing migrations...")
                    init()
                    print("Creating initial migration...")
                    migrate(message="Initial migration")
                    print("Running upgrade...")
                    upgrade()
            
            print("Database migrations completed successfully!")
            
            # Check if tables exist
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"Database tables: {', '.join(tables)}")
            
            # Seed admin user if it doesn't exist
            from app.services.auth import seed_admin_user
            print("Seeding admin user...")
            seed_admin_user()
            print("Admin user seeding completed!")
            
        except Exception as e:
            print(f"Migration error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    run_migrations()
