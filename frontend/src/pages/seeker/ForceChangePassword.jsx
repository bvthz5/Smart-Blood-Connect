import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import seekerService from '../../services/seekerService';
import './ForceChangePassword.css';

const ForceChangePassword = () => {
  const [oldPassword, setOld] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Check if we have a temp token, otherwise redirect to login
  useEffect(() => {
    const tempToken = localStorage.getItem('seeker_temp_token');
    if (!tempToken) {
      navigate('/seeker/login', { replace: true });
    }
  }, [navigate]);

  const canSubmit = oldPassword && pass && confirm && pass === confirm && pass.length >= 8;

  const onLogout = () => {
    localStorage.removeItem('seeker_temp_token');
    navigate('/seeker/login', { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setError('Please fill all fields correctly. Password must be at least 8 characters.');
      return;
    }
    
    if (pass !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    
    setLoading(true);
    setMsg('');
    setError('');
    
    try {
      const data = await seekerService.changePassword(oldPassword, pass);
      
      if (data?.access_token) {
        // Store new tokens
        localStorage.setItem('seeker_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('seeker_refresh_token', data.refresh_token);
        }
        localStorage.removeItem('seeker_temp_token');
        
        setSuccess(true);
        setMsg('Password changed successfully! Redirecting to dashboard...');
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/seeker/dashboard', { replace: true });
        }, 1500);
      } else {
        setError('Failed to update password. Please try again.');
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.error || err?.response?.data?.message;
      setError(apiMsg || 'Password change failed. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="force-change-container">
      <div className="force-change-overlay" />
      <div className="force-change-modal">
        <div className="force-change-header">
          <div className="icon-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2>Password Change Required</h2>
          <p className="subtitle">For your security, please change your auto-generated password before continuing.</p>
        </div>

        <form onSubmit={submit} className="force-change-form">
          <div className="form-group">
            <label htmlFor="old-password">
              <span className="label-text">Current Password</span>
              <span className="label-required">*</span>
            </label>
            <input
              id="old-password"
              name="old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOld(e.target.value)}
              placeholder="Enter your current password"
              required
              autoFocus
              className={error && !oldPassword ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor="new-password">
              <span className="label-text">New Password</span>
              <span className="label-required">*</span>
            </label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Enter new password (min. 8 characters)"
              required
              minLength={8}
              className={error && pass && pass.length < 8 ? 'error' : ''}
            />
            {pass && pass.length < 8 && (
              <span className="field-hint error">Password must be at least 8 characters</span>
            )}
            {pass && pass.length >= 8 && (
              <span className="field-hint success">✓ Password meets minimum requirements</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">
              <span className="label-text">Confirm New Password</span>
              <span className="label-required">*</span>
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              required
              className={error && confirm && pass !== confirm ? 'error' : ''}
            />
            {confirm && pass !== confirm && (
              <span className="field-hint error">Passwords do not match</span>
            )}
            {confirm && pass === confirm && pass.length >= 8 && (
              <span className="field-hint success">✓ Passwords match</span>
            )}
          </div>

          {error && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && msg && (
            <div className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>{msg}</span>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onLogout}
              disabled={loading}
            >
              Cancel & Logout
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={!canSubmit || loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>

        <div className="force-change-footer">
          <p className="footer-note">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            This is a one-time requirement for security purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForceChangePassword;
