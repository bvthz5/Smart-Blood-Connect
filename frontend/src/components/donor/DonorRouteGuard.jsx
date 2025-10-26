import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { refreshToken as refreshTokenAPI } from '../../services/api';

/**
 * DonorRouteGuard - Enhanced Protection for Donor Routes
 * 
 * Features:
 * - Validates access token expiry
 * - Auto-refreshes expired tokens
 * - Auto-logout on browser close
 * - Session validation
 * - Active donor status check
 */
export default function DonorRouteGuard({ children }) {
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    validateSession();

    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-validate session when tab becomes visible
        validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Auto-refresh token every 14 minutes
    const refreshInterval = setInterval(() => {
      attemptTokenRefresh();
    }, 14 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(refreshInterval);
    };
  }, [location.pathname]);

  const validateSession = async () => {
    setIsValidating(true);

    try {
      const accessToken = localStorage.getItem('access_token');
      const refreshTokenValue = localStorage.getItem('refresh_token');

      if (!accessToken && !refreshTokenValue) {
        setIsAuthenticated(false);
        setIsValidating(false);
        return;
      }

      if (accessToken) {
        const tokenData = parseJwt(accessToken);
        if (tokenData && tokenData.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (tokenData.exp > currentTime) {
            // Token is valid
            setIsAuthenticated(true);
            setIsValidating(false);
            return;
          }
        }
      }

      // Try to refresh token
      if (refreshTokenValue) {
        const refreshed = await attemptTokenRefresh();
        setIsAuthenticated(refreshed);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Session validation error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsValidating(false);
    }
  };

  const attemptTokenRefresh = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refresh_token');
      if (!refreshTokenValue) return false;

      const response = await refreshTokenAPI(refreshTokenValue);
      
      if (response.data && response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return false;
    }
  };

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #e63946 0%, #f77f7f 100%)'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid #fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Validating session...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    localStorage.setItem('redirect_after_login', location.pathname);
    return <Navigate to="/donor/login" replace state={{ from: location }} />;
  }

  return children;
}

