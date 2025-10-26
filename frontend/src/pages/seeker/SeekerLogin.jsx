import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import seekerService from "../../services/seekerService";
import Nav from "../../components/Nav";
import "./SeekerLogin.css";

export default function SeekerLogin() {
  const [formData, setFormData] = useState({
    email_or_phone: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [toast, setToast] = useState("");

  // Pickup toast message from storage (set by interceptors) and auto-hide
  useEffect(() => {
    const fromStorage = localStorage.getItem('toast_message');
    if (fromStorage) {
      setToast(fromStorage);
      localStorage.removeItem('toast_message');
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  // Validation helpers
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  const isValidPhone = (value) => {
    const digits = (value || '').replace(/\D/g, '');
    return digits.length === 10; // 10-digit local number
  };
  const isValidInput = () => {
    const ident = (formData.email_or_phone || '').trim();
    const pwd = (formData.password || '').trim();
    if (!ident || !pwd) return false;
    return isValidEmail(ident) || isValidPhone(ident);
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const ident = (formData.email_or_phone || '').trim();
    const pwd = (formData.password || '').trim();

    if (!ident || !pwd) {
      setToast('Please enter your email/phone and password.');
      return;
    }
    if (!(isValidEmail(ident) || isValidPhone(ident))) {
      setToast('Enter a valid email address or 10-digit phone number.');
      return;
    }

    setLoading(true);
    try {
      const data = await seekerService.login(ident, pwd);
      console.log('Login response:', data);

      // Check for force password change (first login with auto-generated password)
      if (data?.force_change) {
        console.log('🔒 Force password change required');
        
        // Clear any existing full tokens
        localStorage.removeItem('seeker_token');
        localStorage.removeItem('seeker_refresh_token');
        
        // Store temp token and user info for password change flow
        if (data.temp_token) {
          console.log('Storing temporary token');
          localStorage.setItem('seeker_temp_token', data.temp_token);
        }
        
        if (data.user) {
          console.log('Storing user info for password change flow');
          localStorage.setItem('seeker_user_id', String(data.user.id));
          localStorage.setItem('seeker_user_role', data.user.role);
          if (data.user.hospital_id) {
            localStorage.setItem('seeker_hospital_id', String(data.user.hospital_id));
          }
          if (data.user.email) localStorage.setItem('seeker_user_email', data.user.email);
          if (data.user.phone) localStorage.setItem('seeker_user_phone', data.user.phone);
          if (data.user.name) localStorage.setItem('seeker_user_name', data.user.name);
        }
        
        localStorage.setItem('user_type', 'seeker');
        
        // Show message and redirect to password change page
        setToast('Please change your temporary password to continue.');
        setTimeout(() => {
          console.log('Redirecting to password change page...');
          navigate('/seeker/activate-account', { replace: true });
        }, 500);
        return;
      }

      // Validate critical response fields (no dummy/placeholder usage)
      if (!data?.access_token || !data?.refresh_token || !data?.user) {
        setToast('Login response incomplete. Please try again or contact support.');
        return;
      }
      const u = data.user || {};
      if (u.role !== 'staff') {
        setToast('Only hospital staff accounts can access the seeker portal.');
        return;
      }
      if (u.id === undefined || u.id === null) {
        setToast('User ID missing in response. Please try again.');
        return;
      }
      if (u.hospital_id === undefined || u.hospital_id === null) {
        setToast('Your staff account is not linked to a hospital. Contact your admin.');
        return;
      }

      // Persist tokens and user linkage
      localStorage.setItem('seeker_token', data.access_token);
      localStorage.setItem('seeker_refresh_token', data.refresh_token);
      localStorage.setItem('seeker_user_id', String(u.id));
      localStorage.setItem('seeker_user_role', u.role);
      localStorage.setItem('seeker_hospital_id', String(u.hospital_id));
      if (u.email) localStorage.setItem('seeker_user_email', u.email);
      if (u.phone) localStorage.setItem('seeker_user_phone', u.phone);
      localStorage.setItem('user_type', 'seeker');

      navigate('/seeker/dashboard', { replace: true });
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error;
      const msg = apiMsg || 'Login failed. Please check your credentials.';
      setError(msg);
      setToast(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="seeker-login-page">
      <Nav />

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Seeker Login</h1>
            <p>Access your blood request portal</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email_or_phone">Email or Phone Number</label>
        <input
          type="text"
          id="email_or_phone"
          name="email_or_phone"
          value={formData.email_or_phone}
          onChange={handleInputChange}
          placeholder="Enter your email or phone number"
          required
          autoComplete="email"
          className={error ? "error" : ""}
        />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            className={error ? "error" : ""}
          />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading || !isValidInput()}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

            <div className="form-footer">
              <Link to="/seeker/forgot-password" className="forgot-password">
                Forgot your password?
              </Link>
            </div>
          </form>

        </div>
      </div>

      {/* Toast message */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
          <div style={{ background: '#1f2937', color: 'white', padding: '10px 14px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            {toast}
          </div>
        </div>
      )}

    </div>
  );
}
