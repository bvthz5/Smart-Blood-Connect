import api from './api';

const bloodMatchingService = {
  // Get all blood matches with search, filter, and pagination
  getMatches: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.blood_group) queryParams.append('blood_group', params.blood_group);
    if (params.urgency) queryParams.append('urgency', params.urgency);
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page); // Fixed parameter name to match backend
    
    try {
      const response = await api.get(`/api/admin/matches?${queryParams.toString()}`);
      // Return the response data directly as the backend returns the correct structure
      if (response.data && response.data.matches) {
        return {
          matches: response.data.matches,
          total: response.data.total || 0,
          pages: response.data.pages || 1,
          page: response.data.page || params.page || 1,
          per_page: response.data.per_page || params.per_page || 20
        };
      }
      throw new Error('Invalid response format from server');
    } catch (error) {
      console.error('Error fetching matches:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error(error.message || 'Failed to fetch matches');
    }
  },

  // Update match status (accept, decline, complete)
  updateMatchStatus: async (matchId, status, notes = '') => {
    try {
      const response = await api.put(`/api/admin/matches/${matchId}/status`, {
        status,
        notes
      });
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Get match statistics
  getMatchStats: async () => {
    try {
      const response = await api.get('/api/admin/matches/stats');
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Export matches to CSV
  exportMatches: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.blood_group) queryParams.append('blood_group', params.blood_group);
    if (params.urgency) queryParams.append('urgency', params.urgency);
    
    try {
      const response = await api.get(`/api/admin/matches/export?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  }
};

export default bloodMatchingService;
