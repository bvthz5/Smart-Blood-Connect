import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_email, subject, html_content):
    """
    Send HTML email using SMTP
    
    Args:
        to_email (str): Recipient email address
        subject (str): Email subject
        html_content (str): HTML content of the email
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Get email configuration from environment variables
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        sender_email = os.getenv('SENDER_EMAIL')
        sender_password = os.getenv('SENDER_PASSWORD')
        sender_name = os.getenv('SENDER_NAME', 'Smart Blood Connect')
        
        # Check if using SSL (port 465) or TLS (port 587)
        use_ssl = os.getenv('SMTP_USE_SSL', 'false').lower() == 'true'
        use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        
        print(f"\n📧 Email Configuration:")
        print(f"   SMTP Server: {smtp_server}")
        print(f"   SMTP Port: {smtp_port}")
        print(f"   Use SSL: {use_ssl}")
        print(f"   Use TLS: {use_tls}")
        print(f"   Sender Email: {sender_email}")
        print(f"   Sender Name: {sender_name}")
        print(f"   Password Set: {'Yes' if sender_password else 'No'}")
        
        if not sender_email or not sender_password:
            error_msg = "❌ Email configuration not found. Please set SENDER_EMAIL and SENDER_PASSWORD in .env file"
            print(error_msg)
            raise ValueError(error_msg)
        
        print(f"\n📤 Preparing to send email to: {to_email}")
        print(f"   Subject: {subject}")
        
        # Create message
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = f"{sender_name} <{sender_email}>"
        message['To'] = to_email
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        print(f"🔌 Connecting to SMTP server: {smtp_server}:{smtp_port}")
        
        # Use SSL (port 465) or TLS (port 587) based on configuration
        if use_ssl or smtp_port == 465:
            # Use SMTP_SSL for port 465
            print(f"🔐 Using SSL encryption...")
            with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=15) as server:
                print(f"🔑 Logging in as: {sender_email}")
                server.login(sender_email, sender_password)
                
                print(f"📨 Sending message...")
                server.send_message(message)
        else:
            # Use SMTP with STARTTLS for port 587
            with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
                if use_tls:
                    print(f"🔐 Starting TLS encryption...")
                    server.starttls()
                
                print(f"🔑 Logging in as: {sender_email}")
                server.login(sender_email, sender_password)
                
                print(f"📨 Sending message...")
                server.send_message(message)
        
        print(f"✅ Email sent successfully to {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"❌ SMTP Authentication failed: {str(e)}\n   Check your SENDER_EMAIL and SENDER_PASSWORD in .env file"
        print(error_msg)
        raise Exception(error_msg)
    except smtplib.SMTPException as e:
        error_msg = f"❌ SMTP Error: {str(e)}"
        print(error_msg)
        raise Exception(error_msg)
    except Exception as e:
        error_msg = f"❌ Failed to send email to {to_email}: {str(e)}"
        print(error_msg)
        raise Exception(error_msg)
