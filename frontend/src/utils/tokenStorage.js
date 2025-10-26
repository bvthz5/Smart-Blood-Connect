/**
 * Robust Token Storage Utility
 * Uses multiple storage strategies to ensure tokens persist across reloads
 * Storage hierarchy: localStorage → sessionStorage → Cookies
 */

const TOKEN_KEYS = {
  SEEKER_ACCESS: 'seeker_token',
  SEEKER_REFRESH: 'seeker_refresh_token',
  SEEKER_BACKUP_ACCESS: '_sbt_a',  // Backup in cookie
  SEEKER_BACKUP_REFRESH: '_sbt_r', // Backup in cookie
  USER_TYPE: 'user_type',
  USER_ID: 'seeker_user_id',
  USER_ROLE: 'seeker_user_role',
  USER_EMAIL: 'seeker_user_email',
  USER_PHONE: 'seeker_user_phone',
  HOSPITAL_ID: 'seeker_hospital_id',
};

// Cookie utilities
const setCookie = (name, value, days = 7) => {
  try {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
  } catch (error) {
    console.warn('Failed to set cookie:', error);
  }
};

const getCookie = (name) => {
  try {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  } catch (error) {
    console.warn('Failed to get cookie:', error);
    return null;
  }
};

const deleteCookie = (name) => {
  try {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  } catch (error) {
    console.warn('Failed to delete cookie:', error);
  }
};

