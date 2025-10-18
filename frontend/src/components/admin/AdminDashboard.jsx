import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import MetricCard from './MetricCard';
import ChartCard from './ChartCard';
import ActivityTable from './ActivityTable';
import { getDashboardSummary } from '../../services/homepageService';
import './AdminDashboard.css';
// chart.js modern charts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const { theme } = useTheme();

  // Initialize dashboard data from backend with graceful fallback
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const api = await getDashboardSummary();
        // Parse { success, data: { totals, charts, activities } }
        const payload = api?.data || {};
        const totals = payload?.totals || {};
        const charts = payload?.charts || {};

        const built = {
          metrics: [
            {
              title: 'Total Donors',
              value: totals.donors ?? mockData.metrics[0].value,
              subtitle: 'Active this month',
              trend: 'up',
              trendValue: '+12%',
              icon: '👥',
              type: 'donors'
            },
            {
              title: 'Partner Hospitals',
              value: totals.hospitals ?? mockData.metrics[1].value,
              subtitle: 'Active partnerships',
              trend: 'up',
              trendValue: '+5%',
              icon: '🏥',
              type: 'hospitals'
            },
            {
              title: 'Blood Units',
              value: totals.inventory_units ?? mockData.metrics[2].value,
              subtitle: 'Available stock',
              trend: 'down',
              trendValue: '-3%',
              icon: '🩸',
              type: 'inventory'
            },
            {
              title: 'Pending Requests',
              value: totals.pending_requests ?? mockData.metrics[3].value,
              subtitle: 'Urgent pending requests',
              trend: 'up',
              trendValue: '+8%',
              icon: '📋',
              type: 'requests'
            },
            {
              title: 'Completed Donations',
              value: totals.completed_donations ?? mockData.metrics[4].value,
              subtitle: 'This quarter',
              trend: 'up',
              trendValue: '+15%',
              icon: '💚',
              type: 'donations'
            },
            {
              title: 'Critical Alerts',
              value: totals.critical_alerts ?? mockData.metrics[5].value,
              subtitle: 'Require immediate action',
              trend: 'up',
              trendValue: '+3',
              icon: '🚨',
              type: 'alerts'
            }
          ],
          charts: {
            bloodGroups: charts.bloodGroups ?? mockData.charts.bloodGroups,
            donationTrends: charts.donationTrends ?? mockData.charts.donationTrends,
            hospitalDonations: charts.hospitalDonations ?? mockData.charts.hospitalDonations,
            requestAnalysis: charts.requestAnalysis ?? mockData.charts.requestAnalysis,
          },
          activities: payload?.activities ?? [],
          welcome: payload?.welcome ?? {
            donations_today: 0,
            urgent_requests: totals?.pending_requests ?? 0,
          }
        };
        if (mounted) {
          setDashboardData(built);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setDashboardData(mockData);
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Mock dashboard data (fallback)
  const mockData = {
    metrics: [
      {
        title: 'Total Donors',
        value: 1247,
        subtitle: 'Active this month',
        trend: 'up',
        trendValue: '+12%',
        icon: '👥',
        type: 'donors'
      },
      {
        title: 'Partner Hospitals',
        value: 45,
        subtitle: 'Active partnerships',
        trend: 'up',
        trendValue: '+5%',
        icon: '🏥',
        type: 'hospitals'
      },
      {
        title: 'Blood Units',
        value: 256,
        subtitle: 'Available stock',
        trend: 'down',
        trendValue: '-8%',
        icon: '🩸',
        type: 'inventory'
      },
      {
        title: 'Pending Requests',
        value: 18,
        subtitle: 'Urgent: 5 critical',
        trend: 'up',
        trendValue: '+23%',
        icon: '📋',
        type: 'requests'
      },
      {
        title: 'Completed Donations',
        value: 892,
        subtitle: 'This quarter',
        trend: 'up',
        trendValue: '+15%',
        icon: '💚',
        type: 'donations'
      },
      {
        title: 'Critical Alerts',
        value: 7,
        subtitle: 'Require immediate action',
        trend: 'up',
        trendValue: '+3',
        icon: '🚨',
        type: 'alerts'
      }
    ],
    charts: {
      bloodGroups: [
        { group: 'A+', count: 312, color: '#FF6B6B' },
        { group: 'B+', count: 249, color: '#4ECDC4' },
        { group: 'O+', count: 374, color: '#45B7D1' },
        { group: 'AB+', count: 62, color: '#96CEB4' },
        { group: 'A-', count: 89, color: '#FECA57' },
        { group: 'B-', count: 67, color: '#FF9FF3' },
        { group: 'O-', count: 45, color: '#54A0FF' },
        { group: 'AB-', count: 23, color: '#5F27CD' }
      ],
      donationTrends: [
        { month: 'Jan', donations: 120 },
        { month: 'Feb', donations: 135 },
        { month: 'Mar', donations: 142 },
        { month: 'Apr', donations: 158 },
        { month: 'May', donations: 167 },
        { month: 'Jun', donations: 189 }
      ],
      hospitalDonations: [
        { hospital: 'City General', donations: 45 },
        { hospital: 'Metro Medical', donations: 38 },
        { hospital: 'Regional Hospital', donations: 32 },
        { hospital: 'University Hospital', donations: 28 },
        { hospital: 'Community Health', donations: 22 }
      ],
      requestAnalysis: [
        { status: 'Completed', count: 65, color: '#10B981' },
        { status: 'Pending', count: 23, color: '#F59E0B' },
        { status: 'Cancelled', count: 12, color: '#EF4444' }
      ]
    }
  };

  // Derived datasets for charts
  const activeCharts = dashboardData?.charts ?? mockData.charts;
  const recentActivities = dashboardData?.activities ?? [];
  const bloodGroupLabels = activeCharts.bloodGroups.map(b => b.group);
  const bloodGroupValues = activeCharts.bloodGroups.map(b => b.count);
  const bloodGroupColors = activeCharts.bloodGroups.map(b => b.color);

  const donationTrendLabels = activeCharts.donationTrends.map(d => d.month);
  const donationTrendValues = activeCharts.donationTrends.map(d => d.donations);

  const hospitalLabels = activeCharts.hospitalDonations.map(h => h.hospital);
  const hospitalValues = activeCharts.hospitalDonations.map(h => h.donations);

  const requestLabels = activeCharts.requestAnalysis.map(r => r.status);
  const requestValues = activeCharts.requestAnalysis.map(r => r.count);
  const requestColors = activeCharts.requestAnalysis.map(r => r.color);
  const totalBloodGroups = bloodGroupValues.reduce((a, b) => a + b, 0);
  const totalRequests = requestValues.reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-content">
          <div className="loading-logo">💉</div>
          <div className="loading-text">Loading SmartBlood Dashboard...</div>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <div className="error-title">Failed to load dashboard data</div>
          <div className="error-subtitle">Please try refreshing the page</div>
          <button className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome to SmartBlood Admin</h1>
          <p className="welcome-subtitle">Monitor and manage your blood donation network</p>
        </div>
        <div className="welcome-stats">
          <div className="welcome-stat accent-green">
            <span className="stat-number">{dashboardData?.welcome?.donations_today ?? 0}</span>
            <span className="stat-label">Donations Today</span>
          </div>
          <div className="welcome-stat accent-orange">
            <span className="stat-number">{dashboardData?.welcome?.urgent_requests ?? 0}</span>
            <span className="stat-label">Urgent Requests</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {dashboardData.metrics.map((metric, index) => (
          <MetricCard
            key={metric.title}
            {...metric}
            loading={loading}
          />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <ChartCard 
          title="Blood Group Distribution" 
          subtitle="Distribution of blood types in the system"
        >
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Pie
                data={{
                  labels: bloodGroupLabels,
                  datasets: [{
                    data: bloodGroupValues,
                    backgroundColor: bloodGroupColors,
                    borderWidth: 0,
                  }]
                }}
                options={{
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                }}
                height={220}
              />
            </div>
            <div className="chart-legend" style={{ flex: 1 }}>
              {activeCharts.bloodGroups.map((g) => (
                <div key={g.group} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: g.color }} />
                  <span className="legend-label">{g.group}</span>
                  <span className="legend-count">
                    {g.count}
                    {totalBloodGroups > 0 ? ` (${Math.round((g.count / totalBloodGroups) * 100)}%)` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard 
          title="Monthly Donation Trends" 
          subtitle="Donation patterns over the last 6 months"
        >
          <div style={{ height: 260 }}>
            <Line
              data={{
                labels: donationTrendLabels,
                datasets: [{
                  label: 'Donations',
                  data: donationTrendValues,
                  fill: true,
                  tension: 0.35,
                  borderColor: '#B71C1C',
                  backgroundColor: 'rgba(183, 28, 28, 0.15)',
                  pointBackgroundColor: '#B71C1C',
                }]
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } },
                },
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </ChartCard>

        <ChartCard 
          title="Hospital-wise Donations" 
          subtitle="Donation performance by hospital"
        >
          <div style={{ height: 260 }}>
            <Bar
              data={{
                labels: hospitalLabels,
                datasets: [{
                  label: 'Donations',
                  data: hospitalValues,
                  backgroundColor: '#B71C1C',
                  borderRadius: 6,
                  maxBarThickness: 38,
                }]
              }}
              options={{
                plugins: { legend: { display: false } },
                indexAxis: 'y',
                scales: {
                  x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } },
                  y: { grid: { display: false } },
                },
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </ChartCard>

        <ChartCard 
          title="Request Status Analysis" 
          subtitle="Breakdown of request completion rates"
        >
          <div style={{ height: 260 }}>
            <Bar
              data={{
                labels: requestLabels,
                datasets: [{
                  label: 'Requests',
                  data: requestValues,
                  backgroundColor: requestColors,
                  borderRadius: 6,
                }]
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } },
                },
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
          <div className="chart-legend" style={{ marginTop: '0.75rem' }}>
            {activeCharts.requestAnalysis.map((r) => (
              <div key={r.status} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: r.color }} />
                <span className="legend-label">{r.status}</span>
                <span className="legend-count">
                  {r.count}
                  {totalRequests > 0 ? ` (${Math.round((r.count / totalRequests) * 100)}%)` : ''}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Activity Table */}
      <div className="activity-section">
        <ActivityTable 
          data={recentActivities}
          loading={loading}
          onRowClick={(row) => console.log('Row clicked:', row)}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
