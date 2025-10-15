import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginAdmin, clearError } from '../../../store/slices/adminSlice';
import { Eye, EyeOff, Shield, Zap, Droplets, Heart } from 'lucide-react';
import '../css/AdminLogin.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated, user } = useSelector((state) => state.admin);

  // Memoized validation function
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email address is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.email, formData.password]);

  // Optimized change handler
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  // Optimized submit handler
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await dispatch(loginAdmin(formData)).unwrap();
      navigate('/admin/dashboard');
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, dispatch, navigate]);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Memoized form fields to prevent unnecessary re-renders
  const emailField = useMemo(() => (
    <div className="form-group">
      <label htmlFor="email" className="form-label">
        <Zap className="label-icon" />
        Email Address
      </label>
      <div className="input-container">
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`form-input ${errors.email ? 'error' : ''}`}
          placeholder="admin@smartblood.com"
          autoComplete="email"
          disabled={isSubmitting}
        />
        <div className="input-glow"></div>
        <div className="input-border"></div>
      </div>
      {errors.email && (
        <p className="form-error">{errors.email}</p>
      )}
    </div>
  ), [formData.email, errors.email, handleChange, isSubmitting]);

  const passwordField = useMemo(() => (
    <div className="form-group">
      <label htmlFor="password" className="form-label">
        <Shield className="label-icon" />
        Password
      </label>
      <div className="input-container">
        <input
          type={showPassword ? "text" : "password"}
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className={`form-input ${errors.password ? 'error' : ''}`}
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={isSubmitting}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={togglePasswordVisibility}
          disabled={isSubmitting}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
        <div className="input-glow"></div>
        <div className="input-border"></div>
      </div>
      {errors.password && (
        <p className="form-error">{errors.password}</p>
      )}
    </div>
  ), [formData.password, errors.password, showPassword, handleChange, togglePasswordVisibility, isSubmitting]);

  const rememberMeField = useMemo(() => (
    <div className="remember-me-container">
      <label className="remember-me-label">
        <input
          type="checkbox"
          name="rememberMe"
          checked={formData.rememberMe}
          onChange={handleChange}
          className="remember-me-checkbox-hidden"
          disabled={isSubmitting}
        />
        <span className="remember-me-checkbox-custom">
          {formData.rememberMe && (
            <svg
              viewBox="0 0 24 24"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </label>
    </div>
  ), [formData.rememberMe, handleChange, isSubmitting]);

  return (
    <div className="admin-login-container">
      {/* Background */}
      <div className="login-background">
        <div className="smartblood-gradient-bg"></div>
        <div className="blood-flow-animation"></div>
        <div className="gradient-overlay"></div>
      </div>

      {/* Main Login Card */}
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="logo-container">
            <div className="logo-icon">
              <Droplets className="droplet-icon" />
              <div className="logo-pulse"></div>
            </div>
            <div className="logo-text">
              <h1>SmartBlood</h1>
              <p>Admin Portal</p>
              <div className="logo-subtitle">Advanced Blood Management System</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <Shield className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {emailField}
          {passwordField}
          {rememberMeField}

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="button-spinner"></div>
                Authenticating...
              </>
            ) : (
              <>
                <Shield size={20} />
                Sign In
              </>
            )}
            <div className="button-shine"></div>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;