import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import seekerService from "../../services/seekerService";
import Nav from "../../components/Nav";

export default function SeekerResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get("token") || "", [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await seekerService.resetPassword(token, password);
      setSuccess("Password updated successfully. Redirecting to login...");
      
      // Clear any existing seeker tokens before redirecting to login
      localStorage.removeItem('seeker_token');
      localStorage.removeItem('token');
      localStorage.removeItem('seeker_refresh_token');
      
      setTimeout(() => navigate("/seeker/login", { replace: true }), 1500);
    } catch (err) {
      setError(err?.response?.data?.error || "Reset failed. The link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seeker-reset-page">
      <Nav />
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Set New Password</h1>
            <p>Choose a strong password for your account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm">Confirm New Password</label>
              <input
                type="password"
                id="confirm"
                name="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                required
                autoComplete="new-password"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Saving..." : "Save Password"}
            </button>

            <div className="form-footer">
              <Link to="/seeker/login" className="forgot-password">Back to login</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
