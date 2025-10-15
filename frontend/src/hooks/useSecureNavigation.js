/**
 * Custom hook for secure navigation with encrypted URLs
 */

import { useCallback } from 'react';
import { URLEncryption, RouteProtection } from '../utils/urlEncryption';

export const useSecureNavigation = () => {
  
  /**
   * Navigate to a route with encryption
   * @param {string} route - The route to navigate to
   * @param {Object} options - Navigation options
   */
  const navigateTo = useCallback((route, options = {}) => {
    try {
      // Check if route requires authentication
      const requiresAuth = URLEncryption.requiresAuth(route);
      
      if (requiresAuth) {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
          // Redirect to login
          const loginUrl = URLEncryption.generateSecureURL('donor-login');
          window.location.replace(loginUrl);
          return;
        }
        
        // Validate session
        if (!RouteProtection.prototype.isSessionValid()) {
          // Session expired, redirect to login
          const loginUrl = URLEncryption.generateSecureURL('donor-login');
          window.location.replace(loginUrl);
          return;
        }
      }
      
      // Generate encrypted URL
      const encryptedUrl = URLEncryption.generateSecureURL(route);
      
      // Navigate using encrypted URL
      if (window.encryptedNavigate) {
        window.encryptedNavigate(route, options);
      } else {
        window.location.href = encryptedUrl;
      }
      
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to home
      const homeUrl = URLEncryption.generateSecureURL('home');
      window.location.replace(homeUrl);
    }
  }, []);

  /**
   * Navigate back with encryption
   */
  const navigateBack = useCallback(() => {
    try {
      window.history.back();
    } catch (error) {
      console.error('Back navigation error:', error);
      navigateTo('home');
    }
  }, []);

  /**
   * Replace current route with encrypted route
   * @param {string} route - The route to replace with
   */
  const replaceRoute = useCallback((route) => {
    try {
      const encryptedUrl = URLEncryption.generateSecureURL(route);
      window.location.replace(encryptedUrl);
    } catch (error) {
      console.error('Route replacement error:', error);
    }
  }, []);

  /**
   * Get encrypted URL for a route
   * @param {string} route - The route to encrypt
   * @returns {string} - Encrypted URL
   */
  const getEncryptedUrl = useCallback((route) => {
    return URLEncryption.generateSecureURL(route);
  }, []);

  /**
   * Check if current route is valid
   * @returns {boolean} - Whether current route is valid
   */
  const isCurrentRouteValid = useCallback(() => {
    try {
      const currentPath = window.location.pathname.substring(1);
      const decryptedRoute = URLEncryption.decryptRoute(currentPath);
      return decryptedRoute && decryptedRoute !== 'error';
    } catch (error) {
      return false;
    }
  }, []);

  /**
   * Get current decrypted route
   * @returns {string} - Current decrypted route
   */
  const getCurrentRoute = useCallback(() => {
    try {
      const currentPath = window.location.pathname.substring(1);
      return URLEncryption.decryptRoute(currentPath);
    } catch (error) {
      return 'home';
    }
  }, []);

  /**
   * Validate and redirect if needed
   */
  const validateCurrentRoute = useCallback(() => {
    if (!isCurrentRouteValid()) {
      replaceRoute('home');
    }
  }, [isCurrentRouteValid, replaceRoute]);

  return {
    navigateTo,
    navigateBack,
    replaceRoute,
    getEncryptedUrl,
    isCurrentRouteValid,
    getCurrentRoute,
    validateCurrentRoute
  };
};
