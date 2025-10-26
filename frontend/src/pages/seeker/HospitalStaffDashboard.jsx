import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import staffService from '../../services/staffService';
import './HospitalStaffDashboard.css';

const HospitalStaffDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState(null);
  const [kpis, setKpis] = useState({
    activeRequests: 0,
    fulfilledRequests: 0,
    pendingMatches: 0,
    urgentRequests: 0,
    topBloodType: 'O+',
    totalDonors: 0
  });
  const [activity, setActivity] = useState([]);
  const [monthlyData, setMonthlyData] = useState({ labels: [], data: [] });
  const [demandByGroup, setDemandByGroup] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [hospitalData, dashData] = await Promise.all([
        staffService.getHospitalInfo().catch(() => null),
        staffService.getDashboardData().catch(() => ({}))
      ]);

      if (hospitalData) setHospital(hospitalData);

      const data = dashData || {};
      setKpis({
        activeRequests: data.active_requests ?? 0,
        fulfilledRequests: data.fulfilled_requests ?? 0,
        pendingMatches: data.pending_matches ?? 0,
        urgentRequests: data.urgent_requests ?? 0,
        topBloodType: data.top_blood_type ?? 'O+',
        totalDonors: data.total_donors ?? 0
      });

      setMonthlyData({
        labels: data.monthly_labels || [],
        data: data.monthly_data || []
      });

      setDemandByGroup(data.demand_by_group || []);
      setActivity(data.recent_activity || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    localStorage.removeItem('seeker_token');
    localStorage.removeItem('seeker_temp_token');
    navigate('/seeker/login', { replace: true });
  };

  if (loading) {
    return (
      <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
        <div className="hsd-loading">
          <div className="hsd-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </SeekerLayout>
    );
  }

  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="hospital-staff-dashboard">
        {/* Header */}
        <header className="hsd-header">
          <div className="hsd-header-content">
            <div className="hsd-header-left">
              <div className="hsd-hospital-logo">🏥</div>
              <div className="hsd-hospital-info">
                <h1>{hospital?.name || 'Hospital'}</h1>
                <p>{hospital?.city || 'City'}, {hospital?.state || 'State'}</p>
              </div>
              <div className="hsd-search-bar">
                <input
                  type="text"
                  placeholder="Search requests, donors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="hsd-header-right">
              <button className="hsd-notification-bell">
                🔔
                <span className="hsd-notification-badge">3</span>
              </button>
              <div className="hsd-profile-dropdown">
                <button className="hsd-profile-btn">
                  <div className="hsd-profile-avatar">👤</div>
                  <span>Profile</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="hsd-main">
          {/* KPI Cards */}
          <div className="hsd-kpi-grid">
            <div className="hsd-kpi-card">
              <div className="hsd-kpi-icon primary">📋</div>
              <div className="hsd-kpi-content">
                <h3>Active Requests</h3>
                <p className="hsd-kpi-value">{kpis.activeRequests}</p>
                <p className="hsd-kpi-subtitle">Currently open</p>
              </div>
            </div>

            <div className="hsd-kpi-card">
              <div className="hsd-kpi-icon success">✓</div>
              <div className="hsd-kpi-content">
                <h3>Fulfilled Requests</h3>
                <p className="hsd-kpi-value">{kpis.fulfilledRequests}</p>
                <p className="hsd-kpi-subtitle">Completed</p>
              </div>
            </div>

            <div className="hsd-kpi-card">
              <div className="hsd-kpi-icon warning">⏳</div>
              <div className="hsd-kpi-content">
                <h3>Pending Matches</h3>
                <p className="hsd-kpi-value">{kpis.pendingMatches}</p>
                <p className="hsd-kpi-subtitle">Awaiting confirmation</p>
              </div>
            </div>

            <div className="hsd-kpi-card">
              <div className="hsd-kpi-icon info">🚨</div>
              <div className="hsd-kpi-content">
                <h3>Urgent Requests</h3>
                <p className="hsd-kpi-value">{kpis.urgentRequests}</p>
                <p className="hsd-kpi-subtitle">High priority</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="hsd-charts-grid">
            <div className="hsd-chart-card">
              <h3>📊 Monthly Request Trend</h3>
              <div style={{ height: '300px', background: '#f9fafb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Chart visualization coming soon
              </div>
            </div>

            <div className="hsd-chart-card">
              <h3>🩸 Blood Demand by Group</h3>
              <div style={{ height: '300px', background: '#f9fafb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Chart visualization coming soon
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="hsd-activity-section">
            <h3>📝 Recent Activity</h3>
            <div className="hsd-activity-list">
              {activity.length > 0 ? (
                activity.map((item, idx) => (
                  <div key={idx} className="hsd-activity-item">
                    <div className="hsd-activity-icon">
                      {item.type === 'match' ? '🎯' : item.type === 'request' ? '📋' : '✓'}
                    </div>
                    <div className="hsd-activity-content">
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                      <div className="hsd-activity-time">{item.timestamp}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>
                  No recent activity
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </SeekerLayout>
  );
};

export default HospitalStaffDashboard;

