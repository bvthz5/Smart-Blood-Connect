"""
Check admin users in the database
Run: python -m check_admin_users
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import User

app = create_app()

with app.app_context():
    print("=" * 60)
    print("ADMIN USERS IN DATABASE")
    print("=" * 60)
    
    admin_users = User.query.filter_by(role='admin').all()
    
    if not admin_users:
        print("\n❌ No admin users found in database!")
    else:
        print(f"\n✅ Found {len(admin_users)} admin user(s):\n")
        for user in admin_users:
            print(f"ID: {user.id}")
            print(f"Name: {user.first_name} {user.last_name}")
            print(f"Email: {user.email}")
            print(f"Phone: {user.phone}")
            print(f"Status: {user.status}")
            print(f"Created: {user.created_at}")
            print("-" * 60)
    
    print("\n" + "=" * 60)
