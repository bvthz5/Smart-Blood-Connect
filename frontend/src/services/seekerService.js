import api from './api';

const seekerService = {
  login: async (email_or_phone, password) => {
    const res = await api.post('/api/auth/seeker-login', { email_or_phone, password });
    return res.data;
  },
  forgotPassword: async (email_or_phone) => {
    const res = await api.post('/api/auth/forgot-password', { email_or_phone });
    return res.data;
  },
  resetPassword: async (token, new_password) => {
    const res = await api.post('/api/auth/reset-password', { token, new_password });
    return res.data;
  },
  activate: async (old_password, new_password) => {
    const temp = typeof window !== 'undefined' ? localStorage.getItem('seeker_temp_token') : null;
    const res = await api.post('/api/seeker/activate', { old_password, new_password }, {
      headers: temp ? { Authorization: `Bearer ${temp}` } : {}
    });
    return res.data;
  },
  changePassword: async (old_password, new_password) => {
    // Try temp token first (for force password change), then regular token
    const tempToken = typeof window !== 'undefined' ? localStorage.getItem('seeker_temp_token') : null;
    const regularToken = typeof window !== 'undefined' ? localStorage.getItem('seeker_token') : null;
    const token = tempToken || regularToken;
    
    const res = await api.post('/api/seeker/change-password', { old_password, new_password }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return res.data;
  },
  dashboard: async () => {
    const res = await api.get('/api/seeker/dashboard');
    return res.data;
  },
  createRequest: async (payload) => {
    // Backend expects: blood_group, units_required, urgency, location
    const res = await api.post('/api/requests', payload);
    return res.data;
  },
  listRequests: async (params = {}) => {
    const queryObj = { ...params };
    if (queryObj.mine === undefined) queryObj.mine = true;
    const query = new URLSearchParams(queryObj).toString();
    const res = await api.get(`/api/requests${query ? `?${query}` : ''}`);
    return res.data;
  },
  listMatches: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await api.get(`/api/seeker/matches${query ? `?${query}` : ''}`);
      return res.data;
    } catch (error) {
      console.error('Error fetching matches:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error(error.message || 'Failed to fetch matches');
    }
  },
  getHospital: async () => {
    const res = await api.get('/api/seeker/hospital');
    return res.data;
  },
  updateHospital: async (payload) => {
    const res = await api.put('/api/seeker/hospital', payload);
    return res.data;
  }
};

export default seekerService;