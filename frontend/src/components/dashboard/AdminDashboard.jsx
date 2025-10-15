import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../layout/DashboardLayout';
import MetricsCard from './MetricsCard';
import ChartCard from './ChartCard';
import DataTable from './DataTable';
import {
  Users,
  Building2,
  Droplets,
  Heart,
  Activity,
  AlertTriangle,
  TrendingUp,
  Calendar,
  MapPin,
  BarChart3
} from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock data
        const mockData = {
          metrics: {
            totalDonors: 1247,
            activeHospitals: 42,
            totalBloodUnits: 2847,
            pendingRequests: 15,
            completedDonations: 89,
            criticalAlerts: 3
          },
          bloodGroupDistribution: [
            { group: 'O+', count: 450, percentage: 36.1, color: '#ef4444' },
            { group: 'A+', count: 320, percentage: 25.7, color: '#3b82f6' },
            { group: 'B+', count: 280, percentage: 22.5, color: '#10b981' },
            { group: 'AB+', count: 120, percentage: 9.6, color: '#f59e0b' },
            { group: 'O-', count: 45, percentage: 3.6, color: '#8b5cf6' },
            { group: 'A-', count: 25, percentage: 2.0, color: '#06b6d4' },
            { group: 'B-', count: 15, percentage: 1.2, color: '#84cc16' },
            { group: 'AB-', count: 5, percentage: 0.4, color: '#f97316' }
          ],
          monthlyTrends: [
            { month: 'Jan', donations: 120, requests: 95 },
            { month: 'Feb', donations: 135, requests: 110 },
            { month: 'Mar', donations: 150, requests: 125 },
            { month: 'Apr', donations: 140, requests: 130 },
            { month: 'May', donations: 165, requests: 145 },
            { month: 'Jun', donations: 180, requests: 160 }
          ],
          hospitalStats: [
            { name: 'City Hospital', donations: 45, requests: 38 },
            { name: 'Medical Center', donations: 38, requests: 42 },
            { name: 'General Hospital', donations: 32, requests: 28 },
            { name: 'Regional Medical', donations: 28, requests: 35 },
            { name: 'Community Health', donations: 22, requests: 18 }
          ],
          recentActivity: [
            {
              id: 1,
              type: 'donation',
              message: 'John Doe completed O+ donation at City Hospital',
              time: '2 minutes ago',
              status: 'completed',
              priority: 'normal'
            },
            {
              id: 2,
              type: 'request',
              message: 'Urgent A+ blood needed at Medical Center',
              time: '15 minutes ago',
              status: 'pending',
              priority: 'high'
            },
            {
              id: 3,
              type: 'registration',
              message: 'New donor Sarah Wilson registered (B+)',
              time: '1 hour ago',
              status: 'active',
              priority: 'normal'
            },
            {
              id: 4,
              type: 'match',
              message: 'Blood match found for AB- request',
              time: '2 hours ago',
              status: 'matched',
              priority: 'normal'
            },
            {
              id: 5,
              type: 'alert',
              message: 'Low stock alert: O- blood type',
              time: '3 hours ago',
              status: 'alert',
              priority: 'high'
            }
          ]
        };
        
        setDashboardData(mockData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="dashboard-loading">
          <div className="loading-content">
            <div className="loading-logo">
              <Droplets size={48} />
            </div>
            <h2>Loading Dashboard</h2>
            <p>Fetching the latest data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout>
        <div className="dashboard-error">
          <AlertTriangle size={48} />
          <h2>Failed to load dashboard</h2>
          <p>Please try refreshing the page</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="admin-dashboard">
        {/* Welcome Section */}
        <div className="dashboard-welcome">
          <div className="welcome-content">
            <h1 className="welcome-title">Welcome to BloodBank Pro</h1>
            <p className="welcome-subtitle">Monitor and manage your blood donation network</p>
          </div>
          <div className="welcome-stats">
            <div className="welcome-stat">
              <span className="stat-number">{dashboardData.metrics.completedDonations}</span>
              <span className="stat-label">Donations Today</span>
            </div>
            <div className="welcome-stat">
              <span className="stat-number">{dashboardData.metrics.criticalAlerts}</span>
              <span className="stat-label">Critical Alerts</span>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <section className="metrics-section">
          <MetricsCard
            title="Total Donors"
            value={dashboardData.metrics.totalDonors}
            change={12.5}
            changeType="positive"
            icon={Users}
            color="primary"
            delay={100}
          />
          <MetricsCard
            title="Active Hospitals"
            value={dashboardData.metrics.activeHospitals}
            change={8.2}
            changeType="positive"
            icon={Building2}
            color="info"
            delay={200}
          />
          <MetricsCard
            title="Blood Units"
            value={dashboardData.metrics.totalBloodUnits}
            change={15.3}
            changeType="positive"
            icon={Droplets}
            color="success"
            delay={300}
          />
          <MetricsCard
            title="Pending Requests"
            value={dashboardData.metrics.pendingRequests}
            change={-5.2}
            changeType="negative"
            icon={Heart}
            color="warning"
            delay={400}
          />
          <MetricsCard
            title="Completed Donations"
            value={dashboardData.metrics.completedDonations}
            change={22.1}
            changeType="positive"
            icon={Activity}
            color="success"
            delay={500}
          />
          <MetricsCard
            title="Critical Alerts"
            value={dashboardData.metrics.criticalAlerts}
            change={-15.8}
            changeType="negative"
            icon={AlertTriangle}
            color="error"
            delay={600}
          />
        </section>

        {/* Charts Section */}
        <section className="charts-section">
          <ChartCard 
            title="Blood Group Distribution" 
            subtitle="Current inventory by blood type"
            delay={700}
          >
            <div className="blood-group-chart">
              {dashboardData.bloodGroupDistribution.map((item, index) => (
                <div key={item.group} className="blood-group-item">
                  <div className="blood-group-info">
                    <div 
                      className="blood-group-color" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="blood-group-label">{item.group}</span>
                  </div>
                  <div className="blood-group-stats">
                    <span className="blood-group-count">{item.count}</span>
                    <span className="blood-group-percentage">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard 
            title="Monthly Trends" 
            subtitle="Donations vs Requests over time"
            delay={800}
          >
            <div className="trends-chart">
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color donations"></div>
                  <span>Donations</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color requests"></div>
                  <span>Requests</span>
                </div>
              </div>
              <div className="chart-bars">
                {dashboardData.monthlyTrends.map((month, index) => (
                  <div key={month.month} className="chart-bar-group">
                    <div className="bar-container">
                      <div 
                        className="bar donations"
                        style={{ height: `${(month.donations / 200) * 100}%` }}
                      >
                        <span className="bar-value">{month.donations}</span>
                      </div>
                      <div 
                        className="bar requests"
                        style={{ height: `${(month.requests / 200) * 100}%` }}
                      >
                        <span className="bar-value">{month.requests}</span>
                      </div>
                    </div>
                    <span className="bar-label">{month.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </section>

        {/* Hospital Stats */}
        <section className="hospital-section">
          <ChartCard 
            title="Hospital Performance" 
            subtitle="Top performing hospitals this month"
            delay={900}
          >
            <div className="hospital-stats">
              {dashboardData.hospitalStats.map((hospital, index) => (
                <div key={hospital.name} className="hospital-item">
                  <div className="hospital-info">
                    <div className="hospital-rank">#{index + 1}</div>
                    <div className="hospital-details">
                      <h4 className="hospital-name">{hospital.name}</h4>
                      <div className="hospital-metrics">
                        <span className="metric">
                          <Droplets size={14} />
                          {hospital.donations} donations
                        </span>
                        <span className="metric">
                          <Heart size={14} />
                          {hospital.requests} requests
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="hospital-score">
                    {Math.round((hospital.donations / hospital.requests) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </section>

        {/* Recent Activity */}
        <section className="activity-section">
          <DataTable 
            title="Recent Activity"
            subtitle="Latest system activities and updates"
            data={dashboardData.recentActivity}
            delay={1000}
          />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
