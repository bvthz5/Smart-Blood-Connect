"""
Comprehensive Email Diagnostics Tool
Run: python diagnose_email.py
"""
import sys
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

def print_header(title):
    """Print formatted header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def check_env_file():
    """Check if .env file exists"""
    print_header("1. CHECKING .ENV FILE")
    
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        print("✅ .env file found")
        return True
    else:
        print("❌ .env file NOT found")
        print("\n📝 Solution:")
        print("   1. Copy .env.example to .env")
        print("   2. Edit .env and add your email settings")
        print("   3. Run this script again")
        return False

def check_environment_variables():
    """Check if email environment variables are set"""
    print_header("2. CHECKING ENVIRONMENT VARIABLES")
    
    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = os.getenv('SMTP_PORT')
    sender_email = os.getenv('SENDER_EMAIL')
    sender_password = os.getenv('SENDER_PASSWORD')
    sender_name = os.getenv('SENDER_NAME')
    use_ssl = os.getenv('SMTP_USE_SSL')
    use_tls = os.getenv('SMTP_USE_TLS')
    
    print(f"\n📧 Email Configuration:")
    print(f"   SMTP_SERVER:     {smtp_server or '❌ NOT SET'}")
    print(f"   SMTP_PORT:       {smtp_port or '❌ NOT SET'}")
    print(f"   SMTP_USE_SSL:    {use_ssl or 'false (default)'}")
    print(f"   SMTP_USE_TLS:    {use_tls or 'true (default)'}")
    print(f"   SENDER_EMAIL:    {sender_email or '❌ NOT SET'}")
    print(f"   SENDER_PASSWORD: {'✅ SET (' + str(len(sender_password)) + ' chars)' if sender_password else '❌ NOT SET'}")
    print(f"   SENDER_NAME:     {sender_name or 'Smart Blood Connect (default)'}")
    
    # Determine connection type
    if smtp_port:
        port_num = int(smtp_port)
        if port_num == 465 or (use_ssl and use_ssl.lower() == 'true'):
            print(f"\n🔐 Connection Type: SSL (Port {smtp_port})")
        else:
            print(f"\n🔐 Connection Type: TLS (Port {smtp_port})")
    
    if not sender_email or not sender_password:
        print("\n❌ ERROR: Email configuration incomplete!")
        print("\n📝 Add these to your .env file:")
        print("   SENDER_EMAIL=your-email@gmail.com")
        print("   SENDER_PASSWORD=your-app-password")
        print("   SMTP_SERVER=smtp.gmail.com")
        print("   SMTP_PORT=587  # or 465 for SSL")
        return False
    
    print("\n✅ All required variables are set")
    return True

def test_smtp_connection():
    """Test SMTP server connection"""
    print_header("3. TESTING SMTP CONNECTION")
    
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    use_ssl = os.getenv('SMTP_USE_SSL', 'false').lower() == 'true'
    
    print(f"\n🔌 Attempting to connect to {smtp_server}:{smtp_port}...")
    print(f"   Connection type: {'SSL' if use_ssl or smtp_port == 465 else 'TLS'}")
    
    try:
        if use_ssl or smtp_port == 465:
            # Use SSL for port 465
            server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=10)
            print(f"✅ Successfully connected to SMTP server (SSL)")
        else:
            # Use regular SMTP for port 587
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
            print(f"✅ Successfully connected to SMTP server")
        server.quit()
        return True
    except smtplib.SMTPConnectError as e:
        print(f"❌ Connection failed: {e}")
        print("\n📝 Possible solutions:")
        print("   1. Check your internet connection")
        print("   2. Verify SMTP_SERVER and SMTP_PORT are correct")
        print("   3. Check if firewall is blocking the connection")
        return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def test_smtp_authentication():
    """Test SMTP authentication"""
    print_header("4. TESTING SMTP AUTHENTICATION")
    
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    sender_email = os.getenv('SENDER_EMAIL')
    sender_password = os.getenv('SENDER_PASSWORD')
    use_ssl = os.getenv('SMTP_USE_SSL', 'false').lower() == 'true'
    use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
    
    print(f"\n🔑 Attempting to authenticate as {sender_email}...")
    
    try:
        if use_ssl or smtp_port == 465:
            # Use SSL for port 465
            server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=10)
        else:
            # Use regular SMTP for port 587
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
            if use_tls:
                server.starttls()
        
        server.login(sender_email, sender_password)
        print(f"✅ Authentication successful!")
        server.quit()
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Authentication failed: {e}")
        print("\n📝 For Gmail users:")
        print("   1. Enable 2-Step Verification: https://myaccount.google.com/security")
        print("   2. Generate App Password: https://myaccount.google.com/apppasswords")
        print("   3. Use the 16-character App Password (not your regular password)")
        print("   4. Remove any spaces from the App Password")
        print("\n📝 For other email providers:")
        print("   1. Verify your email and password are correct")
        print("   2. Check if SMTP access is enabled")
        print("   3. Check for any security settings blocking SMTP")
        return False
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return False

def send_test_email():
    """Send a test email"""
    print_header("5. SENDING TEST EMAIL")
    
    recipient = input("\n📬 Enter recipient email address (or press Enter to skip): ").strip()
    
    if not recipient:
        print("⏭️  Skipped test email")
        return True
    
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    sender_email = os.getenv('SENDER_EMAIL')
    sender_password = os.getenv('SENDER_PASSWORD')
    
    print(f"\n📤 Sending test email to {recipient}...")
    
    try:
        # Create message
        message = MIMEMultipart('alternative')
        message['Subject'] = "✅ Test Email - Smart Blood Connect"
        message['From'] = f"Smart Blood Connect <{sender_email}>"
        message['To'] = recipient
        
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f7fa; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
                h1 { color: #667eea; }
                .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
                .info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✅ Email Configuration Test</h1>
                <div class="success">
                    <strong>Success!</strong> If you're reading this, your email configuration is working correctly.
                </div>
                <div class="info">
                    <strong>What this means:</strong>
                    <ul>
                        <li>SMTP connection is working</li>
                        <li>Authentication is successful</li>
                        <li>Emails can be sent from Smart Blood Connect</li>
                    </ul>
                </div>
                <p>You can now create hospitals and send staff invitations!</p>
                <hr>
                <p style="color: #6b7280; font-size: 14px;">
                    This is an automated test email from Smart Blood Connect.
                </p>
            </div>
        </body>
        </html>
        """
        
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        # Send email
        use_ssl = os.getenv('SMTP_USE_SSL', 'false').lower() == 'true'
        use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        
        if use_ssl or smtp_port == 465:
            # Use SSL for port 465
            with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=15) as server:
                server.login(sender_email, sender_password)
                server.send_message(message)
        else:
            # Use regular SMTP for port 587
            with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
                if use_tls:
                    server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(message)
        
        print(f"✅ Test email sent successfully!")
        print(f"\n📬 Check {recipient} inbox (and spam folder)")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send test email: {e}")
        return False

