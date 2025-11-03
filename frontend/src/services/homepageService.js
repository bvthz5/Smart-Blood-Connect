/**
 * Homepage Service - API calls for homepage data
 * Handles statistics, alerts, testimonials, and other homepage content
 */

import api from './api';

/**
 * Get homepage statistics
 * @returns {Promise} Statistics data
 */
export const getHomepageStats = async () => {
  try {
    const response = await api.get('/api/homepage/stats');
    
    if (!response || !response.data) {
      console.warn('[homepageService] Invalid response from stats API');
      return { success: false, data: {} };
    }
    
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[homepageService] Error fetching homepage stats:', error?.response?.data?.error || error?.message || error);
    return { success: false, data: {}, error: error?.message || 'Failed to fetch stats' };
  }
};

/**
 * Get emergency alerts and notifications
 * @returns {Promise} Alerts data
 */
export const getHomepageAlerts = async () => {
  try {
    const response = await api.get('/api/homepage/alerts');
    
    // Validate response structure
    if (!response || !response.data) {
      console.warn('[homepageService] Invalid response structure from alerts API');
      return { success: false, data: [] };
    }
    
    // Handle both direct array and { success, data } formats
    if (response.data.success === false) {
      console.warn('[homepageService] API returned error:', response.data.error);
      return { success: false, data: [] };
    }
    
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[homepageService] Error fetching homepage alerts:', error?.response?.data?.error || error?.message || error);
    
    // Return safe fallback instead of throwing
    return { success: false, data: [], error: error?.message || 'Failed to fetch alerts' };
  }
};

/**
 * Get urgent blood requests for carousel
 * @returns {Promise} Urgent requests data
 */
export const getUrgentRequests = async () => {
  try {
    const response = await api.get('/api/homepage/alerts');
    
    // Validate response structure
    if (!response || !response.data) {
      console.warn('[homepageService] Invalid response structure from urgent requests API');
      return { success: false, data: [] };
    }
    
    // Handle both direct array and { success, data } formats
    if (response.data.success === false) {
      console.warn('[homepageService] API returned error:', response.data.error);
      return { success: false, data: [] };
    }
    
    // Filter for urgent requests only (type: 'alert')
    const urgentRequests = (response.data.data || response.data).filter(item => item.type === 'alert');
    
    return { success: true, data: urgentRequests };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[homepageService] Error fetching urgent requests:', error?.response?.data?.error || error?.message || error);
    
    // Return safe fallback instead of throwing
    return { success: false, data: [], error: error?.message || 'Failed to fetch urgent requests' };
  }
};

/**
 * Get testimonials from donors and recipients
 * @returns {Promise} Testimonials data
 */
export const getHomepageTestimonials = async () => {
  try {
    const response = await api.get('/api/homepage/testimonials');
    
    if (!response || !response.data) {
      console.warn('[homepageService] Invalid response from testimonials API');
      return { success: false, data: [] };
    }
    
    return response.data;
  } catch (error) {
    console.error('[homepageService] Error fetching testimonials:', error?.response?.data?.error || error?.message || error);
    return { success: false, data: [], error: error?.message || 'Failed to fetch testimonials' };
  }
};

/**
 * Get blood availability across different blood types
 * @returns {Promise} Blood availability data
 */
export const getBloodAvailability = async () => {
  try {
    const response = await api.get('/api/homepage/blood-availability');
    
    if (!response || !response.data) {
      console.warn('[homepageService] Invalid response from blood availability API');
      return { success: false, data: {} };
    }
    
    return response.data;
  } catch (error) {
    console.error('[homepageService] Error fetching blood availability:', error?.response?.data?.error || error?.message || error);
    return { success: false, data: {}, error: error?.message || 'Failed to fetch blood availability' };
  }
};

/**
 * Get featured hospitals for homepage
 * @returns {Promise} Featured hospitals data
 */
export const getFeaturedHospitals = async () => {
  try {
    const response = await api.get('/api/homepage/featured-hospitals');
    
    if (!response || !response.data) {
      console.warn('[homepageService] Invalid response from featured hospitals API');
      return { success: false, data: [] };
    }
    
    return response.data;
  } catch (error) {
    console.error('[homepageService] Error fetching featured hospitals:', error?.response?.data?.error || error?.message || error);
    return { success: false, data: [], error: error?.message || 'Failed to fetch featured hospitals' };
  }
};

/**
 * Get comprehensive dashboard summary
 * @returns {Promise} Dashboard summary data
 */
export const getDashboardSummary = async () => {
  try {
    const response = await api.get('/api/homepage/dashboard-summary');
    
    if (!response || !response.data) {
      console.warn('[homepageService] Invalid response from dashboard summary API');
      return { success: false, data: {} };
    }
    
    return response.data;
  } catch (error) {
    console.error('[homepageService] Error fetching dashboard summary:', error?.response?.data?.error || error?.message || error);
    return { success: false, data: {}, error: error?.message || 'Failed to fetch dashboard summary' };
  }
};

