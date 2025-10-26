import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const hasFullToken = () => typeof window !== 'undefined' && !!localStorage.getItem('seeker_token') && !!localStorage.getItem('seeker_refresh_token');
const hasTempToken = () => typeof window !== 'undefined' && !!localStorage.getItem('seeker_temp_token');

const SeekerRouteGuard = ({ children }) => {
  const location = useLocation();
  
  // Check if user has temp token (needs password change)
  if (hasTempToken() && !hasFullToken()) {
    // Force redirect to password change page
    console.log('SeekerRouteGuard: Temp token detected, redirecting to password change');
    return <Navigate to="/seeker/activate-account" replace state={{ from: location }} />;
  }
  
  // Check if user is authenticated
  if (!hasFullToken()) {
    console.log('SeekerRouteGuard: No valid tokens, redirecting to login');
    return <Navigate to="/seeker/login" replace state={{ from: location }} />;
  }
  
  // User is fully authenticated
  return children;
};

export default SeekerRouteGuard;
