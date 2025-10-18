"""
Update admin email address
Run: python -m update_admin_email
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import User
from app.extensions import db

app = create_app()

with app.app_context():
    print("=" * 60)
    print("UPDATE ADMIN EMAIL ADDRESS")
    print("=" * 60)
    
    # Find the admin user
    admin_user = User.query.filter_by(role='admin').first()
    
    if not admin_user:
        print("\n❌ No admin user found!")
    else:
        print(f"\nCurrent admin details:")
        print(f"ID: {admin_user.id}")
        print(f"Name: {admin_user.first_name} {admin_user.last_name}")
        print(f"Email: {admin_user.email}")
        print(f"Phone: {admin_user.phone}")
        
        # Update email
        old_email = admin_user.email
        new_email = "smartblooda@gmail.com"
        
        print(f"\n📝 Updating email from '{old_email}' to '{new_email}'...")
        
        admin_user.email = new_email
        
        try:
            db.session.commit()
            print("✅ Admin email updated successfully!")
            
            # Verify the change
            updated_admin = User.query.filter_by(role='admin').first()
            print(f"\nVerified new email: {updated_admin.email}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Failed to update email: {str(e)}")
    
    print("\n" + "=" * 60)
