import React, { lazy, Suspense } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../components/admin/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import Donors from '../pages/admin/Donors';
import Hospitals from '../pages/admin/Hospitals';
import Staff from '../pages/admin/Staff';
import Requests from '../pages/admin/Requests';
import Matches from '../pages/admin/Matches';
import DonationRequests from '../pages/admin/DonationRequests';
import AssignDonor from '../pages/admin/AssignDonor';
import Settings from '../pages/admin/Settings';
import Profile from '../pages/admin/Profile';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Lazy load components for better performance
const LazyDashboard = lazy(() => import('../pages/admin/Dashboard'));
const LazyDonors = lazy(() => import('../pages/admin/Donors'));
const LazyHospitals = lazy(() => import('../pages/admin/Hospitals'));
const LazyStaff = lazy(() => import('../pages/admin/Staff'));
const LazyRequests = lazy(() => import('../pages/admin/Requests'));
const LazyMatches = lazy(() => import('../pages/admin/Matches'));
const LazyDonationRequests = lazy(() => import('../pages/admin/DonationRequests'));
const LazyAssignDonor = lazy(() => import('../pages/admin/AssignDonor'));
const LazySettings = lazy(() => import('../pages/admin/Settings'));
const LazyProfile = lazy(() => import('../pages/admin/Profile'));

const AdminRoutes = () => {
  const { admin } = useAuth();

  // Redirect to login if not authenticated
  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Define routes
  const routes = useRoutes([
    {
      path: '/',
      element: <AdminLayout />,
      children: [
        { path: '', element: <Navigate to="dashboard" replace /> },
        { path: 'dashboard', element: <LazyDashboard /> },
        { path: 'donors', element: <LazyDonors /> },
        { path: 'hospitals', element: <LazyHospitals /> },
        { path: 'staff', element: <LazyStaff /> },
        { path: 'requests', element: <LazyRequests /> },
        { path: 'matches', element: <LazyMatches /> },
        { path: 'donation-requests', element: <LazyDonationRequests /> },
        { path: 'assign-donor/:requestId', element: <LazyAssignDonor /> },
        { path: 'settings', element: <LazySettings /> },
        { path: 'profile', element: <LazyProfile /> },
        { path: '*', element: <Navigate to="/admin/404" replace /> }
      ]
    }
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {routes}
    </Suspense>
  );
};

export default AdminRoutes;