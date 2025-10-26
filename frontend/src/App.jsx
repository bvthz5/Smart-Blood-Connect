import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ScrollToTop from './components/ScrollToTop';
import BlockedUserToast from './components/BlockedUserToast';
import { initializeAuth } from './store/slices/adminSlice';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Policies from './pages/Policies';
import NotFound from './pages/NotFound';

// Donor Pages
import DonorLogin from './pages/donor/Login';
import DonorRegister from './pages/donor/Register';
import DonorForgotPassword from './pages/donor/ForgotPassword';
import DonorRouteGuard from './components/donor/DonorRouteGuard';
import DonorDashboard from './pages/donor/DonorDashboard';
import DonorProfile from './pages/donor/DonorProfile';
import DonorSettings from './pages/donor/DonorSettings';
import MyDonations from './pages/donor/MyDonations';
import DonationDetails from './pages/donor/DonationDetails';
import NextEligibility from './pages/donor/NextEligibility';
import ManageRequests from './pages/donor/ManageRequests';
import NearbyRequests from './pages/donor/NearbyRequests';
import DonorNotifications from './pages/donor/DonorNotifications';
import Leaderboard from './pages/donor/Leaderboard';

// Seeker Pages
import SeekerRequest from './pages/seeker/SeekerRequest';
import SeekerLogin from './pages/seeker/SeekerLogin';
import SeekerDashboard from './pages/seeker/SeekerDashboard';
import HospitalStaffDashboard from './pages/seeker/HospitalStaffDashboard';
import ForceChangePassword from './pages/seeker/ForceChangePassword';
import SeekerChangePassword from './pages/seeker/ChangePassword';
import CreateRequest from './pages/seeker/CreateRequest';
import ViewRequests from './pages/seeker/ViewRequests';
import MatchedDonors from './pages/seeker/MatchedDonors';
import SeekerAnalytics from './pages/seeker/Analytics';
import SeekerSettings from './pages/seeker/Settings';
import SeekerHospitalProfile from './pages/seeker/HospitalProfile';
import Notifications from './pages/seeker/Notifications';
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
import DonorEdit from './pages/admin/DonorEdit';
import HospitalManagement from './pages/admin/HospitalManagement';
import HospitalDetails from './pages/admin/HospitalDetails';
import AddHospital from './pages/admin/AddHospital';
import EditHospital from './pages/admin/EditHospital';
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
        <BlockedUserToast />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/policies" element={<Policies />} />

          {/* Donor Routes */}
          <Route path="/donor/login" element={<DonorLogin />} />
          <Route path="/donor/register" element={<DonorRegister />} />
          <Route path="/donor/forgot-password" element={<DonorForgotPassword />} />


          <Route path="/donor/dashboard" element={
            <DonorRouteGuard>
              <DonorDashboard />
            </DonorRouteGuard>
          } />

          <Route path="/donor/profile" element={
            <DonorRouteGuard>
              <DonorProfile />
            </DonorRouteGuard>
          } />

          <Route path="/donor/settings" element={
            <DonorRouteGuard>
              <DonorSettings />
            </DonorRouteGuard>
          } />

          <Route path="/donor/donations" element={
            <DonorRouteGuard>
              <MyDonations />
            </DonorRouteGuard>
          } />

          <Route path="/donor/donations/:id" element={
            <DonorRouteGuard>
              <DonationDetails />
            </DonorRouteGuard>
          } />

          <Route path="/donor/eligibility" element={
            <DonorRouteGuard>
              <NextEligibility />
            </DonorRouteGuard>
          } />

          <Route path="/donor/requests" element={
            <DonorRouteGuard>
              <ManageRequests />
            </DonorRouteGuard>
          } />

          <Route path="/donor/nearby" element={
            <DonorRouteGuard>
              <NearbyRequests />
            </DonorRouteGuard>
          } />

          <Route path="/donor/notifications" element={
            <DonorRouteGuard>
              <DonorNotifications />
            </DonorRouteGuard>
          } />

          <Route path="/donor/leaderboard" element={
            <DonorRouteGuard>
              <Leaderboard />
            </DonorRouteGuard>
          } />

          {/* Seeker Routes */}
          <Route path="/seeker/login" element={<SeekerLogin />} />
          <Route path="/seeker/forgot-password" element={<SeekerForgotPassword />} />
          <Route path="/seeker/reset-password" element={<SeekerResetPassword />} />
          <Route path="/seeker/activate-account" element={
            <SeekerTempGuard>
              <ForceChangePassword />
            </SeekerTempGuard>
          } />
          <Route path="/seeker/change-password" element={
            <SeekerRouteGuard>
              <SeekerChangePassword />
            </SeekerRouteGuard>
          } />
          <Route path="/seeker/dashboard" element={
            <SeekerRouteGuard>
              <SeekerDashboard />
            </SeekerRouteGuard>
          } />
          <Route path="/hospital/dashboard" element={
            <SeekerRouteGuard>
              <HospitalStaffDashboard />
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
          <Route path="/seeker/notifications" element={
            <SeekerRouteGuard>
              <Notifications />
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
          <Route path="/admin/donors/edit/:donorId" element={
            <AdminRouteGuard>
              <DonorEdit />
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
          <Route path="/admin/hospitals/add" element={
            <AdminRouteGuard>
              <AddHospital />
            </AdminRouteGuard>
          } />
          <Route path="/admin/hospitals/edit/:id" element={
            <AdminRouteGuard>
              <EditHospital />
            </AdminRouteGuard>
          } />
          <Route path="/admin/hospitals/:id" element={
            <AdminRouteGuard>
              <HospitalDetails />
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