import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import tokenStorage from '../../utils/tokenStorage';

const hasFullToken = () => {
  if (typeof window === 'undefined') return false;
  return tokenStorage.isAuthenticated();
};

const hasTempToken = () => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('seeker_temp_token');
};

const SeekerRouteGuard = ({ children }) => {
  const location = useLocation();
  
  // Check if user has temp token (needs password change)
  if (hasTempToken() && !hasFullToken()) {
    // Force redirect to password change page
    return <Navigate to="/seeker/activate-account" replace state={{ from: location }} />;
  }
  
  // Check if user is authenticated
  if (!hasFullToken()) {
    return <Navigate to="/seeker/login" replace state={{ from: location }} />;
  }
  
  // User is fully authenticated
  return children;
};

export default SeekerRouteGuard;
