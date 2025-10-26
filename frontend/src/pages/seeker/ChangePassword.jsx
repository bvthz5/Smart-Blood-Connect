import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import seekerService from '../../services/seekerService';
import Nav from '../../components/Nav';
import './ChangePassword.css';

export default function SeekerChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [forceChange, setForceChange] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is a forced password change (first login with auto-generated password)
    const tempToken = localStorage.getItem('seeker_temp_token');
    if (tempToken) {
      setForceChange(true);
    }
  }, []);

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      valid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    const passwordCheck = validatePassword(formData.newPassword);
    if (!passwordCheck.valid) {
      setError('Password does not meet security requirements');
      return;
    }

    setLoading(true);
    try {
      const response = await seekerService.changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      console.log('Password change successful, response:', response);
      setSuccess('Password changed successfully! Redirecting to dashboard...');
      
      // CRITICAL: Remove temp token first
      localStorage.removeItem('seeker_temp_token');

      // Store new full tokens from response
      if (response?.access_token && response?.refresh_token) {
        console.log('Storing new access and refresh tokens');
        localStorage.setItem('seeker_token', response.access_token);
        localStorage.setItem('seeker_refresh_token', response.refresh_token);
      } else {
        console.warn('No tokens in response, may need to re-login');
      }

      // Redirect after 1.5 seconds
      setTimeout(() => {
        console.log('Redirecting to dashboard...');
        navigate('/seeker/dashboard', { replace: true });
      }, 1500);

    } catch (err) {
      console.error('Password change error:', err);
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error;
      setError(apiMsg || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const passwordValidation = validatePassword(formData.newPassword);

  return (
    <div className="change-password-page">
      <Nav />
      
      <div className="change-password-container">
        <div className="change-password-card">
          <div className="change-password-header">
            <h1>{forceChange ? 'Set Your Password' : 'Change Password'}</h1>
            <p>
              {forceChange 
                ? 'Please set a new secure password to continue' 
                : 'Update your account password'}
            </p>
            {forceChange && (
              <div className="force-change-notice">
                <span className="notice-icon">🔒</span>
                <span>For security reasons, you must change your temporary password before accessing the system.</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="change-password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">
                {forceChange ? 'Temporary Password' : 'Current Password'}
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  placeholder={forceChange ? "Enter temporary password" : "Enter current password"}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => togglePasswordVisibility('current')}
                  tabIndex="-1"
                >
                  {showPasswords.current ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => togglePasswordVisibility('new')}
                  tabIndex="-1"
                >
                  {showPasswords.new ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              
              {formData.newPassword && (
                <div className="password-requirements">
                  <p className="requirements-title">Password must contain:</p>
                  <ul>
                    <li className={passwordValidation.minLength ? 'valid' : ''}>
                      {passwordValidation.minLength ? '✓' : '○'} At least 8 characters
                    </li>
                    <li className={passwordValidation.hasUpper ? 'valid' : ''}>
                      {passwordValidation.hasUpper ? '✓' : '○'} One uppercase letter
                    </li>
                    <li className={passwordValidation.hasLower ? 'valid' : ''}>
                      {passwordValidation.hasLower ? '✓' : '○'} One lowercase letter
                    </li>
                    <li className={passwordValidation.hasNumber ? 'valid' : ''}>
                      {passwordValidation.hasNumber ? '✓' : '○'} One number
                    </li>
                    <li className={passwordValidation.hasSpecial ? 'valid' : ''}>
                      {passwordValidation.hasSpecial ? '✓' : '○'} One special character (!@#$%^&*)
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter new password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => togglePasswordVisibility('confirm')}
                  tabIndex="-1"
                >
                  {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="password-mismatch">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                <span className="success-icon">✓</span>
                {success}
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading || !passwordValidation.valid || formData.newPassword !== formData.confirmPassword}
            >
              {loading ? 'Updating...' : forceChange ? 'Set Password & Continue' : 'Change Password'}
            </button>

            {!forceChange && (
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate('/seeker/dashboard')}
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
