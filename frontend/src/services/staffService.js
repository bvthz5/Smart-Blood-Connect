import api from './api';

const staffService = {
  /**
   * Get hospital information for the logged-in staff member
   */
  getHospitalInfo: async () => {
    const res = await api.get('/api/staff/hospital-info');
    return res.data;
  },

  /**
   * Get dashboard overview data
   */
  getDashboardData: async () => {
    const res = await api.get('/api/staff/dashboard');
    return res.data;
  },

  /**
   * Get all blood requests for the hospital
   */
  getRequests: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const res = await api.get(`/api/staff/requests${queryParams ? `?${queryParams}` : ''}`);
    return res.data;
  },

  /**
   * Get a specific blood request
   */
  getRequest: async (requestId) => {
    const res = await api.get(`/api/staff/requests/${requestId}`);
    return res.data;
  },

  /**
   * Create a new blood request
   */
  createRequest: async (requestData) => {
    const res = await api.post('/api/staff/requests', requestData);
    return res.data;
  },

  /**
   * Update a blood request
   */
  updateRequest: async (requestId, updateData) => {
    const res = await api.put(`/api/staff/requests/${requestId}`, updateData);
    return res.data;
  },

  /**
   * Cancel a blood request
   */
  cancelRequest: async (requestId, reason) => {
    const res = await api.post(`/api/staff/requests/${requestId}/cancel`, { reason });
    return res.data;
  },

  /**
   * Get donor matches for a request
   */
  getMatches: async (requestId) => {
    const res = await api.get(`/api/staff/requests/${requestId}/matches`);
    return res.data;
  },

  /**
   * Get all matches for the hospital
   */
  getAllMatches: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const res = await api.get(`/api/staff/matches${queryParams ? `?${queryParams}` : ''}`);
    return res.data;
  },

  /**
   * Confirm a donor match
   */
  confirmMatch: async (matchId) => {
    const res = await api.post(`/api/staff/matches/${matchId}/confirm`);
    return res.data;
  },

  /**
   * Reject a donor match
   */
  rejectMatch: async (matchId, reason) => {
    const res = await api.post(`/api/staff/matches/${matchId}/reject`, { reason });
    return res.data;
  },

  /**
   * Get analytics data
   */
  getAnalytics: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const res = await api.get(`/api/staff/analytics${queryParams ? `?${queryParams}` : ''}`);
    return res.data;
  },

  /**
   * Get notifications
   */
  getNotifications: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const res = await api.get(`/api/staff/notifications${queryParams ? `?${queryParams}` : ''}`);
    return res.data;
  },

  /**
   * Mark notification as read
   */
  markNotificationAsRead: async (notificationId) => {
    const res = await api.post(`/api/staff/notifications/${notificationId}/read`);
    return res.data;
  },

  /**
   * Get hospital staff members
   */
  getStaffMembers: async () => {
    const res = await api.get('/api/staff/members');
    return res.data;
  },

  /**
   * Get hospital settings
   */
  getSettings: async () => {
    const res = await api.get('/api/staff/settings');
    return res.data;
  },

  /**
   * Update hospital settings
   */
  updateSettings: async (settings) => {
    const res = await api.put('/api/staff/settings', settings);
    return res.data;
  },

  /**
   * Get hospital profile
   */
  getHospitalProfile: async () => {
    const res = await api.get('/api/staff/hospital-profile');
    return res.data;
  },

  /**
   * Update hospital profile
   */
  updateHospitalProfile: async (profileData) => {
    const res = await api.put('/api/staff/hospital-profile', profileData);
    return res.data;
  },

  /**
   * Get demand forecast
   */
  getDemandForecast: async () => {
    const res = await api.get('/api/staff/demand-forecast');
    return res.data;
  },

  /**
   * Get blood inventory
   */
  getInventory: async () => {
    const res = await api.get('/api/staff/inventory');
    return res.data;
  },

  /**
   * Update blood inventory
   */
  updateInventory: async (inventoryData) => {
    const res = await api.put('/api/staff/inventory', inventoryData);
    return res.data;
  },

  /**
   * Export requests to CSV
   */
  exportRequests: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const res = await api.get(`/api/staff/requests/export/csv${queryParams ? `?${queryParams}` : ''}`, {
      responseType: 'blob'
    });
    return res.data;
  },

  /**
   * Export matches to CSV
   */
  exportMatches: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const res = await api.get(`/api/staff/matches/export/csv${queryParams ? `?${queryParams}` : ''}`, {
      responseType: 'blob'
    });
    return res.data;
  },

  /**
   * Get activity log
   */
  getActivityLog: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const res = await api.get(`/api/staff/activity-log${queryParams ? `?${queryParams}` : ''}`);
    return res.data;
  }
};

export default staffService;

