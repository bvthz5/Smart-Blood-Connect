import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { tokenManager } from '../../utils/tokenManager';

// Async thunks
export const loginAdmin = createAsyncThunk(
  'admin/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/auth/login', { email, password });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  }
);

export const fetchDashboardData = createAsyncThunk(
  'admin/fetchDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await api.get('/api/admin/dashboard/', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.data;
    } catch (error) {
      if (error.name === 'AbortError') {
        return rejectWithValue('Request timeout - please try again');
      }
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch dashboard data');
    }
  }
);

const initialState = {
  user: null,
  token: null, // Don't initialize from localStorage immediately
  refreshToken: null, // Don't initialize from localStorage immediately
  isAuthenticated: false, // Start as false to prevent auto-routing
  isLoading: true, // Start with loading true to prevent immediate redirects
  error: null,
  dashboardData: {
    stats: {
      totalDonors: 0,
      activeDonors: 0,
      hospitals: 0,
      openRequests: 0,
      urgentRequests: 0,
      donationsToday: 0,
    },
    charts: null, // Load charts data only when needed
    recentEmergencies: null, // Load emergencies data only when needed
    topHospitals: null, // Load hospitals data only when needed
    topDonors: null, // Load donors data only when needed
  },
  darkMode: false,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    initializeAuth: (state) => {
      if (typeof window !== 'undefined') {
        const isAuth = tokenManager.isAdminAuthenticated();
        if (isAuth) {
          const token = tokenManager.getToken();
          const refreshToken = tokenManager.getRefreshToken();
          const userInfo = tokenManager.getUserFromToken();
          
          // Only update if values have changed to prevent unnecessary re-renders
          if (state.token !== token) state.token = token;
          if (state.refreshToken !== refreshToken) state.refreshToken = refreshToken;
          if (!state.isAuthenticated) state.isAuthenticated = true;
          
          const newUser = userInfo ? {
            id: userInfo.sub || userInfo.user_id,
            name: userInfo.name || 'Admin',
            email: userInfo.email,
            role: userInfo.role || 'admin'
          } : null;
          
          if (JSON.stringify(state.user) !== JSON.stringify(newUser)) {
            state.user = newUser;
          }
        } else {
          // Only update if values have changed
          if (state.token !== null) state.token = null;
          if (state.refreshToken !== null) state.refreshToken = null;
          if (state.isAuthenticated !== false) state.isAuthenticated = false;
          if (state.user !== null) state.user = null;
          tokenManager.clearTokens();
        }
      }
      if (state.isLoading !== false) state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.dashboardData = initialState.dashboardData;
      if (typeof window !== 'undefined') {
        tokenManager.clearTokens();
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDashboardData: (state, action) => {
      state.dashboardData = { ...state.dashboardData, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
          .addCase(loginAdmin.fulfilled, (state, action) => {
            state.isLoading = false;
            state.isAuthenticated = true;
            state.user = action.payload.admin;
            state.token = action.payload.access_token;
            state.refreshToken = action.payload.refresh_token;
            state.error = null;
            if (typeof window !== 'undefined') {
              tokenManager.setToken(action.payload.access_token);
              if (action.payload.refresh_token) {
                tokenManager.setRefreshToken(action.payload.refresh_token);
              }
            }
          })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.error = action.payload;
        if (typeof window !== 'undefined') {
          tokenManager.clearTokens();
        }
      })
      // Dashboard data cases
      .addCase(fetchDashboardData.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboardData = action.payload;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { initializeAuth, logout, clearError, toggleDarkMode, setDashboardData } = adminSlice.actions;
export default adminSlice.reducer;
