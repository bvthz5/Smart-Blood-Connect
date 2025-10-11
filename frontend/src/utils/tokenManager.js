/**
 * Token Management Utility
 * Handles secure token storage and validation
 */

const TOKEN_KEY = 'admin_access_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';

export const tokenManager = {
  // Get token from localStorage
  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to get token from localStorage:', error);
      return null;
    }
  },

  // Get refresh token from localStorage
  getRefreshToken() {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to get refresh token from localStorage:', error);
      return null;
    }
  },

  // Set token in localStorage
  setToken(token) {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      console.warn('Failed to set token in localStorage:', error);
    }
  },

  // Set refresh token in localStorage
  setRefreshToken(refreshToken) {
    try {
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch (error) {
      console.warn('Failed to set refresh token in localStorage:', error);
    }
  },

  // Clear all tokens
  clearTokens() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to clear tokens from localStorage:', error);
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Basic JWT token validation (check if it's not expired)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
      if (payload.exp && payload.exp < currentTime) {
        this.clearTokens();
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Token validation failed:', error);
      this.clearTokens();
      return false;
    }
  },

  // Get user info from token
  getUserFromToken() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch (error) {
      console.warn('Failed to decode token:', error);
      return null;
    }
  }
};

// Auto-clear expired tokens on page load
if (typeof window !== 'undefined') {
  // Check token validity on page load
  if (!tokenManager.isAuthenticated()) {
    tokenManager.clearTokens();
  }
}
