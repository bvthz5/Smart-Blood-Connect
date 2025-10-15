/**
 * Secure Router Component
 * Handles encrypted URL routing and route protection
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { URLEncryption, RouteProtection } from '../utils/urlEncryption';

// Import your page components
import Home from '../pages/Home';
import About from '../pages/About';
import Contact from '../pages/Contact';
import FAQ from '../pages/FAQ';
import Policies from '../pages/Policies';
import NotFound from '../pages/NotFound';

// Auth pages
import DonorLogin from '../pages/donor/Login';
import DonorRegister from '../pages/donor/Register';
import DonorDashboard from '../pages/donor/DonorDashboard';
import DonorForgotPassword from '../pages/donor/ForgotPassword';
import DonorChangePassword from '../pages/donor/ChangePassword';
import DonorEditProfile from '../pages/donor/EditProfile';
import SeekerRequest from '../pages/seeker/SeekerRequest';

// Admin pages
import AdminLogin from '../pages/admin/AdminLoginNew';
import AdminDashboard from '../pages/admin/AdminDashboardNew';
import DonorManagement from '../pages/admin/DonorManagement';
import HospitalManagement from '../pages/admin/HospitalManagement';
import BloodMatching from '../pages/admin/BloodMatching';
import DonationRequests from '../pages/admin/DonationRequests';
import DonationHistory from '../pages/admin/DonationHistory';

// Test Components
import URLTest from './URLTest';
import StatusPage from './StatusPage';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import AdminRouteGuard from './AdminRouteGuard';

// Secure Protected Route Component (with URL encryption)
const SecureProtectedRoute = ({ children, requiresAuth = false }) => {
  const location = useLocation();
  const [isValid, setIsValid] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateRoute = async () => {
      try {
        // Get current path and decrypt it
        const currentPath = location.pathname.substring(1);
        const decryptedRoute = URLEncryption.decryptRoute(currentPath);
        
        // Check if route requires authentication
        const needsAuth = URLEncryption.requiresAuth(decryptedRoute) || requiresAuth;
        
        // Validate route protection
        const isValidRoute = RouteProtection.prototype.protectRoute(decryptedRoute, needsAuth);
        
        setIsValid(isValidRoute);
        
        // Check authentication if required
        if (needsAuth) {
          const token = localStorage.getItem('token');
          if (!token) {
            setIsValid(false);
            // Redirect to login
            const loginUrl = URLEncryption.generateSecureURL('donor-login');
            window.location.replace(loginUrl);
          }
        }
        
      } catch (error) {
        console.error('Route validation error:', error);
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };

    validateRoute();
  }, [location.pathname, requiresAuth]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Validating route...
      </div>
    );
  }

  if (!isValid) {
    return <Navigate to="/a1b2c3d4" replace />; // Redirect to encrypted home
  }

  return children;
};

// Main Secure Router Component
const SecureRouter = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Validate current URL on app load
    const currentPath = window.location.pathname.substring(1);
    
    // If it's not an encrypted route, redirect to encrypted home
    if (currentPath && !currentPath.includes('?') && !URLEncryption.decryptRoute(currentPath)) {
      const homeUrl = URLEncryption.generateSecureURL('home');
      window.history.replaceState(null, '', homeUrl);
    }

    // Setup global navigation with encryption
    window.encryptedNavigate = (route, options = {}) => {
      const encryptedUrl = URLEncryption.generateSecureURL(route);
      navigate(encryptedUrl, options);
    };

    // Override browser back/forward to handle encrypted URLs
    const handlePopState = (event) => {
      const currentPath = window.location.pathname.substring(1);
      const decryptedRoute = URLEncryption.decryptRoute(currentPath);
      
      if (!decryptedRoute || decryptedRoute === 'error') {
        // Invalid route, redirect to home
        const homeUrl = URLEncryption.generateSecureURL('home');
        window.history.replaceState(null, '', homeUrl);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

    return (
      <Routes>
        {/* Public Routes - Encrypted */}
        <Route path="/a1b2c3d4" element={<Home />} /> {/* home */}
        <Route path="/e5f6g7h8" element={<About />} /> {/* about */}
        <Route path="/i9j0k1l2" element={<Contact />} /> {/* contact */}
        <Route path="/m3n4o5p6" element={<FAQ />} /> {/* faq */}
        <Route path="/q7r8s9t0" element={<Policies />} /> {/* policies */}
        
        {/* Test Routes - Remove in production */}
        <Route path="/test1234" element={<URLTest />} /> {/* url-test */}
        <Route path="/status5678" element={<StatusPage />} /> {/* status */}
        
        {/* Auth Routes - Encrypted */}
        <Route path="/u1v2w3x4" element={<DonorLogin />} /> {/* donor-login */}
        <Route path="/y5z6a7b8" element={<DonorRegister />} /> {/* donor-register */}
        <Route path="/b9c0d1e2" element={<DonorForgotPassword />} /> {/* donor-forgot-password */}
        <Route path="/g3h4i5j6" element={<SeekerRequest />} /> {/* seeker-request */}
        
        {/* Admin Routes - Encrypted */}
        <Route path="/k7l8m9n0" element={<AdminLogin />} /> {/* admin-login */}
        
        {/* Protected Donor Routes - Encrypted with Auth */}
        <Route 
          path="/c9d0e1f2" 
          element={
            <SecureProtectedRoute requiresAuth={true}>
              <DonorDashboard />
            </SecureProtectedRoute>
          } 
        /> {/* donor-dashboard */}
        
        <Route 
          path="/f3g4h5i6" 
          element={
            <SecureProtectedRoute requiresAuth={true}>
              <DonorChangePassword />
            </SecureProtectedRoute>
          } 
        /> {/* donor-change-password */}
        
        <Route 
          path="/j7k8l9m0" 
          element={
            <SecureProtectedRoute requiresAuth={true}>
              <DonorEditProfile />
            </SecureProtectedRoute>
          } 
        /> {/* donor-edit-profile */}
        
        {/* Protected Admin Routes - Encrypted with Auth */}
        <Route 
          path="/o1p2q3r4" 
          element={
            <AdminRouteGuard>
              <AdminDashboard />
            </AdminRouteGuard>
          } 
        /> {/* admin-dashboard */}
        
        <Route 
          path="/n5o6p7q8" 
          element={
            <AdminRouteGuard>
              <DonorManagement />
            </AdminRouteGuard>
          } 
        /> {/* admin-donors */}
        
        <Route 
          path="/r9s0t1u2" 
          element={
            <AdminRouteGuard>
              <HospitalManagement />
            </AdminRouteGuard>
          } 
        /> {/* admin-hospitals */}
        
        <Route 
          path="/v3w4x5y6" 
          element={
            <AdminRouteGuard>
              <BloodMatching />
            </AdminRouteGuard>
          } 
        /> {/* admin-inventory */}
        
        <Route 
          path="/z7a8b9c0" 
          element={
            <AdminRouteGuard>
              <DonationRequests />
            </AdminRouteGuard>
          } 
        /> {/* admin-requests */}
        
        <Route 
          path="/d1e2f3g4" 
          element={
            <AdminRouteGuard>
              <DonationHistory />
            </AdminRouteGuard>
          } 
        /> {/* admin-donation-history */}
        
        {/* Catch all - redirect to encrypted home */}
        <Route path="*" element={<Navigate to="/a1b2c3d4" replace />} />
      </Routes>
    );
};

// Main App Router with encryption
const AppRouter = () => {
  return <SecureRouter />;
};

export default AppRouter;
