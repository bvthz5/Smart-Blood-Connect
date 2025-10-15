/**
 * URL Encryption and Route Protection Utilities
 * Prevents direct URL access and encrypts routes
 */

import CryptoJS from 'crypto-js';

// Secret key for URL encryption (should be from environment in production)
const ENCRYPTION_KEY = import.meta.env.VITE_URL_ENCRYPTION_KEY || 'smartblood-url-secret-key-2024';

// Route mapping for obfuscation
const ROUTE_MAP = {
  // Public routes (encrypted but accessible)
  'home': 'a1b2c3d4',
  'about': 'e5f6g7h8',
  'contact': 'i9j0k1l2',
  'faq': 'm3n4o5p6',
  'policies': 'q7r8s9t0',
  'url-test': 'test1234',
  'status': 'status5678',
  
  // Auth routes (encrypted but accessible)
  'donor-login': 'u1v2w3x4',
  'donor-register': 'y5z6a7b8',
  'donor-forgot-password': 'b9c0d1e2',
  'seeker-request': 'g3h4i5j6',
  'admin-login': 'k7l8m9n0',
  
  // Protected donor routes (encrypted with session validation)
  'donor-dashboard': 'c9d0e1f2',
  'donor-change-password': 'f3g4h5i6',
  'donor-edit-profile': 'j7k8l9m0',
  
  // Protected admin routes (encrypted with session validation)
  'admin-dashboard': 'o1p2q3r4',
  'admin-donors': 'n5o6p7q8',
  'admin-hospitals': 'r9s0t1u2',
  'admin-inventory': 'v3w4x5y6',
  'admin-requests': 'z7a8b9c0',
  'admin-donation-history': 'd1e2f3g4',
  
  // API routes (encrypted)
  'api-stats': 's5t6u7v8',
  'api-alerts': 'w9x0y1z2',
  'api-testimonials': 'a3b4c5d6'
};

// Reverse mapping for decryption
const REVERSE_ROUTE_MAP = Object.fromEntries(
  Object.entries(ROUTE_MAP).map(([key, value]) => [value, key])
);

