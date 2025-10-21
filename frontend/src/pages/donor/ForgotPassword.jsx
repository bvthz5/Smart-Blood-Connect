import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import Nav from "../../components/Nav";
import '../../styles/donor-auth.css'

export default function ForgotPassword(){
  const [ident, setIdent] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [stage, setStage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function sendOtp(e){
    e.preventDefault();
    setError("");
    setLoading(true);
    try{
      const response = await api.post("/api/auth/forgot-password", { email_or_phone: ident });
      if (response.data.user_id) {
        setUserId(response.data.user_id);
      }
      setStage(1);
    }catch(err){
      setError(err?.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function reset(e){
    e.preventDefault();
    setError("");
    setLoading(true);
    try{
      const payload = {
        user_id: userId,
        otp,
        new_password: newPassword
      };
      await api.post("/api/auth/reset-password", payload);
      window.location.href = "/donor/login";
    }catch(err){
      setError(err?.response?.data?.error || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if(stage===1){
    return (
      <>
        <Nav />
        <div className="donor-auth-container">
          <div className="donor-auth-wrapper">
            {/* Left Side - Branding */}
            <div className="donor-auth-brand">
              <div className="donor-auth-brand-content">
                <div className="donor-auth-icon">🔐</div>
                <h1>Reset Password</h1>
                <p>Enter the verification code sent to your email</p>
                <div className="donor-auth-benefits">
                  <div className="benefit-item">
                    <span className="benefit-icon">📧</span>
                    <span>Check your email for OTP</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">⏱️</span>
                    <span>Code expires in 10 minutes</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">✓</span>
                    <span>Your account is secure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Reset Form */}
            <div className="donor-auth-form-wrapper">
              <div className="donor-auth-card">
                <div className="donor-auth-header">
                  <h2>Verify & Reset Password</h2>
                  <p>Enter your verification code and new password</p>
                </div>

                {error && (
                  <div className="donor-auth-error">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={reset} className="donor-auth-form">
                  <div className="donor-form-group">
                    <label htmlFor="forgot-otp">Verification Code</label>
                    <div className="donor-input-wrapper">
                      <span className="donor-input-icon">🔐</span>
                      <input
                        id="forgot-otp"
                        name="otp"
                        placeholder="000000"
                        value={otp}
                        onChange={e=>setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        type="text"
                        maxLength="6"
                        required
                      />
                    </div>
                  </div>

                  <div className="donor-form-group">
                    <label htmlFor="forgot-new-password">New Password</label>
                    <div className="donor-input-wrapper password-wrapper">
                      <input
                        id="forgot-new-password"
                        name="new_password"
                        type="password"
                        placeholder="Create a strong password"
                        value={newPassword}
                        onChange={e=>setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <span className="donor-input-icon">🔒</span>
                    </div>
                  </div>

                  <button
                    id="forgot-reset"
                    type="submit"
                    className="donor-btn-primary"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>

                <p className="donor-auth-footer">
                  Remember your password? <Link to="/donor/login" className="donor-link">Sign In</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="donor-auth-container">
        <div className="donor-auth-wrapper">
          {/* Left Side - Branding */}
          <div className="donor-auth-brand">
            <div className="donor-auth-brand-content">
              <div className="donor-auth-icon">🔑</div>
              <h1>Forgot Password?</h1>
              <p>No worries, we'll help you recover your account</p>
              <div className="donor-auth-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">📧</span>
                  <span>We'll send you a verification code</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">🔐</span>
                  <span>Create a new secure password</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Access your account again</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Forgot Password Form */}
          <div className="donor-auth-form-wrapper">
            <div className="donor-auth-card">
              <div className="donor-auth-header">
                <h2>Recover Your Account</h2>
                <p>Enter your email or phone number to get started</p>
              </div>

              {error && (
                <div className="donor-auth-error">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={sendOtp} className="donor-auth-form">
                <div className="donor-form-group">
                  <label htmlFor="forgot-email-phone">Email or Phone Number</label>
                  <div className="donor-input-wrapper">
                    <input
                      id="forgot-email-phone"
                      name="email_or_phone"
                      placeholder="Enter your email or phone"
                      value={ident}
                      onChange={e=>setIdent(e.target.value)}
                      autoComplete="username"
                      type="text"
                      required
                    />
                    <span className="donor-input-icon">📧</span>
                  </div>
                </div>

                <button
                  id="forgot-send-otp"
                  type="submit"
                  className="donor-btn-primary"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Verification Code"}
                </button>
              </form>

              <div className="donor-auth-divider">
                <span>Remember your password?</span>
              </div>

              <Link to="/donor/login" className="donor-btn-secondary">
                Sign In
              </Link>

              <p className="donor-auth-footer">
                Don't have an account? <Link to="/donor/register" className="donor-link">Create one</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
