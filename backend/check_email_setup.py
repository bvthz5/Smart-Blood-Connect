"""
Quick test script to verify email configuration is loaded correctly
Run this from the backend directory: python check_email_setup.py
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=" * 60)
print("EMAIL CONFIGURATION CHECK")
print("=" * 60)

# Check all email-related environment variables
env_vars = {
    'SMTP_SERVER': os.getenv('SMTP_SERVER'),
    'SMTP_PORT': os.getenv('SMTP_PORT'),
    'SMTP_USE_TLS': os.getenv('SMTP_USE_TLS'),
    'SMTP_USE_SSL': os.getenv('SMTP_USE_SSL'),
    'SENDER_EMAIL': os.getenv('SENDER_EMAIL'),
    'SENDER_PASSWORD': os.getenv('SENDER_PASSWORD'),
    'SENDER_NAME': os.getenv('SENDER_NAME'),
    'FRONTEND_URL': os.getenv('FRONTEND_URL'),
    'RESET_EXPIRES_MINUTES': os.getenv('RESET_EXPIRES_MINUTES'),
}

for key, value in env_vars.items():
    if key == 'SENDER_PASSWORD' and value:
        print(f"{key}: {'*' * len(value)} (length: {len(value)})")
    elif value:
        print(f"{key}: {value}")
    else:
        print(f"{key}: NOT SET ❌")

print("=" * 60)

# Check if all required fields are present
required = ['SMTP_SERVER', 'SMTP_PORT', 'SENDER_EMAIL', 'SENDER_PASSWORD']
missing = [k for k in required if not env_vars.get(k)]

if missing:
    print(f"\n⚠️  MISSING REQUIRED FIELDS: {', '.join(missing)}")
else:
    print("\n✅ All required email configuration fields are set")

# Test SMTP connection
print("\n" + "=" * 60)
print("TESTING SMTP CONNECTION")
print("=" * 60)

try:
    import smtplib
    import ssl
    
    smtp_server = env_vars['SMTP_SERVER']
    smtp_port = int(env_vars['SMTP_PORT'])
    sender_email = env_vars['SENDER_EMAIL']
    sender_password = env_vars['SENDER_PASSWORD']
    use_ssl = env_vars.get('SMTP_USE_SSL', 'false').lower() in ('true', '1', 'yes')
    use_tls = env_vars.get('SMTP_USE_TLS', 'true').lower() in ('true', '1', 'yes')
    
    print(f"Connecting to {smtp_server}:{smtp_port}")
    print(f"SSL: {use_ssl}, TLS: {use_tls}")
    
    context = ssl.create_default_context()
    
    if use_ssl:
        print("Using SMTP_SSL...")
        server = smtplib.SMTP_SSL(smtp_server, smtp_port, context=context, timeout=10)
        print("✅ Connected via SSL")
    else:
        print("Using SMTP with STARTTLS...")
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        server.ehlo()
        if use_tls:
            server.starttls(context=context)
            server.ehlo()
        print("✅ Connected")
    
    print("Attempting login...")
    server.login(sender_email, sender_password)
    print("✅ Authentication successful!")
    
    server.quit()
    print("\n✅ SMTP configuration is working correctly!")
    
except Exception as e:
    print(f"\n❌ SMTP connection failed: {str(e)}")
    print("\nCommon issues:")
    print("1. Wrong SMTP_PORT (try 587 for TLS or 465 for SSL)")
    print("2. Wrong SMTP_USE_TLS/SMTP_USE_SSL combination")
    print("3. Invalid App Password (Gmail requires App Password with 2FA)")
    print("4. Firewall blocking SMTP ports")

print("=" * 60)
