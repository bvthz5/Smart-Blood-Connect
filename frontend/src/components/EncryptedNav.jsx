/**
 * Encrypted Navigation Component
 * Provides navigation with encrypted URLs
 */

import React from 'react';
import { URLEncryption } from '../utils/urlEncryption';

const EncryptedNav = () => {
  const navigation = URLEncryption.getEncryptedNavigation();

  const handleNavigation = (encryptedUrl) => {
    // Use encrypted navigation
    if (window.encryptedNavigate) {
      const route = URLEncryption.decryptRoute(encryptedUrl.substring(1));
      window.encryptedNavigate(route);
    } else {
      // Fallback to regular navigation
      window.location.href = encryptedUrl;
    }
  };

  return (
    <nav className="encrypted-nav">
      <div className="nav-container">
        {/* Logo */}
        <div className="nav-logo">
          <button 
            onClick={() => handleNavigation(navigation.home)}
            className="logo-link"
          >
            SmartBlood Connect
          </button>
        </div>

        {/* Navigation Links */}
        <ul className="nav-links">
          <li>
            <button 
              onClick={() => handleNavigation(navigation.home)}
              className="nav-link"
            >
              Home
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleNavigation(navigation.about)}
              className="nav-link"
            >
              About
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleNavigation(navigation.contact)}
              className="nav-link"
            >
              Contact
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleNavigation(navigation.faq)}
              className="nav-link"
            >
              FAQ
            </button>
          </li>
          <li>
            <button 
              onClick={() => handleNavigation(navigation.policies)}
              className="nav-link"
            >
              Policies
            </button>
          </li>
        </ul>

        {/* Auth Links */}
        <div className="nav-auth">
          <button 
            onClick={() => handleNavigation(navigation.donorLogin)}
            className="auth-link login"
          >
            Login
          </button>
          <button 
            onClick={() => handleNavigation(navigation.donorRegister)}
            className="auth-link register"
          >
            Register
          </button>
        </div>

        {/* Admin Link (hidden by default) */}
        <div className="nav-admin" style={{ display: 'none' }}>
          <button 
            onClick={() => handleNavigation(navigation.adminLogin)}
            className="admin-link"
          >
            Admin
          </button>
        </div>
      </div>
    </nav>
  );
};

export default EncryptedNav;
