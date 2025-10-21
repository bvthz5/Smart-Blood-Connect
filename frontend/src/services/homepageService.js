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
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[homepageService] Error fetching homepage stats:', error?.message || error);
    throw error;
  }
};

/**
 * Get emergency alerts and notifications
 * @returns {Promise} Alerts data
 */
export const getHomepageAlerts = async () => {
  try {
    const response = await api.get('/api/homepage/alerts');
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[homepageService] Error fetching homepage alerts:', error?.message || error);
    throw error;
  }
};

/**
 * Get testimonials from donors and recipients
 * @returns {Promise} Testimonials data
 */
export const getHomepageTestimonials = async () => {
  try {
    const response = await api.get('/api/homepage/testimonials');
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[homepageService] Error fetching testimonials:', error?.message || error);
    throw error;
  }
};

/**
 * Get blood availability across different blood types
 * @returns {Promise} Blood availability data
 */
export const getBloodAvailability = async () => {
  try {
    const response = await api.get('/api/homepage/blood-availability');
    return response.data;
  } catch (error) {
    console.error('Error fetching blood availability:', error);
    throw error;
  }
};

/**
 * Get featured hospitals for homepage
 * @returns {Promise} Featured hospitals data
 */
export const getFeaturedHospitals = async () => {
  try {
    const response = await api.get('/api/homepage/featured-hospitals');
    return response.data;
  } catch (error) {
    console.error('Error fetching featured hospitals:', error);
    throw error;
  }
};

/**
 * Get comprehensive dashboard summary
 * @returns {Promise} Dashboard summary data
 */
export const getDashboardSummary = async () => {
  try {
    const response = await api.get('/api/homepage/dashboard-summary');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    throw error;
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
    const response = await getHomepageStats();
    data = response.data;
    homepageCache.set(cacheKey, data);
  }
  
  return data;
};

export const getCachedHomepageAlerts = async () => {
  const cacheKey = 'homepage-alerts';
  let data = homepageCache.get(cacheKey);
  
  if (!data) {
    const response = await getHomepageAlerts();
    data = response.data;
    homepageCache.set(cacheKey, data);
  }
  
  return data;
};

export const getCachedHomepageTestimonials = async () => {
  const cacheKey = 'homepage-testimonials';
  let data = homepageCache.get(cacheKey);
  
  if (!data) {
    const response = await getHomepageTestimonials();
    data = response.data;
    homepageCache.set(cacheKey, data);
  }
  
  return data;
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
  getHomepageTestimonials,
  getBloodAvailability,
  getFeaturedHospitals,
  getDashboardSummary,
  getAllHomepageData,
  getCachedHomepageStats,
  getCachedHomepageAlerts,
  getCachedHomepageTestimonials,
  homepageCache,
  formatNumber,
  formatDate,
  getRelativeTime,
  handleApiError
};
