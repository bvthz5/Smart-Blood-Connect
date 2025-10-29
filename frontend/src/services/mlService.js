/**
 * ML Service
 * API calls for machine learning predictions and model management
 */

import api from './api';

const mlService = {
  /**
   * Health check for ML service
   * @returns {Promise} - Service health status
   */
  healthCheck: async () => {
    const response = await api.get('/api/ml/health');
    return response.data;
  },

  /**
   * Find and rank donor matches for a blood request using ML
   * @param {number} requestId - Blood request ID
   * @param {number} topK - Number of top matches to return (default: 10)
   * @param {boolean} savePredictions - Save predictions to database (default: true)
   * @returns {Promise} - Match predictions
   */
  findDonorMatches: async (requestId, topK = 10, savePredictions = true) => {
    const response = await api.post('/api/ml/match', {
      request_id: requestId,
      top_k: topK,
      save_predictions: savePredictions
    });
    return response.data;
  },

  /**
   * Predict donor availability
   * @param {number} donorId - Donor ID
   * @returns {Promise} - Availability prediction
   */
  predictAvailability: async (donorId) => {
    const response = await api.post('/api/ml/predict_availability', {
      donor_id: donorId
    });
    return response.data;
  },

  /**
   * Get prediction history for a blood request
   * @param {number} requestId - Blood request ID
   * @returns {Promise} - Prediction history
   */
  getPredictionHistory: async (requestId) => {
    const response = await api.get(`/api/ml/predictions/history?request_id=${requestId}`);
    return response.data;
  },

  /**
   * List all available ML models
   * @returns {Promise} - Model metadata
   */
  listModels: async () => {
    const response = await api.get('/api/ml/models');
    return response.data;
  },

  /**
   * Reload a specific ML model (admin only)
   * @param {string} modelKey - Model identifier (e.g., 'donor_seeker_match')
   * @returns {Promise} - Reload confirmation
   */
  reloadModel: async (modelKey) => {
    const response = await api.post(`/api/ml/models/${modelKey}/reload`);
    return response.data;
  },

  /**
   * Get donor match recommendations for a specific request
   * Includes ML scores and contact information
   * @param {number} requestId - Blood request ID
   * @param {Object} options - Additional options
   * @returns {Promise} - Match recommendations
   */
  getMatchRecommendations: async (requestId, options = {}) => {
    const { topK = 10, includeContacts = false } = options;
    
    const result = await mlService.findDonorMatches(requestId, topK, true);
    
    // Optionally filter or enrich results
    if (includeContacts) {
      // Contact info already included in response
      return result;
    }
    
    // Remove sensitive contact info
    const sanitized = {
      ...result,
      matches: result.matches.map(match => {
        const { phone, ...rest } = match;
        return rest;
      })
    };
    
    return sanitized;
  }
};

export default mlService;
