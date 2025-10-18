#!/usr/bin/env python3
"""
Create Admin User Script
"""
import os
from dotenv import load_dotenv
from app import create_app
from app.extensions import db
from app.models import User
from app.services.auth import hash_password

def create_admin():
    """Create admin user"""
    load_dotenv()
    
    app = create_app()
    
    with app.app_context():
        # Check if admin already exists
        admin_email = os.environ.get("ADMIN_EMAIL", "smartblooda@gmail.com")
        existing_admin = User.query.filter_by(email=admin_email, role="admin").first()
        
        if existing_admin:
            print(f"Admin user with email {admin_email} already exists!")
            return
        
        # Create admin user
        admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
        
        admin_user = User(
            first_name="Admin",
            last_name="User",
            email=admin_email,
            phone="+91-9876543210",
            password_hash=hash_password(admin_password),
            role="admin",
            status="active",
            is_phone_verified=True,
            is_email_verified=True
        )
        
        db.session.add(admin_user)
        db.session.commit()
        
        print("Admin user created successfully!")
        print("Credentials saved to database")

if __name__ == "__main__":
    create_admin()