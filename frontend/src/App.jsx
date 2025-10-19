import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ScrollToTop from './components/ScrollToTop';
import { initializeAuth } from './store/slices/adminSlice';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Policies from './pages/Policies';
import NotFound from './pages/NotFound';

// Donor Pages - Removed (not ready to start)

// Seeker Pages
import SeekerRequest from './pages/seeker/SeekerRequest';
import SeekerLogin from './pages/seeker/SeekerLogin';
import SeekerDashboard from './pages/seeker/SeekerDashboard';
import ForceChangePassword from './pages/seeker/ForceChangePassword';
import CreateRequest from './pages/seeker/CreateRequest';
import ViewRequests from './pages/seeker/ViewRequests';
import MatchedDonors from './pages/seeker/MatchedDonors';
import SeekerAnalytics from './pages/seeker/Analytics';
import SeekerSettings from './pages/seeker/Settings';
import SeekerHospitalProfile from './pages/seeker/HospitalProfile';
import SeekerRouteGuard from './components/seeker/SeekerRouteGuard';
import SeekerTempGuard from './components/seeker/SeekerTempGuard';
import SeekerForgotPassword from './pages/seeker/SeekerForgotPassword';
import SeekerResetPassword from './pages/seeker/SeekerResetPassword';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboardNew from './pages/admin/AdminDashboardNew';
import AdminForgotPassword from './pages/admin/AdminForgotPassword';
import AdminResetPassword from './pages/admin/AdminResetPassword';
import DonorManagement from './pages/admin/DonorManagement';
import DonorDetails from './pages/admin/DonorDetails';
import HospitalManagement from './pages/admin/HospitalManagement';
import BloodMatching from './pages/admin/BloodMatching';
import DonationRequests from './pages/admin/DonationRequests';
import DonationHistory from './pages/admin/DonationHistory';
import AdminProfile from './pages/admin/AdminProfile';
import AdminSettings from './pages/admin/AdminSettings';

// Route Guards
import ProtectedRoute from './components/ProtectedRoute';
import AdminRouteGuard from './components/AdminRouteGuard';

import './App.css';

function App() {
  // Initialize admin auth state on app load
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
      <div className="App">
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/policies" element={<Policies />} />
          
          {/* Donor Routes - Removed (not ready to start) */}
          
          {/* Seeker Routes */}
          <Route path="/seeker/login" element={<SeekerLogin />} />
          <Route path="/seeker/forgot-password" element={<SeekerForgotPassword />} />
          <Route path="/seeker/reset-password" element={<SeekerResetPassword />} />
          <Route path="/seeker/activate-account" element={
            <SeekerTempGuard>
              <ForceChangePassword />
            </SeekerTempGuard>
          } />
          <Route path="/seeker/dashboard" element={
            <SeekerRouteGuard>
              <SeekerDashboard />
            </SeekerRouteGuard>
          } />
          <Route path="/seeker/request" element={<SeekerRequest />} />
          <Route path="/seeker/requests/create" element={
            <SeekerRouteGuard>
              <CreateRequest />
            </SeekerRouteGuard>
          } />
          <Route path="/seeker/requests" element={
            <SeekerRouteGuard>
              <ViewRequests />
            </SeekerRouteGuard>
          } />
          <Route path="/seeker/matches" element={
            <SeekerRouteGuard>
              <MatchedDonors />
            </SeekerRouteGuard>
          } />
          <Route path="/seeker/hospital" element={
            <SeekerRouteGuard>
              <SeekerHospitalProfile />
            </SeekerRouteGuard>
          } />
          <Route path="/seeker/analytics" element={
            <SeekerRouteGuard>
              <SeekerAnalytics />
            </SeekerRouteGuard>
          } />
          <Route path="/seeker/settings" element={
            <SeekerRouteGuard>
              <SeekerSettings />
            </SeekerRouteGuard>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />
          <Route path="/admin/dashboard" element={
            <AdminRouteGuard>
              <AdminDashboardNew />
            </AdminRouteGuard>
          } />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/dashboard-new" element={<AdminDashboardNew />} />
          <Route path="/admin/donors" element={
            <AdminRouteGuard>
              <DonorManagement />
            </AdminRouteGuard>
          } />
          <Route path="/admin/donors/:id" element={
            <AdminRouteGuard>
              <DonorDetails />
            </AdminRouteGuard>
          } />
          <Route path="/admin/hospitals" element={
            <AdminRouteGuard>
              <HospitalManagement />
            </AdminRouteGuard>
          } />
          <Route path="/admin/inventory" element={
            <AdminRouteGuard>
              <BloodMatching />
            </AdminRouteGuard>
          } />
          <Route path="/admin/requests" element={
            <AdminRouteGuard>
              <DonationRequests />
            </AdminRouteGuard>
          } />
          <Route path="/admin/donation-history" element={
            <AdminRouteGuard>
              <DonationHistory />
            </AdminRouteGuard>
          } />
          <Route path="/admin/profile" element={
            <AdminRouteGuard>
              <AdminProfile />
            </AdminRouteGuard>
          } />
          <Route path="/admin/settings" element={
            <AdminRouteGuard>
              <AdminSettings />
            </AdminRouteGuard>
          } />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
  );
}

export default App;