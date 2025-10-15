import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboardData } from "../../store/slices/adminSlice";

const AdminDashboardSimple = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, dashboardData, isLoading } = useSelector((state) => state.admin);

  // Fetch dashboard data on mount
  useEffect(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  if (isLoading && !dashboardData.stats.totalDonors) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="spinner"></div>
      </div>
    );
  }

  const stats = dashboardData.stats;

  return (
    <div className="admin-layout">
      <div className="admin-main">
        {/* Header */}
        <div className="admin-header">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back, {user?.name || 'Admin'}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              SmartBlood Management System
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalDonors || 0}</div>
            <div className="stat-label">Total Donors</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">{stats.activeDonors || 0}</div>
            <div className="stat-label">Active Donors</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">{stats.hospitals || 0}</div>
            <div className="stat-label">Hospitals</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">{stats.openRequests || 0}</div>
            <div className="stat-label">Open Requests</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">{stats.urgentRequests || 0}</div>
            <div className="stat-label">Urgent Requests</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">{stats.donationsToday || 0}</div>
            <div className="stat-label">Donations Today</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Emergencies
              </h3>
            </div>
            <div className="card-body">
              {dashboardData.recentEmergencies ? (
                dashboardData.recentEmergencies.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recentEmergencies.map((emergency, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{emergency.type}</p>
                          <p className="text-sm text-gray-600">{emergency.location}</p>
                        </div>
                        <span className="text-sm text-red-600 font-medium">
                          {emergency.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No recent emergencies
                  </p>
                )
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Loading emergencies data...
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                Top Hospitals
              </h3>
            </div>
            <div className="card-body">
              {dashboardData.topHospitals ? (
                dashboardData.topHospitals.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.topHospitals.map((hospital, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{hospital.name}</p>
                          <p className="text-sm text-gray-600">{hospital.location}</p>
                        </div>
                        <span className="text-sm text-blue-600 font-medium">
                          {hospital.requests} requests
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No hospital data available
                  </p>
                )
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Loading hospital data...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Actions
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="btn btn-primary">
                  Manage Donors
                </button>
                <button className="btn btn-secondary">
                  View Requests
                </button>
                <button className="btn btn-outline">
                  System Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardSimple;