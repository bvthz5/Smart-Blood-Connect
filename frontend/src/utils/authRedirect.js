/**
 * Authentication Redirect Utilities
 * Handles redirects for authentication-related actions
 */

/**
 * Redirect user to login page
 * Clears all auth tokens and redirects to seeker login
 */
export const redirectToLogin = () => {
  // Clear all auth tokens
  localStorage.removeItem('seeker_token');
  localStorage.removeItem('token');
  localStorage.removeItem('seeker_refresh_token');
  localStorage.removeItem('donor_token');
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
  
  // Redirect to seeker login
  window.location.href = '/seeker/login';
};

/**
 * Redirect user to admin login page
 * Clears admin tokens and redirects to admin login
 */
export const redirectToAdminLogin = () => {
  // Clear admin tokens
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
  
  // Redirect to admin login
  window.location.href = '/admin/login';
};

/**
 * Redirect user to dashboard based on their role
 * @param {string} role - User role (admin, seeker, donor)
 */
export const redirectToDashboard = (role) => {
  switch (role) {
    case 'admin':
      window.location.href = '/admin/dashboard';
      break;
    case 'staff':
    case 'seeker':
      window.location.href = '/seeker/dashboard';
      break;
    case 'donor':
      window.location.href = '/donor/dashboard';
      break;
    default:
      window.location.href = '/';
  }
};

/**
 * Redirect to home page
 */
export const redirectToHome = () => {
  window.location.href = '/';
};

/**
 * Check if user is authenticated
 * @returns {boolean} - Whether user has valid auth token
 */
export const isAuthenticated = () => {
  const adminToken = localStorage.getItem('admin_access_token');
  const seekerToken = localStorage.getItem('seeker_token') || localStorage.getItem('token');
  const donorToken = localStorage.getItem('donor_token');
  
  return !!(adminToken || seekerToken || donorToken);
};

/**
 * Get current user role from localStorage
 * @returns {string|null} - User role or null if not authenticated
 */
export const getCurrentUserRole = () => {
  if (localStorage.getItem('admin_access_token')) {
    return 'admin';
  }
  if (localStorage.getItem('seeker_token') || localStorage.getItem('token')) {
    return 'seeker';
  }
  if (localStorage.getItem('donor_token')) {
    return 'donor';
  }
  return null;
};

export default {
  redirectToLogin,
  redirectToAdminLogin,
  redirectToDashboard,
  redirectToHome,
  isAuthenticated,
  getCurrentUserRole
};

