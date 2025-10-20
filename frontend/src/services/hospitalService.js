import api from './api';

const hospitalService = {
  // Get all hospitals with search, filter, and pagination
  getAllHospitals: async (params = {}) => {
    const { page = 1, per_page = 10, search = '', district = '', city = '', is_verified = '' } = params;
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
    });
    
    if (search) queryParams.append('search', search);
    if (district) queryParams.append('district', district);
    if (city) queryParams.append('city', city);
    if (is_verified) queryParams.append('is_verified', is_verified);
    
    const response = await api.get(`/api/admin/hospitals?${queryParams.toString()}`);
    return response.data;
  },

  // Get single hospital by ID
  getHospitalById: async (id) => {
    const response = await api.get(`/api/admin/hospitals/${id}`);
    return response.data;
  },

  // Create new hospital
  createHospital: async (hospitalData) => {
    const response = await api.post('/api/admin/hospitals', hospitalData);
    return response.data;
  },

  // Update hospital
  updateHospital: async (id, hospitalData) => {
    const response = await api.put(`/api/admin/hospitals/${id}`, hospitalData);
    return response.data;
  },

  // Delete hospital
  deleteHospital: async (id) => {
    const response = await api.delete(`/api/admin/hospitals/${id}`);
    return response.data;
  },

  // Toggle verification status
  toggleVerification: async (id, isVerified) => {
    const response = await api.put(`/api/admin/hospitals/${id}`, {
      is_verified: isVerified
    });
    return response.data;
  },

  // Get hospital staff
  getHospitalStaff: async (hospitalId) => {
    const response = await api.get(`/api/admin/hospitals/${hospitalId}/staff`);
    return response.data;
  },

  // Block/Unblock staff member
  toggleStaffBlock: async (hospitalId, staffId) => {
    const response = await api.put(`/api/admin/hospitals/${hospitalId}/staff/${staffId}/block`);
    return response.data;
  },

  // Delete staff member
  deleteStaff: async (hospitalId, staffId) => {
    const response = await api.delete(`/api/admin/hospitals/${hospitalId}/staff/${staffId}`);
    return response.data;
  },

  // Assign new staff or reassign existing
  assignStaff: async (hospitalId, staffData) => {
    const response = await api.post(`/api/admin/hospitals/${hospitalId}/staff/assign`, staffData);
    return response.data;
  },

  // Update staff status (pending/active/rejected)
  updateStaffStatus: async (hospitalId, staffId, staffStatus) => {
    const response = await api.put(`/api/admin/hospitals/${hospitalId}/staff/${staffId}/status`, {
      staff_status: staffStatus
    });
    return response.data;
  },

  // Resend invitation to staff
  resendInvitation: async (hospitalId, staffId) => {
    const response = await api.post(`/api/admin/hospitals/${hospitalId}/staff/${staffId}/resend`);
    return response.data;
  },

  // Create hospital with staff members
  createHospitalWithStaff: async (data) => {
    const response = await api.post('/api/admin/hospitals/create-with-staff', data);
    return response.data;
  },

  // Unblock hospital staff
  unblockStaff: async (hospitalId) => {
    const response = await api.post(`/api/admin/hospitals/${hospitalId}/staff/unblock`);
    return response.data;
  }
};

export default hospitalService;
