import os


def get_staff_invitation_email(staff_name, hospital_name, email, temp_password, accept_url, reject_url):
    """
    Generate HTML email template for staff invitation
    
    Args:
        staff_name (str): Name of the staff member
        hospital_name (str): Name of the hospital
        email (str): Staff email address
        temp_password (str): Temporary password
        accept_url (str): URL to accept invitation
        reject_url (str): URL to reject invitation
    
    Returns:
        str: HTML email content
    """
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Staff Invitation - Smart Blood Connect</title>
        <style>
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f7fa;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 50px 40px;
                text-align: center;
                position: relative;
            }}
            .header::after {{
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #10b981, #3b82f6, #667eea);
            }}
            .header h1 {{
                color: white;
                margin: 0;
                font-size: 32px;
                font-weight: 800;
                letter-spacing: -0.5px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }}
            .header p {{
                color: rgba(255, 255, 255, 0.95);
                margin: 12px 0 0 0;
                font-size: 16px;
                font-weight: 500;
                letter-spacing: 0.5px;
            }}
            .content {{
                padding: 45px 40px;
            }}
            .greeting {{
                font-size: 20px;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 20px 0;
            }}
            .message {{
                font-size: 16px;
                line-height: 1.6;
                color: #4b5563;
                margin: 0 0 30px 0;
            }}
            .hospital-name {{
                color: #667eea;
                font-weight: 700;
            }}
            .credentials-box {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px;
                padding: 32px;
                margin: 35px 0;
                box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
            }}
            .credentials-title {{
                font-size: 15px;
                font-weight: 800;
                color: white;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                margin: 0 0 24px 0;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }}
            .credential-item {{
                background: white;
                border-radius: 12px;
                padding: 20px 24px;
                margin-bottom: 16px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                transition: transform 0.2s ease;
            }}
            .credential-item:last-child {{
                margin-bottom: 0;
            }}
            .credential-item:hover {{
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
            }}
            .credential-label {{
                font-size: 13px;
                font-weight: 600;
                color: #9ca3af;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
                display: block;
            }}
            .credential-value {{
                font-size: 18px;
                font-weight: 700;
                color: #1f2937;
                font-family: 'Courier New', Consolas, monospace;
                letter-spacing: 0.5px;
                word-break: break-all;
                display: block;
                padding: 8px 12px;
                background: #f9fafb;
                border-radius: 6px;
                border: 2px dashed #e5e7eb;
            }}
            .actions {{
                display: flex;
                gap: 20px;
                margin: 35px 0;
            }}
            .btn {{
                flex: 1;
                padding: 18px 28px;
                text-align: center;
                text-decoration: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 700;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                letter-spacing: 0.3px;
                display: inline-block;
            }}
            .btn-accept {{
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }}
            .btn-accept:hover {{
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
            }}
            .btn-reject {{
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
            }}
            .btn-reject:hover {{
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
            }}
            .note {{
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%);
                border-left: 5px solid #3b82f6;
                padding: 20px 24px;
                border-radius: 10px;
                margin: 32px 0;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
            }}
            .note-title {{
                font-size: 14px;
                font-weight: 800;
                color: #3b82f6;
                margin: 0 0 10px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
                gap: 6px;
            }}
            .note-text {{
                font-size: 14px;
                line-height: 1.7;
                color: #4b5563;
                margin: 0;
            }}
            .footer {{
                background: #f9fafb;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }}
            .footer p {{
                font-size: 14px;
                color: #6b7280;
                margin: 0 0 10px 0;
            }}
            .footer-links {{
                margin-top: 16px;
            }}
            .footer-link {{
                color: #667eea;
                text-decoration: none;
                font-weight: 600;
                margin: 0 12px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>🏥 Staff Invitation</h1>
                <p>Smart Blood Connect Platform</p>
            </div>

            <!-- Content -->
            <div class="content">
                <p class="greeting">Dear {staff_name},</p>
                
                <p class="message">
                    Congratulations! You have been selected as a staff member for 
                    <span class="hospital-name">{hospital_name}</span> on the Smart Blood Connect platform.
                </p>

                <p class="message">
                    Smart Blood Connect is a comprehensive blood donation management system that connects 
                    hospitals with donors to save lives. As a staff member, you will be able to manage 
                    blood requests, track donations, and coordinate with donors efficiently.
                </p>

                <!-- Credentials Box -->
                <div class="credentials-box">
                    <div class="credentials-title">
                        <span>🔐</span>
                        <span>Your Login Credentials</span>
                    </div>
                    <div class="credential-item">
                        <span class="credential-label">📧 Email Address</span>
                        <span class="credential-value">{email}</span>
                    </div>
                    <div class="credential-item">
                        <span class="credential-label">🔑 Temporary Password</span>
                        <span class="credential-value">{temp_password}</span>
                    </div>
                </div>

                <!-- Important Note -->
                <div class="note">
                    <div class="note-title">🔒 Important Security Information</div>
                    <p class="note-text">
                        For security reasons, you will be required to change this temporary password 
                        upon your first login. Please keep your credentials confidential and do not 
                        share them with anyone.
                    </p>
                </div>

                <!-- Action Buttons -->
                <div class="actions">
                    <a href="{accept_url}" class="btn btn-accept">
                        ✓ Accept Invitation
                    </a>
                    <a href="{reject_url}" class="btn btn-reject">
                        ✗ Decline Invitation
                    </a>
                </div>

                <p class="message">
                    Please click on "Accept Invitation" to confirm your participation. Once accepted, 
                    you will be able to login to the platform using the credentials provided above.
                </p>

                <p class="message">
                    If you have any questions or need assistance, please don't hesitate to contact 
                    our support team.
                </p>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p><strong>Smart Blood Connect</strong></p>
                <p>Connecting Lives, One Donation at a Time</p>
                <div class="footer-links">
                    <a href="#" class="footer-link">Help Center</a>
                    <a href="#" class="footer-link">Privacy Policy</a>
                    <a href="#" class="footer-link">Terms of Service</a>
                </div>
                <p style="margin-top: 20px; font-size: 12px;">
                    © 2025 Smart Blood Connect. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def get_staff_acceptance_confirmation_email(staff_name, hospital_name, login_url=None):
    """
    Generate HTML email template for staff acceptance confirmation
    
    Args:
        staff_name (str): Name of the staff member
        hospital_name (str): Name of the hospital
        login_url (str): URL to login page (defaults to /seeker/login)
    """
    if not login_url:
        login_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/seeker/login"
    
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Smart Blood Connect</title>
        <style>
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f7fa;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 800;
            }}
            .content {{
                padding: 40px 30px;
                text-align: center;
            }}
            .success-icon {{
                font-size: 64px;
                margin-bottom: 20px;
            }}
            .message {{
                font-size: 18px;
                line-height: 1.6;
                color: #4b5563;
                margin: 20px 0;
            }}
            .hospital-name {{
                color: #10b981;
                font-weight: 700;
            }}
            .btn {{
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 700;
                margin-top: 20px;
            }}
            .footer {{
                background: #f9fafb;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome Aboard!</h1>
            </div>
            <div class="content">
                <div class="success-icon">✓</div>
                <p class="message">
                    Dear {staff_name},
                </p>
                <p class="message">
                    Thank you for accepting the invitation! You are now officially a staff member of 
                    <span class="hospital-name">{hospital_name}</span>.
                </p>
                <p class="message">
                    You can now login to the Smart Blood Connect platform using your credentials. 
                    Remember to change your password upon first login for security.
                </p>
                <a href="{login_url}" class="btn">Login to Dashboard</a>
            </div>
            <div class="footer">
                <p><strong>Smart Blood Connect</strong></p>
                <p>© 2025 Smart Blood Connect. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
