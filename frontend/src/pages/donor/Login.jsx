import React, { useState, useEffect } from "react";
import { login } from "../../services/api";
import { useNavigate, Link, useLocation } from "react-router-dom";
import Nav from "../../components/Nav";
import '../../styles/donor-auth.css'

export default function Login(){
  const [inputType, setInputType] = useState("email"); // "email" or "phone"
  const [ident, setIdent] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  // Enable smooth scroll on window for this page
  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    // Save original scroll behavior
    const originalHtmlScroll = htmlElement.style.scrollBehavior;
    const originalBodyScroll = bodyElement.style.scrollBehavior;

    // Apply smooth scroll
    htmlElement.style.scrollBehavior = 'smooth';
    bodyElement.style.scrollBehavior = 'smooth';

    // Cleanup: restore original behavior when component unmounts
    return () => {
      htmlElement.style.scrollBehavior = originalHtmlScroll;
      bodyElement.style.scrollBehavior = originalBodyScroll;
    };
  }, []);

  // Pickup toast message from navigation or global storage (set by interceptors)
  useEffect(() => {
    const fromState = location.state && location.state.toast;
    const fromStorage = localStorage.getItem('toast_message');
    const message = fromState || fromStorage;
    if (message) {
      setToast(message);
      if (fromStorage) localStorage.removeItem('toast_message');
      // Auto-hide toast after 4s
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate phone format (10-15 digits)
  const isValidPhone = (phone) => {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  // Detect input type based on content
  const detectInputType = (value) => {
    if (!value) return inputType;
    const hasAtSymbol = value.includes('@');
    const onlyDigits = /^\d+$/.test(value.replace(/[\s\-()]/g, ''));

    if (hasAtSymbol) return "email";
    if (onlyDigits) return "phone";
    return inputType;
  };

  const handleIdentChange = (e) => {
    const value = e.target.value;
    setIdent(value);
    const detected = detectInputType(value);
    setInputType(detected);
  };

  const isValidInput = () => {
    if (!ident || !password) return false;
    if (inputType === "email") return isValidEmail(ident);
    if (inputType === "phone") return isValidPhone(ident);
    return false;
  };

  async function submit(e){
    e.preventDefault();
    setError("");

    if (!isValidInput()) {
      setError(inputType === "email" ? "Please enter a valid email address" : "Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try{
      const res = await login({ email_or_phone: ident, password });
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      
      // Check if there's a redirect path stored (from DonorRouteGuard)
      const redirectPath = localStorage.getItem('redirect_after_login');
      if (redirectPath) {
        localStorage.removeItem('redirect_after_login');
        nav(redirectPath);
      } else {
        nav("/donor/dashboard");
      }
    }catch(err){
      setError(err?.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <div className="donor-auth-container">
        <div className="donor-auth-wrapper">
          {/* Left Side - Branding */}
          <div className="donor-auth-brand">
            <div className="donor-auth-brand-content">
              <div className="donor-auth-icon">🩸</div>
              <h1>SmartBlood</h1>
              <p>Save Lives, Donate Blood</p>
              <div className="donor-auth-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Track your donations</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Help those in need</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Join our community</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="donor-auth-form-wrapper">
            <div className="donor-auth-card">
              <div className="donor-auth-header">
                <h2>Donor Login</h2>
                <p>Welcome back! Please login to your account</p>
              </div>

              {error && (
                <div className="donor-auth-error">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit} className="donor-auth-form">
                {/* Email/Phone Toggle */}
                <div className="donor-input-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${inputType === "email" ? "active" : ""}`}
                    onClick={() => {
                      setInputType("email");
                      setIdent("");
                      setError("");
                    }}
                  >
                    📧 Email
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${inputType === "phone" ? "active" : ""}`}
                    onClick={() => {
                      setInputType("phone");
                      setIdent("");
                      setError("");
                    }}
                  >
                    📱 Phone
                  </button>
                </div>

                <div className="donor-form-group">
                  <label htmlFor="donor-login-ident">
                    {inputType === "email" ? "Email Address" : "Phone Number"}
                  </label>
                  <div className="donor-input-wrapper no-icon">
                    <input
                      id="donor-login-ident"
                      name="email_or_phone"
                      placeholder={inputType === "email" ? "your.email@example.com" : "+91 98765 43210"}
                      value={ident}
                      onChange={handleIdentChange}
                      autoComplete="username"
                      type={inputType === "email" ? "email" : "tel"}
                      required
                    />
                  </div>
                  {ident && (
                    <div className="input-validation">
                      {inputType === "email" && isValidEmail(ident) && (
                        <span className="validation-success">✓ Valid email</span>
                      )}
                      {inputType === "phone" && isValidPhone(ident) && (
                        <span className="validation-success">✓ Valid phone</span>
                      )}
                      {inputType === "email" && ident && !isValidEmail(ident) && (
                        <span className="validation-error">✗ Invalid email format</span>
                      )}
                      {inputType === "phone" && ident && !isValidPhone(ident) && (
                        <span className="validation-error">✗ Invalid phone format</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="donor-form-group">
                  <label htmlFor="donor-login-password">Password</label>
                  <div className="donor-input-wrapper password-wrapper no-icon">
                    <input
                      id="donor-login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e=>setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div className="donor-form-footer">
                  <Link to="/donor/forgot-password" className="donor-forgot-link">
                    Forgot Password?
                  </Link>
                </div>

                <button
                  id="donor-login-submit"
                  type="submit"
                  className="donor-btn-primary"
                  disabled={loading || !isValidInput()}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              <div className="donor-auth-divider">
                <span>New to SmartBlood?</span>
              </div>

              <Link to="/donor/register" className="donor-btn-secondary">
                Create Account
              </Link>

              <p className="donor-auth-footer">
                By logging in, you agree to our <Link to="/policies">Terms & Conditions</Link>
              </p>
            </div>
          </div>
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
    </>
  );
}
