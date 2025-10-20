"""
Check email configuration and test sending
Run: python check_email_config.py
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

def check_email_config():
    """Check if email environment variables are set"""
    print("="*60)
    print("EMAIL CONFIGURATION CHECK")
    print("="*60)
    
    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = os.getenv('SMTP_PORT')
    sender_email = os.getenv('SENDER_EMAIL')
    sender_password = os.getenv('SENDER_PASSWORD')
    
    print(f"\n📧 Email Settings:")
    print(f"   SMTP_SERVER: {smtp_server or '❌ NOT SET'}")
    print(f"   SMTP_PORT: {smtp_port or '❌ NOT SET'}")
    print(f"   SENDER_EMAIL: {sender_email or '❌ NOT SET'}")
    print(f"   SENDER_PASSWORD: {'✅ SET' if sender_password else '❌ NOT SET'}")
    
    if not sender_email or not sender_password:
        print(f"\n❌ ERROR: Email configuration incomplete!")
        print(f"\nPlease add these to your .env file:")
        print(f"   SENDER_EMAIL=your-email@gmail.com")
        print(f"   SENDER_PASSWORD=your-app-password")
        print(f"   SMTP_SERVER=smtp.gmail.com")
        print(f"   SMTP_PORT=587")
        return False
    
    print(f"\n✅ Email configuration looks good!")
    
    # Test email sending
    test_email = input(f"\nWould you like to send a test email? (y/n): ").lower()
    if test_email == 'y':
        recipient = input(f"Enter recipient email address: ")
        try:
            from app.utils.email_sender import send_email
            
            html_content = """
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #667eea;">Test Email from Smart Blood Connect</h2>
                    <p>This is a test email to verify your email configuration is working correctly.</p>
                    <p>If you received this email, your email settings are configured properly! ✅</p>
                </body>
            </html>
            """
            
            print(f"\n📤 Sending test email to {recipient}...")
            send_email(
                to_email=recipient,
                subject="Test Email - Smart Blood Connect",
                html_content=html_content
            )
            print(f"\n✅ Test email sent successfully!")
            print(f"   Check {recipient} inbox")
            
        except Exception as e:
            print(f"\n❌ Failed to send test email:")
            print(f"   Error: {str(e)}")
            return False
    
    print(f"\n{'='*60}")
    return True

if __name__ == "__main__":
    check_email_config()
