/**
 * URL Redirect Component
 * Handles automatic redirection to encrypted URLs
 */

import React, { useEffect } from 'react';
import { URLEncryption } from '../utils/urlEncryption';

const URLRedirect = () => {
  useEffect(() => {
    // Check if we're on a non-encrypted URL and redirect
    const currentPath = window.location.pathname;
    
    // List of old non-encrypted routes that need redirection
    const redirectMap = {
      '/': '/a1b2c3d4',           // home
      '/about': '/e5f6g7h8',      // about
      '/contact': '/i9j0k1l2',    // contact
      '/faq': '/m3n4o5p6',        // faq
      '/policies': '/q7r8s9t0',   // policies
      
      '/donor/login': '/u1v2w3x4',           // donor-login
      '/donor/register': '/y5z6a7b8',        // donor-register
      '/donor/forgot-password': '/b9c0d1e2', // donor-forgot-password
      '/donor/dashboard': '/c9d0e1f2',       // donor-dashboard
      '/donor/change-password': '/f3g4h5i6', // donor-change-password
      '/donor/edit-profile': '/j7k8l9m0',    // donor-edit-profile
      
      '/seeker/request': '/g3h4i5j6',        // seeker-request
      
      '/admin/login': '/k7l8m9n0',           // admin-login
      '/admin/dashboard': '/o1p2q3r4',       // admin-dashboard
      '/admin/donors': '/n5o6p7q8',          // admin-donors
      '/admin/hospitals': '/r9s0t1u2',       // admin-hospitals
      '/admin/inventory': '/v3w4x5y6',       // admin-inventory
      '/admin/requests': '/z7a8b9c0',        // admin-requests
      '/admin/donation-history': '/d1e2f3g4' // admin-donation-history
    };
    
    // Check if current path needs redirection
    if (redirectMap[currentPath]) {
      // Replace current URL with encrypted version
      window.history.replaceState(null, '', redirectMap[currentPath]);
      window.location.reload(); // Reload to trigger the new route
    }
    
    // Check if current path is not encrypted and not in redirect map
    else if (currentPath !== '/' && !currentPath.match(/^\/[a-z0-9]{8}$/)) {
      // Invalid URL, redirect to encrypted home
      window.history.replaceState(null, '', '/a1b2c3d4');
      window.location.reload();
    }
    
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px',
      color: '#666'
    }}>
      Redirecting to secure URL...
    </div>
  );
};

export default URLRedirect;
