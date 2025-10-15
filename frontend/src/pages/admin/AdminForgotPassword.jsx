import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./AdminForgotPassword.css";
import { adminForgotPassword } from "../../services/api";

export default function AdminForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { status } = await adminForgotPassword(email);
      if (status === 200) {
        setMessage("If account exists, password reset instructions have been sent to your email.");
      } else {
        setMessage("If account exists, password reset instructions have been sent to your email.");
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      // Backend returns generic 200 even if user not found; show generic message
      setMessage("If account exists, password reset instructions have been sent to your email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-forgot-password-page">
      {/* Simple Header */}
      <header className="admin-header">
        <div className="header-container">
          <Link to="/admin/login" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Back to Login</span>
          </Link>
          <div className="header-title">
            <h1>Reset Password</h1>
          </div>
        </div>
      </header>

      {/* Forgot Password Form */}
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <div className="forgot-password-header">
            <div className="forgot-password-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 1V3" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 21V23" stroke="currentColor" strokeWidth="2"/>
                <path d="M4.22 4.22L5.64 5.64" stroke="currentColor" strokeWidth="2"/>
                <path d="M18.36 18.36L19.78 19.78" stroke="currentColor" strokeWidth="2"/>
                <path d="M1 12H3" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 12H23" stroke="currentColor" strokeWidth="2"/>
                <path d="M4.22 19.78L5.64 18.36" stroke="currentColor" strokeWidth="2"/>
                <path d="M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <h2>Forgot Password?</h2>
            <p>Enter your email address and we'll send you instructions to reset your password.</p>
          </div>

          <form onSubmit={handleSubmit} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                autoComplete="email"
                className="form-input"
              />
            </div>

            {error && (
              <div className="error-message">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {error}
              </div>
            )}

            {message && (
              <div className="success-message">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              className="reset-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path d="M12 2A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="4"/>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Send Reset Instructions
                </>
              )}
            </button>

            <div className="form-footer">
              <Link to="/admin/login" className="back-to-login">
                Remember your password? Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
