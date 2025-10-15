# Forgot Password Setup Guide

## Overview
Both **Admin** and **Seeker** forgot password flows are implemented and separated:
- Admin: `/admin/auth/forgot-password` → `/admin/reset-password`
- Seeker: `/api/auth/forgot-password` → `/seeker/reset-password`

## Required Environment Variables

Add these to `backend/.env` (no quotes for any values):

```env
# Database
DATABASE_URL=postgresql+psycopg2://postgres:123@localhost:5432/smartblood

# JWT
JWT_SECRET_KEY=5e26281f3383022e638471a811bebb70b2f084b0740d612ac11b26fa52040708
ACCESS_EXPIRES_MINUTES=60
REFRESH_EXPIRES_DAYS=7
RESET_EXPIRES_MINUTES=15
OTP_SECRET=otp-secret

# Admin seed
ADMIN_EMAIL=smartblooda@gmail.com
ADMIN_PASSWORD=Admin@123

# SMTP (Gmail with App Password)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=465
SMTP_USE_TLS=false
SMTP_USE_SSL=true
SENDER_EMAIL=smartblooda@gmail.com
SENDER_PASSWORD=pwmgxytyoibpfzug
SENDER_NAME=SmartBlood

# Frontend base URL (for reset links)
FRONTEND_URL=http://localhost:3000
```

### Important Notes:
- **No quotes** around any values (not even strings)
- For Gmail: Use **App Password** (requires 2FA enabled)
  - Go to: Google Account → Security → App passwords
- Port 465 requires `SMTP_USE_SSL=true` and `SMTP_USE_TLS=false`
- Alternative: Port 587 with `SMTP_USE_SSL=false` and `SMTP_USE_TLS=true`

## Testing the Setup

### 1. Test Email Configuration
Run this from the `backend` directory:
```bash
python check_email_setup.py
```

This will:
- Show all loaded environment variables
- Test SMTP connection and authentication
- Report any configuration issues

### 2. Restart Backend
After updating `.env`, restart your Flask backend:
```bash
# Stop the current backend (Ctrl+C)
# Then restart
python run.py
```

### 3. Check Startup Logs
Look for these log lines when backend starts:
```
[EMAIL CONFIG] Validating email configuration...
[EMAIL CONFIG] SMTP_SERVER: smtp.gmail.com
[EMAIL CONFIG] SMTP_PORT: 465
[EMAIL CONFIG] SMTP_USE_SSL: True
[EMAIL CONFIG] SENDER_EMAIL: smartblooda@gmail.com
[EMAIL CONFIG] SENDER_PASSWORD: ****************
[EMAIL CONFIG] Email configuration validated successfully
```

### 4. Test Admin Forgot Password
1. Go to: `http://localhost:3000/admin/forgot-password`
2. Enter admin email: `smartblooda@gmail.com`
3. Click "Send Reset Instructions"
4. Check backend logs for:
   ```
   [ADMIN FORGOT PASSWORD] Request received for email: smartblooda@gmail.com
   [ADMIN FORGOT PASSWORD] Admin user found: 1
   [ADMIN FORGOT PASSWORD] Reset token created
   [ADMIN FORGOT PASSWORD] Reset link: http://localhost:3000/admin/reset-password?token=...
   [EMAIL SERVICE] Starting password reset email to smartblooda@gmail.com
   [EMAIL SERVICE] Using SMTP_SSL on port 465
   [EMAIL SERVICE] Connected to SMTP server
   [EMAIL SERVICE] Login successful
   [EMAIL SERVICE] Email sent successfully
   ```

### 5. Test Seeker Forgot Password
1. Go to: `http://localhost:3000/seeker/forgot-password`
2. Enter a registered user email
3. Check backend logs for similar output

## Troubleshooting

### Email Not Arriving
1. **Check spam/junk folder**
2. **Check backend logs** for error messages
3. **Verify Gmail settings**:
   - 2FA is enabled
   - App Password is correct (16 characters, no spaces)
   - IMAP/SMTP access is allowed

### Common Errors

#### Authentication Failed
```
[EMAIL SERVICE] SMTP Authentication failed: (535, b'5.7.8 Username and Password not accepted')
```
**Solution**: 
- Use App Password, not regular Gmail password
- Ensure no spaces in the password
- Regenerate App Password if needed

#### Connection Timeout
```
[EMAIL SERVICE] Failed to send password reset email: timed out
```
**Solution**:
- Check firewall/antivirus blocking port 465
- Try port 587 with TLS instead
- Check if ISP blocks SMTP

#### SSL/TLS Error
```
[EMAIL SERVICE] SMTP error: [SSL: WRONG_VERSION_NUMBER]
```
**Solution**:
- For port 465: `SMTP_USE_SSL=true`, `SMTP_USE_TLS=false`
- For port 587: `SMTP_USE_SSL=false`, `SMTP_USE_TLS=true`

### Logs Not Showing
If you don't see the detailed logs:
1. Ensure you restarted the backend after code changes
2. Check Flask logging level is INFO or DEBUG
3. Look in the terminal/console where backend is running

## Flow Details

### Admin Flow
1. User visits `/admin/forgot-password`
2. Frontend calls `POST /admin/auth/forgot-password` with `{ "email": "..." }`
3. Backend:
   - Finds admin user by email
   - Creates JWT with claim `{"pr": "admin_reset"}` valid for 15 minutes
   - Sends email with link: `FRONTEND_URL/admin/reset-password?token=...`
4. User clicks link, enters new password
5. Frontend calls `POST /admin/auth/reset-password` with `{ "token": "...", "new_password": "..." }`
6. Backend verifies token, updates password, revokes all sessions

### Seeker Flow
1. User visits `/seeker/forgot-password`
2. Frontend calls `POST /api/auth/forgot-password` with `{ "email_or_phone": "..." }`
3. Backend:
   - Finds user by email
   - Creates JWT with claim `{"pr": "reset"}` valid for 15 minutes
   - Sends email with link: `FRONTEND_URL/seeker/reset-password?token=...`
4. User clicks link, enters new password
5. Frontend calls `POST /api/auth/reset-password` with `{ "token": "...", "new_password": "..." }`
6. Backend verifies token, updates password, revokes all sessions

## Files Modified

### Backend
- `backend/app/admin/login.py` - Admin forgot/reset endpoints with logging
- `backend/app/auth/routes.py` - Seeker forgot/reset endpoints
- `backend/app/services/email_service.py` - Email sending with detailed logging
- `backend/app/config/email_config.py` - Email configuration with validation logging
- `backend/app/config/__init__.py` - Flask config with RESET_EXPIRES_MINUTES

### Frontend
- `frontend/src/pages/admin/AdminForgotPassword.jsx` - Admin forgot password UI
- `frontend/src/pages/admin/AdminResetPassword.jsx` - Admin reset password UI
- `frontend/src/pages/seeker/SeekerForgotPassword.jsx` - Seeker forgot password UI
- `frontend/src/pages/seeker/SeekerResetPassword.jsx` - Seeker reset password UI
- `frontend/src/services/api.js` - API calls for forgot/reset
- `frontend/src/App.jsx` - Routes configured

## Security Features
- Generic responses (doesn't reveal if email exists)
- Time-limited tokens (15 minutes default)
- Separate claims for admin vs seeker (`admin_reset` vs `reset`)
- All existing sessions revoked on password change
- HTTPS recommended for production

## Next Steps
1. Update `backend/.env` with correct values (no quotes)
2. Run `python check_email_setup.py` to verify
3. Restart backend
4. Test both admin and seeker flows
5. Check backend logs for any errors
6. Share log output if issues persist
