import axios from 'axios';
import tokenStorage from '../utils/tokenStorage';

// Configure API base URL
// Prefer environment variable only if it's set and doesn't point to a known-bad port (1408).
// Otherwise default to relative '' so Vite dev proxy forwards '/api' to backend.
const rawEnvUrl = import.meta?.env?.VITE_API_URL && import.meta.env.VITE_API_URL.trim();
let API_BASE_URL = '';
if (rawEnvUrl) {
  if (rawEnvUrl.includes(':1408')) {
    // Prefer a quieter informational message in dev so logs aren't noisy.
    API_BASE_URL = '';
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.info(`[api] Detected legacy VITE_API_URL=${rawEnvUrl}; using relative '/api' so Vite dev proxy forwards requests to the backend. To remove this message, unset VITE_API_URL in your .env or set it to the backend host (e.g. http://localhost:5000) if appropriate.`);
    }
  } else {
    API_BASE_URL = rawEnvUrl;
  }
} else {
  // Keep default as relative to allow Vite proxy. If you want to force backend host, set VITE_API_URL.
  API_BASE_URL = '';
}

if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info(`[api] Resolved API base: '${API_BASE_URL || '(relative /api via dev proxy)'}'`);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Network timeout configuration for slow connections
  timeout: 30000, // 30 seconds timeout for slow networks
  // Retry configuration
  maxContentLength: 100000000, // 100MB max response size
  maxBodyLength: 100000000, // 100MB max request size
});

