/**
 * Custom Hook for HTML5 Geolocation API
 * Handles location tracking with error handling and loading states
 * 
 * TIMEOUT STRATEGY:
 * - Uses 30-second timeout (GPS can take 20-30s for initial fix indoors)
 * - Accepts 1-minute-old cached positions to reduce timeout errors
 * - Timeout errors are treated as transient and don't show to user
 * - watchPosition automatically retries until location is acquired
 * - Works seamlessly even in challenging GPS conditions
 */

import { useState, useEffect } from 'react';

export const useGeolocation = (options = {}) => {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('prompt');

  // Default geolocation options
  // Longer timeout for initial fix (GPS can take 20-30s indoors)
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 30000, // 30 seconds - allows time for GPS fix
    maximumAge: 60000, // Accept 1-minute-old position to reduce timeout errors
    ...options,
  };

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by your browser',
      });
      setLoading(false);
      return;
    }

    // Check permission status (if supported)
    const checkPermission = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          setPermissionStatus(result.state);
          
          // Listen for permission changes
          result.addEventListener('change', () => {
            setPermissionStatus(result.state);
          });
        } catch (err) {
          console.warn('Permission query not supported:', err);
        }
      }
    };

    checkPermission();

    // Success callback
    const handleSuccess = (position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      });
      setError(null);
      setLoading(false);
      setPermissionStatus('granted');
      
      console.log('[Geolocation] Location acquired:', {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: `${position.coords.accuracy}m`,
      });
    };

    // Error callback
    const handleError = (err) => {
      let errorMessage = 'Unable to retrieve your location';
      let shouldStopLoading = true;
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location access denied. Please enable location permissions.';
          setPermissionStatus('denied');
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable. Please check your GPS.';
          break;
        case err.TIMEOUT:
          // Timeout errors are often transient - watchPosition will retry
          errorMessage = 'Getting precise location... (This may take up to 30 seconds)';
          shouldStopLoading = false; // Keep loading, watchPosition will retry
          console.warn('[Geolocation] Timeout on attempt, retrying...');
          // Don't set error state for timeout - let it keep trying
          return;
        default:
          errorMessage = 'An unknown error occurred while getting location.';
      }

      // Only set error for non-timeout errors
      setError({
        code: err.code,
        message: errorMessage,
      });
      
      if (shouldStopLoading) {
        setLoading(false);
      }
      
      console.error('[Geolocation] Error:', err.code, errorMessage);
    };

    // Get current position
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      defaultOptions
    );

    // Cleanup
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Function to manually request location
  const requestLocation = () => {
    setLoading(true);
    setError(null);

    // Use same improved options for manual requests
    const manualOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 60000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });
        setLoading(false);
        setPermissionStatus('granted');
        setError(null);
        
        console.log('[Geolocation] Manual location acquired:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: `${position.coords.accuracy}m`,
        });
      },
      (err) => {
        let errorMessage = 'Unable to get location';
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            setPermissionStatus('denied');
            setLoading(false);
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your GPS.';
            setLoading(false);
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out. Still trying in background...';
            // Don't stop loading on timeout, keep trying
            console.warn('[Geolocation] Manual request timeout, keeping background watch active');
            return; // Don't set error or stop loading
          default:
            errorMessage = 'Failed to get location. Please try again.';
            setLoading(false);
        }
        
        setError({
          code: err.code,
          message: errorMessage,
        });
        
        console.error('[Geolocation] Manual request error:', err.code, errorMessage);
      },
      manualOptions
    );
  };

  return {
    location,
    error,
    loading,
    permissionStatus,
    requestLocation,
  };
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

// Convert degrees to radians
const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (lat, lng) => {
  const latDirection = lat >= 0 ? 'N' : 'S';
  const lngDirection = lng >= 0 ? 'E' : 'W';
  
  return {
    latitude: `${Math.abs(lat).toFixed(6)}° ${latDirection}`,
    longitude: `${Math.abs(lng).toFixed(6)}° ${lngDirection}`,
    decimal: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
  };
};

export default useGeolocation;
