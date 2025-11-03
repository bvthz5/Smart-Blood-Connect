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
  const [loading, setLoading] = useState(false); // Changed from true to false
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [watchId, setWatchId] = useState(null);

  // Default geolocation options
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 60000,
    ...options,
  };

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
    
    // Only log once when accuracy improves significantly or first time
    if (!location.latitude || Math.abs(location.accuracy - position.coords.accuracy) > 1000) {
      console.log('[Geolocation] Location acquired:', {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: `${position.coords.accuracy}m`,
      });
    }
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
        errorMessage = 'Getting precise location... (This may take up to 30 seconds)';
        shouldStopLoading = false;
        console.warn('[Geolocation] Timeout on attempt, retrying...');
        return;
      default:
        errorMessage = 'An unknown error occurred while getting location.';
    }

    setError({
      code: err.code,
      message: errorMessage,
    });
    
    if (shouldStopLoading) {
      setLoading(false);
    }
    
    console.error('[Geolocation] Error:', err.code, errorMessage);
  };

  // Internal function to start watching location
  const requestLocationInternal = () => {
    if (!navigator.geolocation) return;
    
    setLoading(true);
    
    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      defaultOptions
    );
    
    setWatchId(id);
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

    let mounted = true;
    let currentWatchId = null;

    // Check permission status WITHOUT starting watchPosition
    const checkPermission = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          if (!mounted) return;
          
          setPermissionStatus(result.state);
          
          // Listen for permission changes
          const handleChange = () => {
            if (mounted) {
              setPermissionStatus(result.state);
            }
          };
          result.addEventListener('change', handleChange);
          
          // DON'T auto-start watchPosition - wait for user interaction
          // This fixes the "Only request geolocation in response to a user gesture" violation
          
          return () => {
            result.removeEventListener('change', handleChange);
          };
        } catch (err) {
          // Permission API not supported, that's okay
        }
      }
    };

    checkPermission();

    // Cleanup
    return () => {
      mounted = false;
      if (currentWatchId) {
        navigator.geolocation.clearWatch(currentWatchId);
      }
    };
  }, []); // Empty dependency array - run only once

  // Function to manually request location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported',
      });
      return;
    }

    setLoading(true);
    setError(null);

    // Clear existing watch if any
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }

    // Start new watch
    const newWatchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      defaultOptions
    );
    
    setWatchId(newWatchId);
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