// Defensive request interceptor: rewrite accidental absolute URLs (e.g. http://127.0.0.1:1408/...) to relative path
api.interceptors.request.use((config) => {
  try {
    if (typeof window !== 'undefined' && typeof config.url === 'string') {
      const url = config.url;
      if (/^https?:\/\//i.test(url)) {
        // If absolute URL contains port 1408, or origin differs from current, rewrite to relative
        const a = document.createElement('a');
        a.href = url;
        const origin = a.origin;
        if (origin.includes(':1408') || (window.location && origin !== window.location.origin)) {
          // eslint-disable-next-line no-console
          console.warn('[api] Rewriting absolute URL to relative for dev proxy:', url);
          config.url = a.pathname + (a.search || '') + (a.hash || '');
          config.baseURL = '';
        }
      }
    }
  } catch (e) {
    // ignore parsing errors
  }
  return config;
}, (err) => Promise.reject(err));

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const url = typeof config.url === 'string' ? config.url : '';
      
      // Skip auth if explicitly requested (e.g., for refresh endpoint)
      if (config.headers && config.headers['Skip-Auth']) {
        delete config.headers['Skip-Auth'];
        delete config.headers.Authorization;
        return config;
      }
      
      // If caller explicitly provided Authorization, don't override it
      if (config.headers && config.headers.Authorization) {
        return config;
      }
      
      const isAdminPath = url.startsWith('/admin') || url.startsWith('/api/admin');
      if (isAdminPath) {
        // Admin module: ONLY use admin access token
        const adminToken = localStorage.getItem('admin_access_token');
        if (adminToken) {
          config.headers.Authorization = `Bearer ${adminToken}`;
        } else if (config.headers && config.headers.Authorization) {
          delete config.headers.Authorization;
        }
      } else {
        // Donor vs Seeker routing based on current URL or request path
        const path = window.location?.pathname || '';
        const isDonorContext = path.startsWith('/donor') || url.startsWith('/api/donors');

        const donorToken = localStorage.getItem('access_token');
        const seekerToken = tokenStorage.getAccessToken();

        if (isDonorContext && donorToken) {
          config.headers.Authorization = `Bearer ${donorToken}`;
        } else if (!isDonorContext && seekerToken) {
          config.headers.Authorization = `Bearer ${seekerToken}`;
        } else if (donorToken) {
          // Fallback: if donor token exists and no seeker token, use donor token
          config.headers.Authorization = `Bearer ${donorToken}`;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Token refresh state (module-scoped)
let isRefreshing = false;
let refreshPromise = null;
const pendingRequestsQueue = [];

function enqueuePendingRequest(cb) {
  return new Promise((resolve, reject) => {
    pendingRequestsQueue.push({ resolve, reject, cb });
  });
}

function resolvePendingRequests(newToken) {
  pendingRequestsQueue.splice(0).forEach(({ resolve, cb }) => {
    try {
      resolve(cb(newToken));
    } catch (e) {
      resolve();
    }
  });
}

function rejectPendingRequests(error) {
  pendingRequestsQueue.splice(0).forEach(({ reject }) => reject(error));
}

// Response interceptor to handle auth errors and blocked users, with donor auto-refresh
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      const isAdminRoute = window.location.pathname.startsWith('/admin');

      // Handle blocked user (403 with blocked flag)
      if (error.response?.status === 403 && error.response?.data?.blocked) {
        if (!isAdminRoute) {
          const isDonorRoute = window.location.pathname.startsWith('/donor') || error.config?.url?.startsWith('/api/donors');
          // Clear user tokens
          localStorage.removeItem('seeker_token');
          localStorage.removeItem('token');
          localStorage.removeItem('seeker_refresh_token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');

          // Non-blocking handling: log and redirect to login
          // eslint-disable-next-line no-console
          console.warn('User blocked; redirecting to login');
          window.location.href = isDonorRoute ? '/donor/login' : '/seeker/login';
        }
      }

      // Handle unauthorized (401)
      if (error.response?.status === 401) {
        const originalRequest = error.config || {};
        const isDonorRoute = window.location.pathname.startsWith('/donor') || originalRequest?.url?.startsWith('/api/donors');
        if (isAdminRoute) {
          // Clear only admin tokens
          localStorage.removeItem('admin_access_token');
          localStorage.removeItem('admin_refresh_token');
          localStorage.setItem('toast_message', 'Your admin session expired. Please login again.');
          window.location.href = '/admin/login';
        } else if (isDonorRoute) {
          const refreshTokenValue = localStorage.getItem('refresh_token');
          if (!refreshTokenValue) {
            localStorage.removeItem('access_token');
            localStorage.setItem('toast_message', 'Your session expired. Please login again.');
            window.location.href = '/donor/login';
            return Promise.reject(error);
          }

          // Avoid multiple simultaneous refreshes
          if (!isRefreshing) {
            isRefreshing = true;
            // Don't include Authorization header in refresh request
            refreshPromise = api.post('/api/auth/refresh', { refresh_token: refreshTokenValue }, {
              headers: { 'Skip-Auth': 'true' } // Custom flag to skip auth interceptor
            })
              .then((res) => {
                const newAccess = res?.data?.access_token;
                const newRefresh = res?.data?.refresh_token;
                if (newAccess) localStorage.setItem('access_token', newAccess);
                if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
                resolvePendingRequests(newAccess);
                return newAccess;
              })
              .catch((e) => {
                rejectPendingRequests(e);
                // On refresh failure, logout donor
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.setItem('toast_message', 'Your session expired. Please login again.');
                window.location.href = '/donor/login';
                throw e;
              })
              .finally(() => {
                isRefreshing = false;
                refreshPromise = null;
              });
          }

          // Queue this failed request to retry after refresh
          return enqueuePendingRequest((newToken) => {
            if (!newToken) return Promise.reject(error);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            // Ensure baseURL still set correctly
            return api(originalRequest);
          });
        } else {
          // Seeker route - attempt token refresh
          const seekerRefreshToken = tokenStorage.getRefreshToken();
          
          if (!seekerRefreshToken) {
            // No refresh token available, redirect to login
            tokenStorage.clearTokens();
            localStorage.setItem('toast_message', 'Your session expired. Please login again.');
            window.location.href = '/seeker/login';
            return Promise.reject(error);
          }

          // Avoid multiple simultaneous refreshes
          if (!isRefreshing) {
            isRefreshing = true;
            // Don't include Authorization header in refresh request
            refreshPromise = api.post('/api/auth/refresh', { refresh_token: seekerRefreshToken }, {
              headers: { 'Skip-Auth': 'true' } // Custom flag to skip auth interceptor
            })
              .then((res) => {
                const newAccess = res?.data?.access_token;
                const newRefresh = res?.data?.refresh_token;
                if (newAccess && newRefresh) {
                  tokenStorage.updateTokens(newAccess, newRefresh);
                  resolvePendingRequests(newAccess);
                  return newAccess;
                } else if (newAccess) {
                  tokenStorage.updateAccessToken(newAccess);
                  resolvePendingRequests(newAccess);
                  return newAccess;
                }
                throw new Error('No tokens in refresh response');
              })
              .catch((e) => {
                rejectPendingRequests(e);
                // On refresh failure, logout seeker
                tokenStorage.clearTokens();
                localStorage.setItem('toast_message', 'Your session expired. Please login again.');
                window.location.href = '/seeker/login';
                throw e;
              })
              .finally(() => {
                isRefreshing = false;
                refreshPromise = null;
              });
          }

          // Queue this failed request to retry after refresh
          return enqueuePendingRequest((newToken) => {
            if (!newToken) return Promise.reject(error);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          });
        }
      }

      // Handle malformed/invalid JWTs returned as 422 by Flask-JWT-Extended
      if (error.response?.status === 422) {
        const isDonorRoute = window.location.pathname.startsWith('/donor') || error.config?.url?.startsWith('/api/donors');
        const msg = (error.response?.data?.msg || error.response?.data?.message || error.response?.data?.error || '').toString().toLowerCase();
        const looksLikeJwtIssue = msg.includes('subject must be a string') || msg.includes('bad authorization header') || msg.includes('not enough segments') || msg.includes('signature verification failed') || msg.includes('jwt');
        if (looksLikeJwtIssue) {
          if (isAdminRoute) {
            localStorage.removeItem('admin_access_token');
            localStorage.removeItem('admin_refresh_token');
            localStorage.setItem('toast_message', 'Your admin session is invalid. Please login again.');
            window.location.href = '/admin/login';
          } else if (isDonorRoute) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.setItem('toast_message', 'Your session is invalid. Please login again.');
            window.location.href = '/donor/login';
          } else {
            localStorage.removeItem('seeker_token');
            localStorage.removeItem('token');
            localStorage.removeItem('seeker_refresh_token');
            localStorage.setItem('toast_message', 'Your session is invalid. Please login again.');
            window.location.href = '/seeker/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Authentication functions
export async function registerDonor(payload) {
  return api.post("/api/auth/register", payload);
}

export async function checkAvailability(payload) {
  return api.post("/api/auth/check-availability", payload);
}

export async function verifyOtp(payload) {
  return api.post("/api/auth/verify-otp", payload);
}

// Contact verification
export async function sendContactOtp(payload) {
  return api.post("/api/auth/send-contact-otp", payload);
}

export async function verifyEmailOtp(payload) {
  return api.post("/api/auth/verify-email-otp", payload);
}


export async function login(payload) {
  return api.post("/api/auth/login", payload);
}

export async function loginSeeker(payload) {
  return api.post("/api/auth/seeker-login", payload);
}

export async function adminLogin(payload) {
  return api.post("/api/admin/auth/login", payload);
}

export async function adminRefreshToken(refreshToken) {
  return api.post('/api/admin/auth/refresh', { refresh_token: refreshToken });
}

export async function adminForgotPassword(email) {
  return api.post('/api/admin/auth/forgot-password', { email });
}

export async function adminResetPassword(token, new_password) {
  return api.post('/api/admin/auth/reset-password', { token, new_password });
}

export async function adminChangePassword(old_password, new_password) {
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;
  return api.post(
    '/api/auth/change-password',
    { old_password, new_password },
    adminToken ? { headers: { Authorization: `Bearer ${adminToken}` } } : {}
  );
}

export async function refreshToken(refreshToken) {
  return api.post("/api/auth/refresh", { refresh_token: refreshToken });
}

export async function getAdminProfile() {
  return api.get('/api/admin/auth/profile');
}

// Admin session management
export async function getAdminSessions() {
  return api.get('/api/admin/auth/sessions');
}

export async function revokeAllAdminSessions() {
  return api.post('/api/admin/auth/sessions/revoke-all', {});
}

export async function revokeOneAdminSession(session_id) {
  return api.post('/api/admin/auth/sessions/revoke-one', { session_id });
}

// Donor functions
export async function getDonorProfile() {
  return api.get("/api/donors/me");
}

export async function updateDonorProfile(data) {
  return api.put("/api/donors/me", data);
}

export async function setAvailability(status) {
  return api.post("/api/donors/availability", { status });
}

export async function getDonorMatches() {
  return api.get("/api/donors/matches");
}

export async function getDonorDashboard() {
  return api.get("/api/donors/dashboard");
}

export async function respondToMatch(matchId, action) {
  return api.post("/api/donors/respond", { match_id: matchId, action });
}

// Request functions
export async function createRequest(payload) {
  return api.post("/api/requests", payload);
}

export async function listRequests(mine = false) {
  return api.get(`/api/requests?mine=${mine}`);
}

export async function getNearbyRequests(lat, lng, radius = 50) {
  return api.get(`/api/requests/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
}

// Donor donation history
export async function getDonorDonations() {
  return api.get("/api/donors/donations");
}

export async function getDonationDetails(donationId) {
  return api.get(`/api/donors/donations/${donationId}`);
}

export async function recordDonation(payload) {
  return api.post("/api/donors/donations", payload);
}

export async function generateCertificate(donationId) {
  return api.post(`/api/donations/${donationId}/generate-certificate`);
}

export async function getDonorCertificates() {
  return api.get("/api/donors/me/certificates");
}

export async function getDonorBadges() {
  return api.get("/api/donors/me/badges");
}

// Donor notifications
export async function getDonorNotifications() {
  return api.get("/api/donors/notifications");
}

export async function markNotificationRead(notificationId) {
  return api.put(`/api/donors/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead() {
  return api.put("/api/donors/notifications/read-all");
}

// Password management
export async function changePassword(old_password, new_password) {
  return api.post("/api/auth/change-password", { old_password, new_password });
}

export async function forgotPassword(identifier) {
  return api.post("/api/auth/forgot-password", { identifier });
}

export async function resetPassword(token, new_password) {
  return api.post("/api/auth/reset-password", { token, new_password });
}

// Profile management
export async function uploadProfilePicture(file) {
  const formData = new FormData();
  formData.append('profile_picture', file);
  return api.post("/api/donors/profile-picture", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export async function deleteAccount() {
  return api.delete("/api/donors/me");
}

// Location update
export async function updateDonorLocation(lat, lng) {
  return api.post("/api/donors/update-location", { lat, lng });
}

// Admin functions
export async function adminGenerateMatches(payload) {
  return api.post("/api/admin/match/generate", payload);
}

export default api;
