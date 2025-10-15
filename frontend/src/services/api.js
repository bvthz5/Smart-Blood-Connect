import axios from 'axios';

// Configure API base URL
// Prefer environment variable; fall back to same-origin (Vite proxy handles /api)
const API_BASE_URL =
  (import.meta?.env?.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://127.0.0.1:5000' : '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const url = typeof config.url === 'string' ? config.url : '';
      // If caller explicitly provided Authorization, don't override it
      if (config.headers && config.headers.Authorization) {
        return config;
      }
      const isAdminPath = url.startsWith('/admin');
      if (isAdminPath) {
        // Admin module: ONLY use admin access token
        const adminToken = localStorage.getItem('admin_access_token');
        if (adminToken) {
          config.headers.Authorization = `Bearer ${adminToken}`;
        } else if (config.headers && config.headers.Authorization) {
          delete config.headers.Authorization;
        }
      } else {
        // Non-admin modules: use their own tokens ONLY
        const seekerToken = localStorage.getItem('seeker_token') || localStorage.getItem('token');
        if (seekerToken) {
          config.headers.Authorization = `Bearer ${seekerToken}`;
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const isAdminRoute = window.location.pathname.startsWith('/admin');
        if (isAdminRoute) {
          // Clear only admin tokens
          localStorage.removeItem('admin_access_token');
          localStorage.removeItem('admin_refresh_token');
          window.location.href = '/admin/login';
        } else {
          // Clear only non-admin tokens
          localStorage.removeItem('seeker_token');
          localStorage.removeItem('token');
          localStorage.removeItem('seeker_refresh_token');
          window.location.href = '/seeker/login';
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

export async function verifyOtp(payload) {
  return api.post("/api/auth/verify-otp", payload);
}

export async function login(payload) {
  return api.post("/api/auth/login", payload);
}

export async function loginSeeker(payload) {
  return api.post("/api/auth/seeker-login", payload);
}

export async function adminLogin(payload) {
  return api.post("/admin/auth/login", payload);
}

export async function adminRefreshToken(refreshToken) {
  return api.post('/admin/auth/refresh', { refresh_token: refreshToken });
}

export async function adminForgotPassword(email) {
  return api.post('/admin/auth/forgot-password', { email });
}

export async function adminResetPassword(token, new_password) {
  return api.post('/admin/auth/reset-password', { token, new_password });
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
  return api.get('/admin/auth/profile');
}

// Admin session management
export async function getAdminSessions() {
  return api.get('/admin/auth/sessions');
}

export async function revokeAllAdminSessions() {
  return api.post('/admin/auth/sessions/revoke-all', {});
}

export async function revokeOneAdminSession(session_id) {
  return api.post('/admin/auth/sessions/revoke-one', { session_id });
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

// Admin functions
export async function adminGenerateMatches(payload) {
  return api.post("/admin/match/generate", payload);
}

export default api;
