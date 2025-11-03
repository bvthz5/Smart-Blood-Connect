import axios from 'axios';

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
});

// Request interceptor to handle WebSocket and API requests
api.interceptors.request.use((config) => {
  try {
    // Skip for WebSocket upgrade requests
    if (config.url && config.url.startsWith('ws')) {
      return config;
    }

    // Handle absolute URLs
    if (typeof window !== 'undefined' && typeof config.url === 'string') {
      const url = config.url;
      if (/^https?:\/\//i.test(url)) {
        const a = document.createElement('a');
        a.href = url;
        const origin = a.origin;
        // Only rewrite if it's not a WebSocket and matches our proxy pattern
        if (!config.url.startsWith('ws') && 
            (origin.includes(':1408') || (window.location && origin !== window.location.origin))) {
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
        const seekerToken = localStorage.getItem('seeker_token') || localStorage.getItem('token');

        if (isDonorContext && donorToken) {
          config.headers.Authorization = `Bearer ${donorToken}`;
        } else if (!isDonorContext && seekerToken) {
          config.headers.Authorization = `Bearer ${seekerToken}`;
        } else if (donorToken) {
          // Fallback: if donor token exists and no seeker token, use donor token
          config.headers.Authorization = `Bearer ${donorToken}`;
        } else if (config.headers && config.headers.Authorization) {
          delete config.headers.Authorization;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and blocked users
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
        const isDonorRoute = window.location.pathname.startsWith('/donor') || error.config?.url?.startsWith('/api/donors');
        if (isAdminRoute) {
          // Clear only admin tokens
          localStorage.removeItem('admin_access_token');
          localStorage.removeItem('admin_refresh_token');
          localStorage.setItem('toast_message', 'Your admin session expired. Please login again.');
          window.location.href = '/admin/login';
        } else if (isDonorRoute) {
          // Clear donor tokens and redirect to donor login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.setItem('toast_message', 'Your session expired. Please login again.');
          window.location.href = '/donor/login';
        } else {
          // Clear seeker tokens and redirect to seeker login
          localStorage.removeItem('seeker_token');
          localStorage.removeItem('token');
          localStorage.removeItem('seeker_refresh_token');
          localStorage.setItem('toast_message', 'Your session expired. Please login again.');
          window.location.href = '/seeker/login';
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

export async function getDonorCertificates() {
  return api.get("/api/donors/me/certificates");
}

export async function getDonorBadges() {
  return api.get("/api/donors/me/badges");
}

export async function getDonationDetails(donationId) {
  return api.get(`/api/donors/donations/${donationId}`);
}

export async function generateCertificate(donationId) {
  return api.post(`/api/donors/donations/${donationId}/certificate`);
}

export async function respondToMatch(matchId, action) {
  return api.post("/api/donors/respond", { match_id: matchId, action });
}

export async function updateDonorLocation(lat, lng) {
  return api.post("/api/donors/update-location", { lat, lng });
}

export async function getDonorDonations() {
  return api.get("/api/donors/donations");
}

export async function getDonorNotifications() {
  return api.get("/api/donors/notifications");
}

export async function markNotificationRead(notificationId) {
  return api.put(`/api/donors/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead() {
  return api.put("/api/donors/notifications/read-all");
}

export async function getNearbyRequests(lat, lng, radius = 50) {
  return api.get(`/api/requests/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
}

// Request functions
export async function createRequest(payload) {
  return api.post("/api/requests", payload);
}

export async function listRequests(mine = false) {
  return api.get(`/api/requests?mine=${mine}`);
}

// Admin functions
export async function adminGenerateMatches(payload) {
  return api.post("/api/admin/match/generate", payload);
}

export async function getAdminDashboard() {
  return api.get('/api/admin/dashboard');
}

// Admin Donation Requests functions
export async function getAdminDonationRequests(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.search) queryParams.append('search', params.search);
  if (params.blood_group) queryParams.append('blood_group', params.blood_group);
  if (params.hospital_id) queryParams.append('hospital_id', params.hospital_id);
  if (params.urgency) queryParams.append('urgency', params.urgency);
  if (params.status) queryParams.append('status', params.status);
  if (params.page) queryParams.append('page', params.page);
  if (params.per_page) queryParams.append('per_page', params.per_page);
  
  return api.get(`/api/admin/requests?${queryParams.toString()}`);
}

export async function getAdminRequestDetails(requestId) {
  return api.get(`/api/admin/requests/${requestId}`);
}

export async function updateAdminRequestStatus(requestId, status, notes = '') {
  return api.put(`/api/admin/requests/${requestId}/status`, {
    status,
    notes
  });
}

export async function assignDonorToRequest(requestId, donorId) {
  return api.post(`/api/admin/requests/${requestId}/assign-donor`, {
    donor_id: donorId
  });
}

export async function getAvailableDonorsForRequest(requestId) {
  return api.get(`/api/admin/requests/${requestId}/available-donors`);
}

export default api;
