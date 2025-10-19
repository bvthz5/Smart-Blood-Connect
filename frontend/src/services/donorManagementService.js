import api from './api';

const donorManagementService = {
  // Get all donors with search, filter, and pagination
  getDonors: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.blood_group) queryParams.append('blood_group', params.blood_group);
    if (params.status) queryParams.append('status', params.status);
    if (params.availability) queryParams.append('availability', params.availability);
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    
    const response = await api.get(`/api/admin/donors?${queryParams.toString()}`);
    return response.data;
  },

  // Get single donor by ID
  getDonorById: async (donorId) => {
    const response = await api.get(`/api/admin/donors/${donorId}`);
    return response.data;
  },

  // Update donor information
  updateDonor: async (donorId, donorData) => {
    const response = await api.put(`/api/admin/donors/${donorId}`, donorData);
    return response.data;
  },

  // Delete donor (soft delete)
  deleteDonor: async (donorId) => {
    const response = await api.delete(`/api/admin/donors/${donorId}`);
    return response.data;
  },

  // Block or unblock donor
  blockDonor: async (donorId, action = 'block') => {
    const response = await api.post(`/api/admin/donors/${donorId}/block`, { action });
    return response.data;
  },

  // Toggle donor status (active/blocked)
  toggleDonorStatus: async (donorId) => {
    const response = await api.post(`/api/admin/donors/${donorId}/toggle-status`);
    return response.data;
  },

  // Get donor statistics
  getDonorStats: async () => {
    const response = await api.get('/api/admin/donors/stats');
    return response.data;
  },

  // Export donors to CSV
  exportDonorsCsv: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.blood_group) queryParams.append('blood_group', params.blood_group);
    if (params.status) queryParams.append('status', params.status);
    if (params.availability) queryParams.append('availability', params.availability);
    
    const response = await api.get(`/api/admin/donors/export?${queryParams.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default donorManagementService;
