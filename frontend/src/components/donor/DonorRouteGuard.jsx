import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * DonorRouteGuard - Protects donor routes
 * Checks if user has valid donor authentication tokens
 */
export default function DonorRouteGuard({ children }) {
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');

  // Check if user has valid tokens
  if (!accessToken || !refreshToken) {
    // Redirect to donor login if not authenticated
    return <Navigate to="/donor/login" replace />;
  }

  // User is authenticated, render the protected component
  return children;
}