def print_summary(results):
    """Print diagnostic summary"""
    print_header("DIAGNOSTIC SUMMARY")
    
    print("\n📊 Test Results:")
    print(f"   .env file:           {'✅ PASS' if results['env_file'] else '❌ FAIL'}")
    print(f"   Environment vars:    {'✅ PASS' if results['env_vars'] else '❌ FAIL'}")
    print(f"   SMTP connection:     {'✅ PASS' if results['smtp_connection'] else '❌ FAIL'}")
    print(f"   SMTP authentication: {'✅ PASS' if results['smtp_auth'] else '❌ FAIL'}")
    print(f"   Test email:          {'✅ PASS' if results['test_email'] else '⏭️  SKIPPED'}")
    
    all_passed = all([
        results['env_file'],
        results['env_vars'],
        results['smtp_connection'],
        results['smtp_auth']
    ])
    
    if all_passed:
        print("\n" + "="*70)
        print("  🎉 ALL TESTS PASSED! Email is configured correctly!")
        print("="*70)
        print("\n✅ You can now:")
        print("   1. Start your backend server")
        print("   2. Create hospitals")
        print("   3. Staff will receive invitation emails")
        print("\n💡 Note: Password will ALWAYS be shown in the success modal")
        print("   for admin reference, whether email succeeds or fails.")
    else:
        print("\n" + "="*70)
        print("  ⚠️  SOME TESTS FAILED - Email may not work correctly")
        print("="*70)
        print("\n📝 Next steps:")
        print("   1. Fix the failed tests above")
        print("   2. Run this script again to verify")
        print("   3. Check EMAIL_TROUBLESHOOTING.md for detailed help")

def main():
    """Run all diagnostics"""
    print("\n" + "="*70)
    print("  📧 SMART BLOOD CONNECT - EMAIL DIAGNOSTICS")
    print("="*70)
    
    results = {
        'env_file': False,
        'env_vars': False,
        'smtp_connection': False,
        'smtp_auth': False,
        'test_email': False
    }
    
    # Run diagnostics in order
    results['env_file'] = check_env_file()
    if not results['env_file']:
        print_summary(results)
        return
    
    results['env_vars'] = check_environment_variables()
    if not results['env_vars']:
        print_summary(results)
        return
    
    results['smtp_connection'] = test_smtp_connection()
    if not results['smtp_connection']:
        print_summary(results)
        return
    
    results['smtp_auth'] = test_smtp_authentication()
    if not results['smtp_auth']:
        print_summary(results)
        return
    
    results['test_email'] = send_test_email()
    
    print_summary(results)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Diagnostic cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