/**
 * Get all homepage data in a single call
 * @returns {Promise} Combined homepage data
 */
export const getAllHomepageData = async () => {
  try {
    const [statsResp, alertsResp, testimonialsResp, bloodAvailabilityResp, featuredHospitalsResp] = await Promise.all([
      getHomepageStats(),
      getHomepageAlerts(),
      getHomepageTestimonials(),
      getBloodAvailability(),
      getFeaturedHospitals()
    ]);

    return {
      stats: statsResp.data,
      alerts: alertsResp.data,
      testimonials: testimonialsResp.data,
      bloodAvailability: bloodAvailabilityResp.data,
      featuredHospitals: featuredHospitalsResp.data,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[homepageService] Error fetching all homepage data:', error?.message || error);
    throw error;
  }
};

/**
 * Cache management for homepage data
 */
class HomepageCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  clearExpired() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

// Export cache instance
export const homepageCache = new HomepageCache();

/**
 * Cached versions of API calls
 */
export const getCachedHomepageStats = async () => {
  const cacheKey = 'homepage-stats';
  let data = homepageCache.get(cacheKey);
  
  if (!data) {
    try {
      const response = await getHomepageStats();
      
      if (response && response.success !== false) {
        data = response.data || response;
        homepageCache.set(cacheKey, data);
      } else {
        console.warn('[homepageService] Not caching failed stats response');
        return {};
      }
    } catch (error) {
      console.error('[homepageService] Error in cached stats:', error);
      return {};
    }
  }
  
  return data || {};
};

export const getCachedHomepageAlerts = async () => {
  const cacheKey = 'homepage-alerts';
  let data = homepageCache.get(cacheKey);
  
  if (!data) {
    try {
      const response = await getHomepageAlerts();
      
      // Validate response before caching
      if (response && response.success !== false) {
        data = response.data || response;
        homepageCache.set(cacheKey, data);
      } else {
        // Return empty array instead of caching error state
        console.warn('[homepageService] Not caching failed alerts response');
        return [];
      }
    } catch (error) {
      console.error('[homepageService] Error in cached alerts:', error);
      // Return empty array instead of throwing
      return [];
    }
  }
  
  return data || [];
};

export const getCachedUrgentRequests = async () => {
  const cacheKey = 'urgent-requests';
  let data = homepageCache.get(cacheKey);
  
  if (!data) {
    try {
      const response = await getUrgentRequests();
      
      // Validate response before caching
      if (response && response.success !== false) {
        data = response.data || response;
        homepageCache.set(cacheKey, data);
      } else {
        // Return empty array instead of caching error state
        console.warn('[homepageService] Not caching failed urgent requests response');
        return [];
      }
    } catch (error) {
      console.error('[homepageService] Error in cached urgent requests:', error);
      // Return empty array instead of throwing
      return [];
    }
  }
  
  return data || [];
};

export const getCachedHomepageTestimonials = async () => {
  const cacheKey = 'homepage-testimonials';
  let data = homepageCache.get(cacheKey);
  
  if (!data) {
    try {
      const response = await getHomepageTestimonials();
      
      if (response && response.success !== false) {
        data = response.data || response;
        homepageCache.set(cacheKey, data);
      } else {
        console.warn('[homepageService] Not caching failed testimonials response');
        return [];
      }
    } catch (error) {
      console.error('[homepageService] Error in cached testimonials:', error);
      return [];
    }
  }
  
  return data || [];
};

/**
 * Utility functions
 */

/**
 * Format numbers with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (typeof num !== 'number') return '0';
  return num.toLocaleString();
};

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(dateString);
};

/**
 * Handle API errors gracefully
 * @param {Error} error - Error object
 * @param {string} fallbackMessage - Fallback message to show
 * @returns {object} Error information
 */
export const handleApiError = (error, fallbackMessage = 'Something went wrong') => {
  const errorMessage = error.response?.data?.error || error.message || fallbackMessage;
  const statusCode = error.response?.status || 500;
  
  return {
    message: errorMessage,
    status: statusCode,
    isNetworkError: !error.response
  };
};

export default {
  getHomepageStats,
  getHomepageAlerts,
  getUrgentRequests,
  getHomepageTestimonials,
  getBloodAvailability,
  getFeaturedHospitals,
  getDashboardSummary,
  getAllHomepageData,
  getCachedHomepageStats,
  getCachedHomepageAlerts,
  getCachedUrgentRequests,
  getCachedHomepageTestimonials,
  homepageCache,
  formatNumber,
  formatDate,
  getRelativeTime,
  handleApiError
};