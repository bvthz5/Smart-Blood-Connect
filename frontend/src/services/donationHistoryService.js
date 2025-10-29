import api from './api';

const donationHistoryService = {
  // Get donation history with pagination and filters
  getDonationHistory: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add pagination parameters
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);
      
      // Add search parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.donor_name) queryParams.append('donor_name', params.donor_name);
      if (params.hospital_name) queryParams.append('hospital_name', params.hospital_name);
      if (params.blood_group) queryParams.append('blood_group', params.blood_group);
      if (params.date_from) queryParams.append('date_from', params.date_from);
      if (params.date_to) queryParams.append('date_to', params.date_to);
      if (params.status) queryParams.append('status', params.status);
      
      const response = await api.get(`/api/admin/donation-history?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching donation history:', error);
      throw error;
    }
  },

  // Export donation history to CSV
  exportToCSV: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters for export
      if (params.search) queryParams.append('search', params.search);
      if (params.donor_name) queryParams.append('donor_name', params.donor_name);
      if (params.hospital_name) queryParams.append('hospital_name', params.hospital_name);
      if (params.blood_group) queryParams.append('blood_group', params.blood_group);
      if (params.date_from) queryParams.append('date_from', params.date_from);
      if (params.date_to) queryParams.append('date_to', params.date_to);
      
      const response = await api.get(`/api/admin/donation-history/export?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link - optimized for performance
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `donation-history-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.display = 'none'; // Hide to prevent layout shift
      document.body.appendChild(link);
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        link.click();
        // Clean up after a short delay
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting donation history:', error);
      throw error;
    }
  },

  // Get donation history statistics
  getDonationStats: async () => {
    try {
      const response = await api.get('/api/admin/donation-history/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching donation stats:', error);
      throw error;
    }
  }
};

export default donationHistoryService;
