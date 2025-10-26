import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const hasTempToken = () => typeof window !== 'undefined' && !!localStorage.getItem('seeker_temp_token');
const hasFullToken = () => typeof window !== 'undefined' && !!localStorage.getItem('seeker_token') && !!localStorage.getItem('seeker_refresh_token');

const SeekerTempGuard = ({ children }) => {
  const location = useLocation();
  
  // If user already has full tokens, redirect to dashboard (password already changed)
  if (hasFullToken()) {
    console.log('SeekerTempGuard: Full tokens detected, redirecting to dashboard');
    return <Navigate to="/seeker/dashboard" replace />;
  }
  
  // If no temp token, redirect to login
  if (!hasTempToken()) {
    console.log('SeekerTempGuard: No temp token, redirecting to login');
    return <Navigate to="/seeker/login" replace state={{ from: location }} />;
  }
  
  // User has temp token and needs to change password
  return children;
};

export default SeekerTempGuard;
