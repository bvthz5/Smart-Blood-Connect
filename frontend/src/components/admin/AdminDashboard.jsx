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
    
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Call admin dashboard endpoint
        const token = localStorage.getItem('admin_access_token');
        
        if (!token) {
          throw new Error('Authentication required. Please log in again.');
        }
        
        console.log('[AdminDashboard] Fetching dashboard data...');
        
        const response = await fetch('/api/admin/dashboard/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('[AdminDashboard] Response status:', response.status);
        
        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = `Server error: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch (parseErr) {
            // If JSON parse fails, try to get text
            try {
              const errorText = await response.text();
              if (errorText) {
                console.error('[AdminDashboard] Error response:', errorText);
              }
            } catch (textErr) {
              console.error('[AdminDashboard] Could not parse error response');
            }
          }
          throw new Error(errorMessage);
        }
        
        const payload = await response.json();
        console.log('[AdminDashboard] Received data:', payload);
        
        // Validate response structure
        if (!payload || payload.success === false) {
          throw new Error(payload?.error || 'Invalid response from server');
        }
        
        const stats = payload?.stats || {};
        const charts = payload?.charts || {};
        
        console.log('[AdminDashboard] Processing stats:', stats);
        console.log('[AdminDashboard] Processing charts:', charts);

        const built = {
          metrics: [
            {
              title: 'Total Donors',
              value: stats.totalDonors ?? 0,
              subtitle: 'Active this month',
              trend: 'up',
              trendValue: '+12%',
              icon: '👥',
              type: 'donors'
            },
            {
              title: 'Partner Hospitals',
              value: stats.hospitals ?? 0,
              subtitle: 'Active partnerships',
              trend: 'up',
              trendValue: '+5%',
              icon: '🏥',
              type: 'hospitals'
            },
            {
              title: 'Blood Units',
              value: stats.inventoryUnits ?? 0,
              subtitle: 'Available stock',
              trend: 'down',
              trendValue: '-3%',
              icon: '🩸',
              type: 'inventory'
            },
            {
              title: 'Pending Requests',
              value: stats.openRequests ?? 0,
              subtitle: `Urgent: ${stats.urgentRequests ?? 0} critical`,
              trend: 'up',
              trendValue: '+8%',
              icon: '📋',
              type: 'requests'
            },
            {
              title: 'Completed Donations',
              value: stats.completedDonations ?? 0,
              subtitle: 'This quarter',
              trend: 'up',
              trendValue: '+15%',
              icon: '💚',
              type: 'donations'
            },
            {
              title: 'Critical Alerts',
              value: stats.criticalAlerts ?? 0,
              subtitle: 'Require immediate action',
              trend: 'up',
              trendValue: '+3',
              icon: '🚨',
              type: 'alerts'
            }
          ],
          charts: {
            // Blood groups - transform backend data to include colors
            bloodGroups: (() => {
              const apiData = charts.bloodGroupDistribution;
              if (apiData && Array.isArray(apiData) && apiData.length > 0) {
                return apiData.map((item, index) => ({
                  group: item.group,
                  count: item.count,
                  color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'][index % 8]
                }));
              }
              return [];
            })(),
            
            // Donation trends - transform requestsOverTime to month format
            donationTrends: (() => {
              const apiData = charts.requestsOverTime;
              if (apiData && Array.isArray(apiData) && apiData.length > 0) {
                return apiData.map(item => ({
                  month: new Date(item.date).toLocaleDateString('en-US', { month: 'short' }),
                  donations: item.count
                }));
              }
              return [];
            })(),
            
            // Hospital donations - transform requestsByDistrict
            hospitalDonations: (() => {
              const apiData = charts.requestsByDistrict;
              if (apiData && Array.isArray(apiData) && apiData.length > 0) {
                return apiData.map(item => ({
                  hospital: item.district,
                  donations: item.count
                }));
              }
              return [];
            })(),
            
            // Request analysis - transform backend data
            requestAnalysis: (() => {
              const apiData = charts.requestStatusAnalysis;
              if (apiData && Array.isArray(apiData) && apiData.length > 0) {
                return apiData;
              }
              return [];
            })()
          },
          activities: payload?.activities ?? [],
          welcome: {
            donations_today: stats.donationsToday ?? 0,
            urgent_requests: stats.urgentRequests ?? 0,
          }
        };
        
        if (mounted) {
          console.log('[AdminDashboard] Setting dashboard data:', built);
          console.log('[AdminDashboard] Charts data:', built.charts);
          setDashboardData(built);
          setError(null);
        }
      } catch (e) {
        console.error('[AdminDashboard] Failed to fetch dashboard data:', e);
        if (mounted) {
          setError(e.message || 'Failed to load dashboard data. Please try again.');
          setDashboardData(null);
        }
      } finally {
        if (mounted) {
          console.log('[AdminDashboard] Loading complete, setting loading to false');
          setLoading(false);
        }
      }
    };
    
    fetchDashboard();
    return () => { mounted = false; };
  }, []);

  // Derived datasets for charts with empty defaults
  const activeCharts = dashboardData?.charts ?? {
    bloodGroups: [],
    donationTrends: [],
    hospitalDonations: [],
    requestAnalysis: []
  };
  
  console.log('[AdminDashboard] Active charts:', activeCharts);
  console.log('[AdminDashboard] Blood groups:', activeCharts.bloodGroups);
  
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
    console.log('[AdminDashboard] Rendering loading state');
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

  if (error || !dashboardData) {
    console.log('[AdminDashboard] Rendering error state:', error);
    return (
      <div className="dashboard-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <div className="error-title">Failed to load dashboard data</div>
          <div className="error-subtitle">{error || 'Unknown error occurred'}</div>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  console.log('[AdminDashboard] Rendering dashboard with data');

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
          {totalBloodGroups > 0 ? (
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
          ) : (
            <div style={{ 
              height: '220px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '0.875rem'
            }}>
              📊 No blood group data available yet
            </div>
          )}
        </ChartCard>

        <ChartCard 
          title="Request Trends (Last 7 Days)" 
          subtitle="Blood request activity over the past week"
        >
          <div style={{ height: 260 }}>
            <Line
              data={{
                labels: donationTrendLabels,
                datasets: [{
                  label: 'Requests',
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
          title="District-wise Requests" 
          subtitle="Blood requests by district"
        >
          <div style={{ height: 260 }}>
            <Bar
              data={{
                labels: hospitalLabels,
                datasets: [{
                  label: 'Requests',
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
