import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { createBatchedStateSetter, createCleanupManager } from "../utils/performanceOptimizer";
import { isNavigating, resetNavigationState } from "../utils/navigationOptimizer";

const AdminRouteGuard = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useSelector((state) => state.admin);
  
  // Use refs to prevent unnecessary re-renders
  const isCheckingRef = useRef(true);
  const hasNavigatedRef = useRef(false);
  const lastPathRef = useRef(location.pathname);
  const authCheckTimeoutRef = useRef(null);
  
  // Stable state for rendering with batched updates
  const [renderState, setRenderState] = useState({
    showLoading: true,
    showContent: false,
    isInitialized: false
  });
  
  // Create batched state setter to prevent reflows
  const batchedSetRenderState = useRef(createBatchedStateSetter(setRenderState)).current;
  const cleanupManager = useRef(createCleanupManager()).current;

  // Enhanced debounced navigation to prevent rapid redirects
  const debouncedNavigate = useCallback((path, options = {}) => {
    if (hasNavigatedRef.current) return;
    // Clear any existing timeout
    if (authCheckTimeoutRef.current) {
      clearTimeout(authCheckTimeoutRef.current);
    }
    hasNavigatedRef.current = true;
    // Perform a minimal async to batch layout work without requestIdleCallback
    authCheckTimeoutRef.current = setTimeout(() => {
      navigate(path, { replace: true, ...options });
      setTimeout(() => {
        hasNavigatedRef.current = false;
      }, 100);
    }, 0);
  }, [navigate]);

  // Enhanced authentication check with better state management
  const checkAuthentication = useCallback(() => {
    // Clear any existing timeout
    if (authCheckTimeoutRef.current) {
      clearTimeout(authCheckTimeoutRef.current);
    }
    
    // Only proceed if not loading and path has changed or first check
    if (isLoading && !renderState.isInitialized) {
      // If still loading on first check, wait a bit more
      return;
    }

    lastPathRef.current = location.pathname;
    isCheckingRef.current = false;

    const isAuth = isAuthenticated && user;
    const isLoginPage = location.pathname === "/admin/login";
    const isResetPasswordPage = location.pathname === "/admin/reset-password" || location.pathname === "/admin/forgot-password";
    const isAdminPage = location.pathname.startsWith("/admin/");

    // Skip authentication check for navigation within admin pages or during navigation
    if ((isAuth && isAdminPage && !isLoginPage) || isNavigating()) {
      batchedSetRenderState({ showLoading: false, showContent: true, isInitialized: true });
      return;
    }

    // Minimal async to avoid blocking; no requestIdleCallback
    authCheckTimeoutRef.current = setTimeout(() => {
      // Allow reset password and forgot password pages without authentication
      if (isResetPasswordPage) {
        batchedSetRenderState({ showLoading: false, showContent: true, isInitialized: true });
        return;
      }
      
      if (!isAuth) {
        // Not authenticated
        if (!isLoginPage && isAdminPage) {
          batchedSetRenderState({ showLoading: false, showContent: false, isInitialized: true });
          debouncedNavigate("/admin/login");
          return;
        }
        // On login page and not authenticated - show login
        batchedSetRenderState({ showLoading: false, showContent: true, isInitialized: true });
      } else {
        // Authenticated
        if (isLoginPage) {
          batchedSetRenderState({ showLoading: false, showContent: false, isInitialized: true });
          debouncedNavigate("/admin/dashboard");
          return;
        }
        // On protected page and authenticated - show content
        batchedSetRenderState({ showLoading: false, showContent: true, isInitialized: true });
      }
    }, 0);
  }, [isAuthenticated, user, isLoading, location.pathname, debouncedNavigate, renderState.isInitialized]);

  // Effect for authentication checking
  useEffect(() => {
    checkAuthentication();
    
    // Add a timeout to prevent infinite loading - use standard timeout
    let maxLoadingTimeout;
    maxLoadingTimeout = setTimeout(() => {
      if (renderState.showLoading) {
        console.log('AdminRouteGuard: Max loading time reached, showing login');
        setRenderState({ showLoading: false, showContent: true, isInitialized: true });
      }
    }, 800); // faster 0.8s max loading time
    
    // Cleanup timeout on unmount
    return () => {
      cleanupManager.add(() => {
        if (authCheckTimeoutRef.current) {
          clearTimeout(authCheckTimeoutRef.current);
        }
        clearTimeout(maxLoadingTimeout);
        resetNavigationState();
      });
      cleanupManager.cleanup();
    };
  }, [isAuthenticated, user, isLoading, location.pathname]);

  // Enhanced loading state with custom CSS
  if (renderState.showLoading || isCheckingRef.current) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(closest-side, #ffffff 0%, #f7f7f9 40%, #eef1f5 100%)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            border: '4px solid rgba(183, 28, 28, 0.15)',
            borderTopColor: '#B71C1C',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite, glow 1.6s ease-in-out infinite',
            boxShadow: '0 0 0 0 rgba(183, 28, 28, 0.6)',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{
            color: '#1a1a1a',
            fontSize: '1.125rem',
            fontWeight: '500',
            margin: '0 0 0.5rem 0'
          }}>Checking authentication...</p>
          <p style={{
            color: '#6c757d',
            fontSize: '0.875rem',
            margin: '0'
          }}>Please wait while we verify your access</p>
        </div>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes glow {
            0% { box-shadow: 0 0 0 0 rgba(183, 28, 28, 0.0); }
            50% { box-shadow: 0 0 0 8px rgba(183, 28, 28, 0.08); }
            100% { box-shadow: 0 0 0 0 rgba(183, 28, 28, 0.0); }
          }
        `}</style>
      </div>
    );
  }

  // Show content only when stable
  if (renderState.showContent && renderState.isInitialized) {
    return children;
  }

  // Default: show nothing (prevents flashing)
  return null;
};

export default AdminRouteGuard;