// Multi-storage token manager
export const tokenStorage = {
  // Save tokens to all storage locations
  saveTokens(accessToken, refreshToken, userData = {}) {
    if (!accessToken || !refreshToken) {
      console.error('Cannot save tokens: accessToken or refreshToken is missing');
      return false;
    }

    try {
      // Store in localStorage (primary)
      localStorage.setItem(TOKEN_KEYS.SEEKER_ACCESS, accessToken);
      localStorage.setItem(TOKEN_KEYS.SEEKER_REFRESH, refreshToken);
      localStorage.setItem(TOKEN_KEYS.USER_TYPE, 'seeker');

      // Store in sessionStorage (backup)
      sessionStorage.setItem(TOKEN_KEYS.SEEKER_ACCESS, accessToken);
      sessionStorage.setItem(TOKEN_KEYS.SEEKER_REFRESH, refreshToken);
      sessionStorage.setItem(TOKEN_KEYS.USER_TYPE, 'seeker');

      // Store in cookies (encrypted backup)
      setCookie(TOKEN_KEYS.SEEKER_BACKUP_ACCESS, btoa(accessToken), 7);
      setCookie(TOKEN_KEYS.SEEKER_BACKUP_REFRESH, btoa(refreshToken), 7);

      // Save user data
      if (userData.id) localStorage.setItem(TOKEN_KEYS.USER_ID, String(userData.id));
      if (userData.role) localStorage.setItem(TOKEN_KEYS.USER_ROLE, userData.role);
      if (userData.email) localStorage.setItem(TOKEN_KEYS.USER_EMAIL, userData.email);
      if (userData.phone) localStorage.setItem(TOKEN_KEYS.USER_PHONE, userData.phone);
      if (userData.hospital_id) localStorage.setItem(TOKEN_KEYS.HOSPITAL_ID, String(userData.hospital_id));

      console.log('[TokenStorage] Tokens saved successfully to all storage locations');
      return true;
    } catch (error) {
      console.error('[TokenStorage] Failed to save tokens:', error);
      return false;
    }
  },

  // Get access token from any available storage
  getAccessToken() {
    try {
      // Try localStorage first
      let token = localStorage.getItem(TOKEN_KEYS.SEEKER_ACCESS);
      if (token) return token;

      // Try sessionStorage
      token = sessionStorage.getItem(TOKEN_KEYS.SEEKER_ACCESS);
      if (token) {
        // Restore to localStorage
        localStorage.setItem(TOKEN_KEYS.SEEKER_ACCESS, token);
        return token;
      }

      // Try cookie backup
      const cookieToken = getCookie(TOKEN_KEYS.SEEKER_BACKUP_ACCESS);
      if (cookieToken) {
        try {
          token = atob(cookieToken);
          // Restore to localStorage and sessionStorage
          localStorage.setItem(TOKEN_KEYS.SEEKER_ACCESS, token);
          sessionStorage.setItem(TOKEN_KEYS.SEEKER_ACCESS, token);
          console.log('[TokenStorage] Restored access token from cookie backup');
          return token;
        } catch (e) {
          console.warn('[TokenStorage] Failed to decode cookie token');
        }
      }

      return null;
    } catch (error) {
      console.error('[TokenStorage] Failed to get access token:', error);
      return null;
    }
  },

  // Get refresh token from any available storage
  getRefreshToken() {
    try {
      // Try localStorage first
      let token = localStorage.getItem(TOKEN_KEYS.SEEKER_REFRESH);
      if (token) return token;

      // Try sessionStorage
      token = sessionStorage.getItem(TOKEN_KEYS.SEEKER_REFRESH);
      if (token) {
        // Restore to localStorage
        localStorage.setItem(TOKEN_KEYS.SEEKER_REFRESH, token);
        return token;
      }

      // Try cookie backup
      const cookieToken = getCookie(TOKEN_KEYS.SEEKER_BACKUP_REFRESH);
      if (cookieToken) {
        try {
          token = atob(cookieToken);
          // Restore to localStorage and sessionStorage
          localStorage.setItem(TOKEN_KEYS.SEEKER_REFRESH, token);
          sessionStorage.setItem(TOKEN_KEYS.SEEKER_REFRESH, token);
          console.log('[TokenStorage] Restored refresh token from cookie backup');
          return token;
        } catch (e) {
          console.warn('[TokenStorage] Failed to decode cookie token');
        }
      }

      return null;
    } catch (error) {
      console.error('[TokenStorage] Failed to get refresh token:', error);
      return null;
    }
  },

  // Check if user is authenticated (has valid tokens)
  isAuthenticated() {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return !!(accessToken && refreshToken);
  },

  // Update access token (after refresh)
  updateAccessToken(newAccessToken) {
    if (!newAccessToken) return false;

    try {
      localStorage.setItem(TOKEN_KEYS.SEEKER_ACCESS, newAccessToken);
      sessionStorage.setItem(TOKEN_KEYS.SEEKER_ACCESS, newAccessToken);
      setCookie(TOKEN_KEYS.SEEKER_BACKUP_ACCESS, btoa(newAccessToken), 7);
      console.log('[TokenStorage] Access token updated successfully');
      return true;
    } catch (error) {
      console.error('[TokenStorage] Failed to update access token:', error);
      return false;
    }
  },

  // Update both tokens (after refresh)
  updateTokens(newAccessToken, newRefreshToken) {
    if (!newAccessToken || !newRefreshToken) return false;

    try {
      // Update localStorage
      localStorage.setItem(TOKEN_KEYS.SEEKER_ACCESS, newAccessToken);
      localStorage.setItem(TOKEN_KEYS.SEEKER_REFRESH, newRefreshToken);

      // Update sessionStorage
      sessionStorage.setItem(TOKEN_KEYS.SEEKER_ACCESS, newAccessToken);
      sessionStorage.setItem(TOKEN_KEYS.SEEKER_REFRESH, newRefreshToken);

      // Update cookies
      setCookie(TOKEN_KEYS.SEEKER_BACKUP_ACCESS, btoa(newAccessToken), 7);
      setCookie(TOKEN_KEYS.SEEKER_BACKUP_REFRESH, btoa(newRefreshToken), 7);

      console.log('[TokenStorage] Both tokens updated successfully');
      return true;
    } catch (error) {
      console.error('[TokenStorage] Failed to update tokens:', error);
      return false;
    }
  },

  // Clear all tokens from all storage locations
  clearTokens() {
    try {
      // Clear from localStorage
      localStorage.removeItem(TOKEN_KEYS.SEEKER_ACCESS);
      localStorage.removeItem(TOKEN_KEYS.SEEKER_REFRESH);
      localStorage.removeItem('token'); // Legacy key
      localStorage.removeItem(TOKEN_KEYS.USER_TYPE);
      localStorage.removeItem(TOKEN_KEYS.USER_ID);
      localStorage.removeItem(TOKEN_KEYS.USER_ROLE);
      localStorage.removeItem(TOKEN_KEYS.USER_EMAIL);
      localStorage.removeItem(TOKEN_KEYS.USER_PHONE);
      localStorage.removeItem(TOKEN_KEYS.HOSPITAL_ID);

      // Clear from sessionStorage
      sessionStorage.removeItem(TOKEN_KEYS.SEEKER_ACCESS);
      sessionStorage.removeItem(TOKEN_KEYS.SEEKER_REFRESH);
      sessionStorage.removeItem(TOKEN_KEYS.USER_TYPE);

      // Clear cookies
      deleteCookie(TOKEN_KEYS.SEEKER_BACKUP_ACCESS);
      deleteCookie(TOKEN_KEYS.SEEKER_BACKUP_REFRESH);

      console.log('[TokenStorage] All tokens cleared successfully');
      return true;
    } catch (error) {
      console.error('[TokenStorage] Failed to clear tokens:', error);
      return false;
    }
  },

  // Get user data
  getUserData() {
    return {
      id: localStorage.getItem(TOKEN_KEYS.USER_ID),
      role: localStorage.getItem(TOKEN_KEYS.USER_ROLE),
      email: localStorage.getItem(TOKEN_KEYS.USER_EMAIL),
      phone: localStorage.getItem(TOKEN_KEYS.USER_PHONE),
      hospital_id: localStorage.getItem(TOKEN_KEYS.HOSPITAL_ID),
    };
  },

  // Verify and restore tokens if needed (run on app init)
  verifyAndRestore() {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (accessToken && refreshToken) {
      console.log('[TokenStorage] Tokens verified and available');
      return true;
    }

    console.log('[TokenStorage] No valid tokens found');
    return false;
  }
};

export default tokenStorage;
