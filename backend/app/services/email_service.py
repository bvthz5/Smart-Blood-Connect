import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
import os
from datetime import datetime, timedelta
from app.config.email_config import EmailConfig

class EmailService:
    def __init__(self):
        self.smtp_server = EmailConfig.SMTP_SERVER
        self.smtp_port = EmailConfig.SMTP_PORT
        self.sender_email = EmailConfig.SENDER_EMAIL
        self.sender_password = EmailConfig.SENDER_PASSWORD
        self.sender_name = EmailConfig.SENDER_NAME

    def send_password_reset_email(self, recipient_email, reset_link, user_name="User"):
        """Send password reset email with provided reset link"""
        try:
            current_app.logger.info(f"[EMAIL SERVICE] Starting password reset email to {recipient_email}")
            current_app.logger.info(f"[EMAIL SERVICE] SMTP Server: {self.smtp_server}:{self.smtp_port}")
            current_app.logger.info(f"[EMAIL SERVICE] Sender: {self.sender_email}")
            current_app.logger.info(f"[EMAIL SERVICE] User name: {user_name}")

            subject = EmailConfig.RESET_SUBJECT if hasattr(EmailConfig, 'RESET_SUBJECT') else "SmartBlood - Password Reset"
            html_content = self._create_password_reset_html(user_name, reset_link)
            text_content = self._create_password_reset_text(user_name, reset_link)

            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.sender_name} <{self.sender_email}>"
            message["To"] = recipient_email

            # Add both text and HTML parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")

            message.attach(text_part)
            message.attach(html_part)

            current_app.logger.info(f"[EMAIL SERVICE] Message created, preparing to send")

            # Send email with proper TLS/SSL handling
            context = ssl.create_default_context()
            use_ssl = getattr(EmailConfig, 'SMTP_USE_SSL', False)
            use_tls = getattr(EmailConfig, 'SMTP_USE_TLS', True)

            current_app.logger.info(f"[EMAIL SERVICE] SSL: {use_ssl}, TLS: {use_tls}")

            if use_ssl:
                current_app.logger.info(f"[EMAIL SERVICE] Using SMTP_SSL on port {self.smtp_port}")
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context, timeout=20) as server:
                    current_app.logger.info(f"[EMAIL SERVICE] Connected to SMTP server")
                    server.set_debuglevel(1)  # Enable SMTP debug output
                    server.login(self.sender_email, self.sender_password)
                    current_app.logger.info(f"[EMAIL SERVICE] Login successful")
                    server.sendmail(self.sender_email, recipient_email, message.as_string())
                    current_app.logger.info(f"[EMAIL SERVICE] Email sent successfully")
            else:
                current_app.logger.info(f"[EMAIL SERVICE] Using SMTP with STARTTLS on port {self.smtp_port}")
                with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=20) as server:
                    current_app.logger.info(f"[EMAIL SERVICE] Connected to SMTP server")
                    server.set_debuglevel(1)  # Enable SMTP debug output
                    server.ehlo()
                    if use_tls:
                        current_app.logger.info(f"[EMAIL SERVICE] Starting TLS")
                        server.starttls(context=context)
                        server.ehlo()
                    server.login(self.sender_email, self.sender_password)
                    current_app.logger.info(f"[EMAIL SERVICE] Login successful")
                    server.sendmail(self.sender_email, recipient_email, message.as_string())
                    current_app.logger.info(f"[EMAIL SERVICE] Email sent successfully")

            current_app.logger.info(f"Password reset email sent to {recipient_email}")
            return True

        except smtplib.SMTPAuthenticationError as e:
            current_app.logger.error(f"[EMAIL SERVICE] SMTP Authentication failed: {str(e)}")
            return False
        except smtplib.SMTPException as e:
            current_app.logger.error(f"[EMAIL SERVICE] SMTP error: {str(e)}")
            return False
        except Exception as e:
            current_app.logger.error(f"[EMAIL SERVICE] Failed to send password reset email to {recipient_email}: {str(e)}", exc_info=True)
            return False

    def _create_password_reset_html(self, user_name, reset_link):
        """Professional short HTML email for password reset"""
        expiry = int(current_app.config.get("RESET_EXPIRES_MINUTES", 15))
        preheader = "Reset your SmartBlood password"
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SmartBlood - Password Reset</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .container {{
                    background-color: #ffffff;
                    border-radius: 10px;
                    padding: 24px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
                }}
                .header {{ text-align: left; margin-bottom: 16px; }}
                .logo {{
                    font-size: 20px; font-weight: 700; color: #e74c3c; margin-bottom: 4px;
                }}
                .subtitle {{ color: #666; font-size: 13px; }}
                .content {{
                    margin-bottom: 18px;
                }}
                .reset-button {{
                    display: inline-block;
                    background-color: #e74c3c;
                    color: white;
                    padding: 12px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: 600;
                    text-align: center;
                    margin: 12px 0;
                    transition: background-color 0.3s;
                }}
                .reset-button:hover {{
                    background-color: #c0392b;
                }}
                .reset-link {{
                    word-break: break-all;
                    background-color: #f8f9fa;
                    padding: 8px;
                    border-radius: 5px;
                    font-family: monospace;
                    font-size: 12px; margin: 10px 0;
                }}
                .footer {{ margin-top: 16px; font-size: 12px; color: #666; }}
                .preheader {{ display:none; visibility:hidden; opacity:0; height:0; width:0; mso-hide:all; }}
            </style>
        </head>
        <body>
            <span class="preheader">{preheader}</span>
            <div class="container">
                <div class="header">
                    <div class="logo">🩸 SmartBlood</div>
                    <div class="subtitle">Password Reset</div>
                </div>

                <div class="content">
                    <p>Dear {user_name},</p>
                    <p>We received a request to reset your SmartBlood account password. Click the button below to continue.</p>

                    <div style="text-align: left;">
                        <a href="{reset_link}" class="reset-button">Reset Password</a>
                    </div>

                    <p>If the button doesn't work, copy and paste this link in your browser:</p>
                    <div class="reset-link">{reset_link}</div>
                    <p style="color:#666; font-size:12px;">This link expires in {expiry} minutes. If you didn't request this, you can ignore this email.</p>
                </div>

                <div class="footer"> 2025 SmartBlood</div>
            </div>
        </body>
        </html>
        """

    def _create_password_reset_text(self, user_name, reset_link):
        """Short plain text for password reset"""
        expiry = int(current_app.config.get("RESET_EXPIRES_MINUTES", 15))
        return f"""
SmartBlood - Password Reset

Dear {user_name},

We received a request to reset your SmartBlood account password.
Reset link (expires in {expiry} minutes):
{reset_link}

If you didn't request this, you can ignore this email.
        """

    def send_otp_email(self, recipient_email, otp, user_name="Admin"):
        """Send OTP via email for password reset"""
        try:
            subject = "Password Reset OTP - SmartBlood Admin"

            html_content = self._create_otp_html(user_name, otp)
            text_content = self._create_otp_text(user_name, otp)

            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.sender_name} <{self.sender_email}>"
            message["To"] = recipient_email

            # Add both text and HTML parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")

            message.attach(text_part)
            message.attach(html_part)

            # Send email
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipient_email, message.as_string())

            current_app.logger.info(f"OTP email sent to {recipient_email}")
            return True

        except Exception as e:
            current_app.logger.error(f"Failed to send OTP email to {recipient_email}: {str(e)}")
            return False

    def send_verification_code_email(self, recipient_email, otp, user_name="User"):
        """Send generic email verification code (separate from password reset)"""
        try:
            subject = "Verify your email - SmartBlood"
            html_content = f"""
            <!DOCTYPE html>
            <html><body style='font-family:Segoe UI,Tahoma,Arial,sans-serif'>
            <div style='max-width:560px;margin:auto;background:#ffffff;border-radius:10px;padding:24px;border:1px solid #eee'>
                <h2 style='margin:0 0 8px;color:#111'>Verify your email</h2>
                <p style='color:#444;margin:0 0 12px'>Hello {user_name},</p>
                <p style='color:#444;margin:0 0 12px'>Use the following verification code to confirm your email address:</p>
                <div style='font-size:28px;letter-spacing:4px;font-weight:700;background:#f4f6ff;border:1px dashed #c7d2fe;color:#374151;padding:16px 20px;text-align:center;border-radius:8px;margin:16px 0'>
                    {otp}
                </div>
                <p style='color:#666;margin:12px 0 0'>This code will expire in {int(current_app.config.get('RESET_EXPIRES_MINUTES', 15))} minutes. Do not share it with anyone.</p>
            </div>
            </body></html>
            """
            text_content = f"""
SmartBlood - Email Verification Code

Hello {user_name},

Your verification code is: {otp}

This code expires in {int(current_app.config.get('RESET_EXPIRES_MINUTES', 15))} minutes.
Do not share it with anyone.
"""
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.sender_name} <{self.sender_email}>"
            message["To"] = recipient_email
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")
            message.attach(text_part)
            message.attach(html_part)

            context = ssl.create_default_context()
            if getattr(EmailConfig, 'SMTP_USE_SSL', False):
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context, timeout=20) as server:
                    server.login(self.sender_email, self.sender_password)
                    server.sendmail(self.sender_email, recipient_email, message.as_string())
            else:
                with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=20) as server:
                    if getattr(EmailConfig, 'SMTP_USE_TLS', True):
                        server.starttls(context=context)
                    server.login(self.sender_email, self.sender_password)
                    server.sendmail(self.sender_email, recipient_email, message.as_string())
            current_app.logger.info(f"Verification email sent to {recipient_email}")
            return True
        except Exception as e:
            current_app.logger.error(f"Failed to send verification email to {recipient_email}: {str(e)}")
            return False


    def _create_otp_html(self, user_name, otp):
        """Create HTML email template for OTP"""
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset OTP - SmartBlood Admin</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .container {{
                    background-color: #ffffff;
                    border-radius: 10px;
                    padding: 30px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e74c3c;
                }}
                .logo {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #e74c3c;
                    margin-bottom: 10px;
                }}
                .otp-code {{
                    background-color: #f8f9fa;
                    border: 2px solid #e74c3c;
                    border-radius: 10px;
                    padding: 20px;
                    text-align: center;
                    font-size: 32px;
                    font-weight: bold;
                    color: #e74c3c;
                    letter-spacing: 5px;
                    margin: 20px 0;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🩸 SmartBlood Admin</div>
                </div>

                <div class="content">
                    <h2>Password Reset OTP</h2>
                    <p>Hello {user_name},</p>

                    <p>Use the following OTP to reset your password:</p>

                    <div class="otp-code">{otp}</div>

                    <div class="warning">
                        <strong>⚠️ Important:</strong>
                        <ul>
                            <li>This OTP will expire in 15 minutes</li>
                            <li>Do not share this OTP with anyone</li>
                            <li>If you didn't request this, please ignore this email</li>
                        </ul>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    def _create_otp_text(self, user_name, otp):
        """Create plain text email template for OTP"""
        return f"""
Password Reset OTP - SmartBlood Admin

Hello {user_name},

Use the following OTP to reset your password:

{otp}

IMPORTANT:
- This OTP will expire in 15 minutes
- Do not share this OTP with anyone
- If you didn't request this, please ignore this email

SmartBlood Admin Panel
        """

    def send_email(self, to, subject, html, text=None):
        """
        Generic method to send an email with HTML content
        
        Args:
            to: Recipient email address
            subject: Email subject line
            html: HTML content of the email
            text: Plain text content (optional, will extract from HTML if not provided)
        
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            import smtplib
            
            current_app.logger.info(f"[EMAIL SERVICE] Sending email to {to}: {subject}")
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.sender_name} <{self.sender_email}>"
            message["To"] = to
            
            # Add text part (use simple HTML strip if not provided)
            if text is None:
                import re
                text = re.sub('<[^<]+?>', '', html)  # Simple HTML tag removal
            
            text_part = MIMEText(text, "plain")
            html_part = MIMEText(html, "html")
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Send email with proper TLS/SSL handling
            context = ssl.create_default_context()
            use_ssl = getattr(EmailConfig, 'SMTP_USE_SSL', False)
            use_tls = getattr(EmailConfig, 'SMTP_USE_TLS', True)
            
            if use_ssl:
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context, timeout=20) as server:
                    server.login(self.sender_email, self.sender_password)
                    server.sendmail(self.sender_email, to, message.as_string())
            else:
                with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=20) as server:
                    server.ehlo()
                    if use_tls:
                        server.starttls(context=context)
                        server.ehlo()
                    server.login(self.sender_email, self.sender_password)
                    server.sendmail(self.sender_email, to, message.as_string())
            
            current_app.logger.info(f"Email sent successfully to {to}")
            return True
            
        except Exception as e:
            current_app.logger.error(f"Failed to send email to {to}: {str(e)}")
            return False

# Create global instance
email_service = EmailService()
