"""
Test script to verify actual email sending functionality
Run this from the backend directory: python -m verify_email_sending
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("EMAIL SENDING TEST")
print("=" * 60)

# Initialize Flask app context
from app import create_app
app = create_app()

with app.app_context():
    from app.services.email_service import email_service
    from app.config.email_config import EmailConfig
    
    print("\n📧 Testing password reset email sending...")
    print(f"Sender: {EmailConfig.SENDER_EMAIL}")
    print(f"SMTP: {EmailConfig.SMTP_SERVER}:{EmailConfig.SMTP_PORT}")
    print(f"SSL: {EmailConfig.SMTP_USE_SSL}, TLS: {EmailConfig.SMTP_USE_TLS}")
    
    # Test email address (you can change this)
    test_recipient = EmailConfig.SENDER_EMAIL  # Send to self for testing
    test_reset_link = "http://localhost:3000/admin/reset-password?token=TEST_TOKEN_12345"
    test_user_name = "Test User"
    
    print(f"\nSending test email to: {test_recipient}")
    print(f"Reset link: {test_reset_link}")
    
    try:
        result = email_service.send_password_reset_email(
            recipient_email=test_recipient,
            reset_link=test_reset_link,
            user_name=test_user_name
        )
        
        if result:
            print("\n✅ SUCCESS! Password reset email sent successfully!")
            print(f"Check inbox at: {test_recipient}")
        else:
            print("\n❌ FAILED! Email was not sent.")
            print("Check the logs above for error details.")
    
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

print("\n" + "=" * 60)
