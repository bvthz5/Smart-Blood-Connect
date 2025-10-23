import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./donor-settings.css";

const DonorSettings = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("password");
  const [toast, setToast] = useState("");

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    two_factor_auth: false,
    email_verification: true,
    sms_alerts: true,
    login_notifications: true
  });

  // Account Status
  const [accountStatus, setAccountStatus] = useState({
    is_active: true,
    deactivation_reason: ""
  });

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast("❌ Passwords do not match!");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      showToast("❌ Password must be at least 8 characters!");
      return;
    }

    try {
      // API call here
      showToast("✅ Password changed successfully!");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });
    } catch (error) {
      showToast("❌ Failed to change password!");
    }
  }

  async function handleSecurityUpdate(setting, value) {
    setSecuritySettings({ ...securitySettings, [setting]: value });
    showToast(`✅ ${setting.replace(/_/g, ' ')} ${value ? 'enabled' : 'disabled'}!`);
  }

  async function handleDeactivateAccount() {
    if (!accountStatus.deactivation_reason) {
      showToast("❌ Please provide a reason for deactivation!");
      return;
    }

    const confirmed = window.confirm(
      "⚠️ Are you sure you want to deactivate your account? You can reactivate it later by logging in."
    );

    if (confirmed) {
      try {
        // API call here
        showToast("✅ Account deactivated. Redirecting...");
        setTimeout(() => navigate('/donor/login'), 2000);
      } catch (error) {
        showToast("❌ Failed to deactivate account!");
      }
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "🗑️ WARNING: This action CANNOT be undone! All your data will be permanently deleted. Are you absolutely sure?"
    );

    if (confirmed) {
      const doubleConfirm = window.confirm(
        "⚠️ FINAL WARNING: Your donation history, profile, and all data will be lost forever. Type YES to confirm."
      );

      if (doubleConfirm) {
        try {
          // API call here
          showToast("✅ Account deletion request submitted. Awaiting admin review...");
          setTimeout(() => navigate('/donor/login'), 3000);
        } catch (error) {
          showToast("❌ Failed to submit deletion request!");
        }
      }
    }
  }

  return (
    <div className="donor-settings">
      {/* Header */}
      <header className="settings-header">
        <button className="back-btn" onClick={() => navigate('/donor/dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>⚙️ Settings & Security</h1>
      </header>

      <div className="settings-container">
        {/* Sidebar Navigation */}
        <aside className="settings-sidebar">
          <nav className="settings-nav">
            <button 
              className={`nav-item ${activeSection === 'password' ? 'active' : ''}`}
              onClick={() => setActiveSection('password')}
            >
              <span className="nav-icon">🔑</span>
              <span>Change Password</span>
            </button>

            <button 
              className={`nav-item ${activeSection === 'security' ? 'active' : ''}`}
              onClick={() => setActiveSection('security')}
            >
              <span className="nav-icon">🔐</span>
              <span>Security Settings</span>
            </button>

            <button 
              className={`nav-item ${activeSection === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveSection('privacy')}
            >
              <span className="nav-icon">🛡️</span>
              <span>Privacy & Data</span>
            </button>

            <button 
              className={`nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveSection('notifications')}
            >
              <span className="nav-icon">🔔</span>
              <span>Notifications</span>
            </button>

            <button 
              className={`nav-item ${activeSection === 'account' ? 'active' : ''}`}
              onClick={() => setActiveSection('account')}
            >
              <span className="nav-icon">⚠️</span>
              <span>Account Status</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="settings-main">
          {/* Change Password Section */}
          {activeSection === 'password' && (
            <div className="settings-section">
              <h2 className="section-title">🔑 Change Password</h2>
              <p className="section-description">
                Update your password to keep your account secure. Use a strong password with at least 8 characters.
              </p>

              <form className="password-form" onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label>🔒 Current Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                    placeholder="Enter your current password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>🔐 New Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    placeholder="Enter new password (min 8 characters)"
                    required
                  />
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className="strength-fill" 
                        style={{
                          width: `${Math.min(100, (passwordForm.new_password.length / 12) * 100)}%`,
                          background: passwordForm.new_password.length < 8 ? 'var(--error)' : 
                                      passwordForm.new_password.length < 12 ? 'var(--warning)' : 
                                      'var(--success)'
                        }}
                      ></div>
                    </div>
                    <small>
                      {passwordForm.new_password.length < 8 && "Weak"}
                      {passwordForm.new_password.length >= 8 && passwordForm.new_password.length < 12 && "Moderate"}
                      {passwordForm.new_password.length >= 12 && "Strong"}
                    </small>
                  </div>
                </div>

                <div className="form-group">
                  <label>✅ Confirm New Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                    placeholder="Re-enter new password"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary">
                  💾 Update Password
                </button>
              </form>

              <div className="security-tips">
                <h4>🛡️ Password Security Tips</h4>
                <ul>
                  <li>✓ Use at least 8 characters (12+ recommended)</li>
                  <li>✓ Mix uppercase and lowercase letters</li>
                  <li>✓ Include numbers and special characters</li>
                  <li>✓ Avoid common words or personal information</li>
                  <li>✓ Don't reuse passwords from other sites</li>
                </ul>
              </div>
            </div>
          )}

          {/* Security Settings Section */}
          {activeSection === 'security' && (
            <div className="settings-section">
              <h2 className="section-title">🔐 Security Settings</h2>
              <p className="section-description">
                Manage your account security preferences and authentication methods.
              </p>

              <div className="security-options">
                <div className="security-card">
                  <div className="security-info">
                    <h4>🧩 Two-Factor Authentication (2FA)</h4>
                    <p>Add an extra layer of security with OTP verification</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={securitySettings.two_factor_auth}
                      onChange={(e) => handleSecurityUpdate('two_factor_auth', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="security-card">
                  <div className="security-info">
                    <h4>📧 Email Verification</h4>
                    <p>Require email verification for sensitive actions</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={securitySettings.email_verification}
                      onChange={(e) => handleSecurityUpdate('email_verification', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="security-card">
                  <div className="security-info">
                    <h4>📱 SMS Security Alerts</h4>
                    <p>Get notified via SMS for suspicious login attempts</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={securitySettings.sms_alerts}
                      onChange={(e) => handleSecurityUpdate('sms_alerts', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="security-card">
                  <div className="security-info">
                    <h4>🔔 Login Notifications</h4>
                    <p>Receive alerts when someone logs into your account</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={securitySettings.login_notifications}
                      onChange={(e) => handleSecurityUpdate('login_notifications', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="recent-activity">
                <h3>🕒 Recent Login Activity</h3>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon">💻</div>
                    <div className="activity-details">
                      <div className="activity-device">Windows - Chrome</div>
                      <div className="activity-location">📍 Kochi, Kerala</div>
                      <div className="activity-time">🕐 2 hours ago</div>
                    </div>
                    <span className="activity-status current">Current Session</span>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">📱</div>
                    <div className="activity-details">
                      <div className="activity-device">Android - Chrome Mobile</div>
                      <div className="activity-location">📍 Kochi, Kerala</div>
                      <div className="activity-time">🕐 Yesterday at 10:30 AM</div>
                    </div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">💻</div>
                    <div className="activity-details">
                      <div className="activity-device">Windows - Firefox</div>
                      <div className="activity-location">📍 Kochi, Kerala</div>
                      <div className="activity-time">🕐 3 days ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy & Data Section */}
          {activeSection === 'privacy' && (
            <div className="settings-section">
              <h2 className="section-title">🛡️ Privacy & Data</h2>
              <p className="section-description">
                Control your privacy settings and manage your data.
              </p>

              <div className="privacy-options">
                <div className="privacy-card">
                  <h4>📊 Data Download</h4>
                  <p>Download a copy of all your data including donation history, matches, and profile information.</p>
                  <button className="btn-secondary">
                    📥 Download My Data
                  </button>
                </div>

                <div className="privacy-card">
                  <h4>👁️ Profile Visibility</h4>
                  <p>Control who can see your profile and donation statistics.</p>
                  <select className="privacy-select">
                    <option value="public">Public (Visible to all hospitals)</option>
                    <option value="verified">Verified Hospitals Only</option>
                    <option value="private">Private (Hidden from all)</option>
                  </select>
                </div>

                <div className="privacy-card">
                  <h4>🗺️ Location Sharing</h4>
                  <p>Allow hospitals to see your approximate location for nearby donation requests.</p>
                  <label className="toggle-switch-block">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider-block"></span>
                    <span className="toggle-label">Enable Location Sharing</span>
                  </label>
                </div>

                <div className="privacy-card">
                  <h4>📧 Marketing Communications</h4>
                  <p>Receive updates about new features, donation campaigns, and community events.</p>
                  <label className="toggle-switch-block">
                    <input type="checkbox" />
                    <span className="toggle-slider-block"></span>
                    <span className="toggle-label">Opt-in to Marketing Emails</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="settings-section">
              <h2 className="section-title">🔔 Notification Preferences</h2>
              <p className="section-description">
                Customize when and how you receive notifications.
              </p>

              <div className="notification-groups">
                <div className="notification-group">
                  <h4>🩸 Donation Requests</h4>
                  <div className="notification-options">
                    <label className="checkbox-option">
                      <input type="checkbox" defaultChecked />
                      <span>Email notifications for urgent requests</span>
                    </label>
                    <label className="checkbox-option">
                      <input type="checkbox" defaultChecked />
                      <span>SMS alerts for critical matches</span>
                    </label>
                    <label className="checkbox-option">
                      <input type="checkbox" />
                      <span>Push notifications (if mobile app installed)</span>
                    </label>
                  </div>
                </div>

                <div className="notification-group">
                  <h4>🏥 Hospital Updates</h4>
                  <div className="notification-options">
                    <label className="checkbox-option">
                      <input type="checkbox" defaultChecked />
                      <span>New hospitals in your area</span>
                    </label>
                    <label className="checkbox-option">
                      <input type="checkbox" />
                      <span>Blood drive events nearby</span>
                    </label>
                  </div>
                </div>

                <div className="notification-group">
                  <h4>📊 Account Activity</h4>
                  <div className="notification-options">
                    <label className="checkbox-option">
                      <input type="checkbox" defaultChecked />
                      <span>Profile updates and changes</span>
                    </label>
                    <label className="checkbox-option">
                      <input type="checkbox" defaultChecked />
                      <span>Security alerts</span>
                    </label>
                    <label className="checkbox-option">
                      <input type="checkbox" />
                      <span>Weekly donation summary</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="quiet-hours">
                <h4>🌙 Quiet Hours</h4>
                <p>Don't receive non-urgent notifications during these hours</p>
                <div className="time-inputs">
                  <label>
                    From:
                    <input type="time" defaultValue="22:00" />
                  </label>
                  <label>
                    To:
                    <input type="time" defaultValue="08:00" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Account Status Section */}
          {activeSection === 'account' && (
            <div className="settings-section">
              <h2 className="section-title">⚠️ Account Management</h2>
              <p className="section-description">
                Manage your account status or request account deletion.
              </p>

              <div className="danger-zone">
                <div className="danger-card">
                  <div className="danger-info">
                    <h4>🔓 Deactivate Account</h4>
                    <p>
                      Temporarily disable your account. You can reactivate it anytime by logging in again. 
                      Your data will be preserved.
                    </p>
                    <div className="form-group mt-3">
                      <label>Reason for deactivation (optional):</label>
                      <textarea 
                        rows="3"
                        value={accountStatus.deactivation_reason}
                        onChange={(e) => setAccountStatus({...accountStatus, deactivation_reason: e.target.value})}
                        placeholder="Help us improve by telling us why..."
                      ></textarea>
                    </div>
                    <button className="btn-warning" onClick={handleDeactivateAccount}>
                      🔓 Deactivate Account
                    </button>
                  </div>
                </div>

                <div className="danger-card delete-card">
                  <div className="danger-info">
                    <h4>🗑️ Delete Account Permanently</h4>
                    <p>
                      <strong>⚠️ WARNING:</strong> This action cannot be undone! All your data, including:
                    </p>
                    <ul>
                      <li>✗ Profile information</li>
                      <li>✗ Donation history</li>
                      <li>✗ Match records</li>
                      <li>✗ AI insights and statistics</li>
                    </ul>
                    <p>will be permanently deleted. This request will be reviewed by an admin before final deletion.</p>
                    <button className="btn-danger" onClick={handleDeleteAccount}>
                      🗑️ Request Account Deletion
                    </button>
                  </div>
                </div>
              </div>

              <div className="account-info">
                <h4>📋 Account Information</h4>
                <div className="info-row">
                  <span>Account Created:</span>
                  <strong>January 15, 2024</strong>
                </div>
                <div className="info-row">
                  <span>Last Login:</span>
                  <strong>2 hours ago</strong>
                </div>
                <div className="info-row">
                  <span>Account Status:</span>
                  <strong className="status-active">✅ Active</strong>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          <div className="toast-content">
            <span>{toast}</span>
            <button onClick={() => setToast("")}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonorSettings;
