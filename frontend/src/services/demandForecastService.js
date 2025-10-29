/**
 * Demand Forecast Service
 * API calls for blood demand forecasting
 */

import api from './api';

const demandForecastService = {
  /**
   * Get blood demand forecasts
   * @param {Object} params - Query parameters
   * @param {string} params.district - Filter by district (optional)
   * @param {string} params.blood_group - Filter by blood group (optional)
   * @param {number} params.days - Number of days ahead (default: 30)
   * @param {string} params.start_date - Start date YYYY-MM-DD (optional)
   * @param {string} params.end_date - End date YYYY-MM-DD (optional)
   * @returns {Promise} - Forecast data
   */
  getForecast: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.district) queryParams.append('district', params.district);
    if (params.blood_group) queryParams.append('blood_group', params.blood_group);
    if (params.days) queryParams.append('days', params.days);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    const queryString = queryParams.toString();
    const url = `/api/ml/demand-forecast${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Get list of districts with available forecasts
   * @returns {Promise} - List of districts
   */
  getDistricts: async () => {
    const response = await api.get('/api/ml/demand-forecast/districts');
    return response.data;
  },

  /**
   * Get forecast for specific blood group across all districts
   * @param {string} bloodGroup - Blood group (e.g., 'O+')
   * @param {number} days - Number of days ahead (default: 30)
   * @returns {Promise} - Forecast data
   */
  getForecastByBloodGroup: async (bloodGroup, days = 30) => {
    const response = await api.get(`/api/ml/demand-forecast?blood_group=${bloodGroup}&days=${days}`);
    return response.data;
  },

  /**
   * Get forecast for specific district across all blood groups
   * @param {string} district - District name
   * @param {number} days - Number of days ahead (default: 30)
   * @returns {Promise} - Forecast data
   */
  getForecastByDistrict: async (district, days = 30) => {
    const response = await api.get(`/api/ml/demand-forecast?district=${district}&days=${days}`);
    return response.data;
  },

  /**
   * Get aggregated forecast summary
   * @param {Object} params - Query parameters
   * @returns {Promise} - Summary data
   */
  getForecastSummary: async (params = {}) => {
    const data = await demandForecastService.getForecast({ ...params, days: params.days || 7 });
    
    // Aggregate by blood group
    const byBloodGroup = {};
    const byDistrict = {};
    
    data.forecasts.forEach(forecast => {
      // By blood group
      if (!byBloodGroup[forecast.blood_group]) {
        byBloodGroup[forecast.blood_group] = {
          blood_group: forecast.blood_group,
          total_demand: 0,
          count: 0
        };
      }
      byBloodGroup[forecast.blood_group].total_demand += forecast.predicted_demand;
      byBloodGroup[forecast.blood_group].count += 1;
      
      // By district
      if (!byDistrict[forecast.district]) {
        byDistrict[forecast.district] = {
          district: forecast.district,
          total_demand: 0,
          count: 0
        };
      }
      byDistrict[forecast.district].total_demand += forecast.predicted_demand;
      byDistrict[forecast.district].count += 1;
    });
    
    return {
      ...data,
      aggregates: {
        by_blood_group: Object.values(byBloodGroup).map(item => ({
          ...item,
          avg_daily_demand: item.total_demand / item.count
        })),
        by_district: Object.values(byDistrict).map(item => ({
          ...item,
          avg_daily_demand: item.total_demand / item.count
        }))
      }
    };
  }
};

export default demandForecastService;