class URLEncryption {
  /**
   * Encrypt a route path
   * @param {string} route - The route to encrypt
   * @returns {string} - Encrypted route
   */
  static encryptRoute(route) {
    try {
      // Remove leading slash if present
      const cleanRoute = route.replace(/^\//, '');
      
      // Check if route has a mapping
      if (ROUTE_MAP[cleanRoute]) {
        return ROUTE_MAP[cleanRoute];
      }
      
      // Encrypt the route using AES
      const encrypted = CryptoJS.AES.encrypt(cleanRoute, ENCRYPTION_KEY).toString();
      
      // Convert to base64 and make URL safe
      return btoa(encrypted)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } catch (error) {
      console.error('Route encryption error:', error);
      return 'error';
    }
  }

  /**
   * Decrypt a route path
   * @param {string} encryptedRoute - The encrypted route
   * @returns {string} - Decrypted route
   */
  static decryptRoute(encryptedRoute) {
    try {
      // Check if it's a mapped route first
      if (REVERSE_ROUTE_MAP[encryptedRoute]) {
        return REVERSE_ROUTE_MAP[encryptedRoute];
      }
      
      // Restore base64 padding and convert back
      let base64 = encryptedRoute
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Add padding if needed
      while (base64.length % 4) {
        base64 += '=';
      }
      
      // Decode and decrypt
      const encrypted = atob(base64);
      const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Route decryption error:', error);
      return 'home'; // Default to home on error
    }
  }

  /**
   * Generate encrypted URL with session token
   * @param {string} route - The route to encrypt
   * @param {string} sessionToken - Session token for validation
   * @returns {string} - Encrypted URL with session
   */
  static generateSecureURL(route, sessionToken = null) {
    const encryptedRoute = this.encryptRoute(route);
    
    if (sessionToken) {
      const encryptedToken = CryptoJS.AES.encrypt(sessionToken, ENCRYPTION_KEY).toString();
      return `/${encryptedRoute}?t=${btoa(encryptedToken).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;
    }
    
    return `/${encryptedRoute}`;
  }

  /**
   * Validate session token from URL
   * @param {string} token - The token from URL
   * @returns {string|null} - Decrypted token or null if invalid
   */
  static validateSessionToken(token) {
    try {
      if (!token) return null;
      
      // Restore base64 padding
      let base64 = token
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      while (base64.length % 4) {
        base64 += '=';
      }
      
      const encrypted = atob(base64);
      const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Check if route requires authentication
   * @param {string} route - The route to check
   * @returns {boolean} - Whether route requires auth
   */
  static requiresAuth(route) {
    const protectedRoutes = [
      'donor-dashboard',
      'donor-change-password',
      'donor-edit-profile',
      'admin-dashboard',
      'admin-donors',
      'admin-hospitals',
      'admin-inventory',
      'admin-requests',
      'admin-donation-history'
    ];
    
    return protectedRoutes.includes(route);
  }

  /**
   * Generate obfuscated navigation paths
   * @returns {Object} - Object with encrypted navigation paths
   */
  static getEncryptedNavigation() {
    return {
      home: this.generateSecureURL('home'),
      about: this.generateSecureURL('about'),
      contact: this.generateSecureURL('contact'),
      faq: this.generateSecureURL('faq'),
      policies: this.generateSecureURL('policies'),
      donorLogin: this.generateSecureURL('donor-login'),
      donorRegister: this.generateSecureURL('donor-register'),
      donorForgotPassword: this.generateSecureURL('donor-forgot-password'),
      donorDashboard: this.generateSecureURL('donor-dashboard'),
      donorChangePassword: this.generateSecureURL('donor-change-password'),
      donorEditProfile: this.generateSecureURL('donor-edit-profile'),
      seekerRequest: this.generateSecureURL('seeker-request'),
      adminLogin: this.generateSecureURL('admin-login'),
      adminDashboard: this.generateSecureURL('admin-dashboard'),
      adminDonors: this.generateSecureURL('admin-donors'),
      adminHospitals: this.generateSecureURL('admin-hospitals'),
      adminInventory: this.generateSecureURL('admin-inventory'),
      adminRequests: this.generateSecureURL('admin-requests'),
      adminDonationHistory: this.generateSecureURL('admin-donation-history')
    };
  }
}

// Route Protection Class
class RouteProtection {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.lastActivity = Date.now();
    this.setupActivityTracking();
  }

  /**
   * Setup activity tracking for session management
   */
  setupActivityTracking() {
    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      }, true);
    });
  }

  /**
   * Check if session is still valid
   * @returns {boolean} - Whether session is valid
   */
  isSessionValid() {
    return (Date.now() - this.lastActivity) < this.sessionTimeout;
  }

  /**
   * Protect route from direct access
   * @param {string} route - The route being accessed
   * @param {boolean} requiresAuth - Whether route requires authentication
   */
  protectRoute(route, requiresAuth = false) {
    // Check if it's a direct URL access (no referrer)
    const hasReferrer = document.referrer && document.referrer !== window.location.href;
    const isDirectAccess = !hasReferrer && window.history.length <= 1;

    if (isDirectAccess && requiresAuth) {
      // Redirect to login if trying to access protected route directly
      this.redirectToLogin();
      return false;
    }

    // Check session validity for protected routes
    if (requiresAuth && !this.isSessionValid()) {
      this.redirectToLogin();
      return false;
    }

    return true;
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    const loginUrl = URLEncryption.generateSecureURL('donor-login');
    window.location.replace(loginUrl);
  }

  /**
   * Validate current URL and redirect if invalid
   */
  validateCurrentURL() {
    const currentPath = window.location.pathname.substring(1);
    const decryptedRoute = URLEncryption.decryptRoute(currentPath);
    
    // Check if route exists
    if (!ROUTE_MAP[decryptedRoute] && !REVERSE_ROUTE_MAP[currentPath]) {
      // Invalid route, redirect to home
      const homeUrl = URLEncryption.generateSecureURL('home');
      window.history.replaceState(null, '', homeUrl);
    }
  }
}

// Export utilities
export { URLEncryption, RouteProtection };

// Create global instance
export const urlEncryption = new URLEncryption();
export const routeProtection = new RouteProtection();
