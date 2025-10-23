import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const hasFullToken = () => typeof window !== 'undefined' && !!localStorage.getItem('seeker_token') && !!localStorage.getItem('seeker_refresh_token');

const SeekerRouteGuard = ({ children }) => {
  const location = useLocation();
  if (!hasFullToken()) {
    return <Navigate to="/seeker/login" replace state={{ from: location }} />;
  }
  return children;
};

export default SeekerRouteGuard;
