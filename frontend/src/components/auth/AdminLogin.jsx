import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  LogIn, 
  Palette,
  Heart,
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import './AdminLogin.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  
  const { theme, themes, changeTheme, currentTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    // Add theme transition class to body
    document.body.classList.add('theme-transition');
    return () => {
      document.body.classList.remove('theme-transition');
    };
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, accept any valid email/password
      if (formData.email && formData.password) {
        navigate('/admin/dashboard');
      }
    } catch (error) {
      setErrors({ general: 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Implement forgot password functionality
    alert('Forgot password functionality would be implemented here');
  };

  return (
    <div className="admin-login-container">
      {/* Background Pattern */}
      <div className="login-background">
        <div className="background-pattern"></div>
        <div className="background-overlay"></div>
      </div>

      {/* Theme Selector */}
      <div className="theme-selector">
        <button
          className="theme-toggle-btn"
          onClick={() => setShowThemeSelector(!showThemeSelector)}
          aria-label="Select theme"
        >
          <Palette size={20} />
        </button>
        
        {showThemeSelector && (
          <div className="theme-dropdown">
            <div className="theme-dropdown-header">
              <h4>Choose Theme</h4>
            </div>
            <div className="theme-options">
              {themes.map(themeName => (
                <button
                  key={themeName}
                  className={`theme-option ${currentTheme === themeName ? 'active' : ''}`}
                  onClick={() => changeTheme(themeName)}
                >
                  <div className="theme-preview" data-theme={themeName}></div>
                  <span>{themes[themeName].name}</span>
                  {currentTheme === themeName && <CheckCircle size={16} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Login Card */}
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <div className="logo-icon">
              <Heart size={32} />
              <div className="logo-pulse"></div>
            </div>
            <div className="logo-text">
              <h1>BloodBank Pro</h1>
              <p>Admin Portal</p>
            </div>
          </div>
        </div>

        {errors.general && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{errors.general}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              <Mail size={18} />
              Email Address
            </label>
            <div className="input-container">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="admin@bloodbank.com"
                disabled={isLoading}
                autoComplete="email"
              />
              <div className="input-border"></div>
            </div>
            {errors.email && (
              <span className="error-text">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <Lock size={18} />
              Password
            </label>
            <div className="input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              <div className="input-border"></div>
            </div>
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="forgot-password-btn"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="button-spinner"></div>
                Signing In...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
            <div className="button-shine"></div>
          </button>
        </form>

        <div className="login-footer">
          <div className="security-badge">
            <Shield size={16} />
            <span>Secure Admin Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
