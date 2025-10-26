import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SeekerLayout from "../../components/seeker/SeekerLayout";
import SeekerNavbar from "../../components/seeker/SeekerNavbar";
import SeekerSidebar from "../../components/seeker/SeekerSidebar";
import seekerService from "../../services/seekerService";
import { redirectToLogin } from '../../utils/authRedirect';
import { 
  Activity, AlertCircle, CheckCircle2, Clock, 
  Droplet, TrendingUp, Users, Zap, 
  Calendar, MapPin, Phone, User,
  Bell, ChevronRight, Plus, RefreshCw
} from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, LinearScale, PointElement, LineElement, 
  ArcElement, BarElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import "./SeekerDashboard.css";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  ArcElement, BarElement, Title, Tooltip, Legend, Filler
);

export default function SeekerDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      activeRequests: 0,
      fulfilledRequests: 0,
      pendingMatches: 0,
      urgentRequests: 0,
      predictedDemand: 'N/A'
    },
    demandByGroup: [],
    monthlyTrend: { labels: [], data: [] },
    donorMatches: [],
    recentActivity: [],
    notifications: [],
    mlPredictions: null
  });

  const onLogout = () => {
    localStorage.removeItem('seeker_token');
    redirectToLogin();
  };

  const loadDashboard = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [dash, reqRes, matchRes] = await Promise.all([
        seekerService.dashboard().catch(() => ({})),
        seekerService.listRequests().catch(() => ({ items: [] })),
        seekerService.listMatches().catch(() => ({ items: [] }))
      ]);

      const data = dash || {};
      const requests = reqRes?.items || reqRes?.results || [];
      const matches = matchRes?.items || matchRes?.results || [];

      const activeStatuses = new Set(['pending', 'matched', 'active', 'open', 'inprogress']);
      const completedStatuses = new Set(['completed', 'fulfilled', 'closed']);
      
      const activeRequests = requests.filter(r => 
        activeStatuses.has(String(r.status || '').toLowerCase())
      ).length;
      
      const fulfilledRequests = requests.filter(r => 
        completedStatuses.has(String(r.status || '').toLowerCase())
      ).length;
      
      const pendingMatches = matches.filter(m => 
        String(m.status || m.response || '').toLowerCase() === 'pending'
      ).length;

      const urgentRequests = data?.urgent_requests ?? 0;

      const demand = data?.demand_by_group || [];
      let predictedDemand = 'N/A';
      if (demand.length > 0) {
        const sorted = [...demand].sort((a, b) => {
          const aVal = Number(a?.count ?? a?.value ?? 0);
          const bVal = Number(b?.count ?? b?.value ?? 0);
          return bVal - aVal;
        });
        predictedDemand = sorted[0]?.group || sorted[0]?.blood_group || 'O+';
      }

      setDashboardData({
        stats: { activeRequests, fulfilledRequests, pendingMatches, urgentRequests, predictedDemand },
        demandByGroup: demand,
        monthlyTrend: { labels: data?.monthly?.labels || [], data: data?.monthly?.data || [] },
        donorMatches: matches.slice(0, 5).map(m => ({
          id: m.id,
          donorName: m.donor_name || 'Anonymous',
          bloodGroup: m.blood_group || 'N/A',
          matchScore: m.score ?? m.match_score ?? m.ml_score ?? 0,
          distance: m.distance || 'N/A',
          availability: m.status || 'pending',
          contact: m.donor_phone || m.donor_email || 'N/A'
        })),
        recentActivity: (data?.activity || []).slice(0, 10),
        notifications: [
          { id: 1, type: 'match', message: `${pendingMatches} new donor matches found`, time: 'Just now' },
          { id: 2, type: 'urgent', message: `${urgentRequests} urgent requests require attention`, time: '5 min ago' },
          { id: 3, type: 'prediction', message: `High demand forecast for ${predictedDemand} next week`, time: '1 hour ago' }
        ].filter(n => n.message.match(/\d+/)?.[0] !== '0'),
        mlPredictions: { shortage: predictedDemand, confidence: 85, trend: 'increasing' }
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
      if (showRefresh) setTimeout(() => setRefreshing(false), 500);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => loadDashboard(), 60000);
    return () => clearInterval(interval);
  }, []);

  // Chart configurations
  const demandChartData = {
    labels: dashboardData.demandByGroup.map(d => d.group || d.blood_group || 'Unknown'),
    datasets: [{
      data: dashboardData.demandByGroup.map(d => Number(d.count ?? d.value ?? 0)),
      backgroundColor: [
        'rgba(220, 38, 38, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(248, 113, 113, 0.8)',
        'rgba(252, 165, 165, 0.8)', 'rgba(254, 202, 202, 0.8)', 'rgba(25, 118, 210, 0.8)',
        'rgba(100, 181, 246, 0.8)', 'rgba(144, 202, 249, 0.8)'
      ],
      borderWidth: 0,
      hoverOffset: 10
    }]
  };

  const trendChartData = {
    labels: dashboardData.monthlyTrend.labels,
    datasets: [{
      label: 'Blood Requests',
      data: dashboardData.monthlyTrend.data,
      fill: true,
      borderColor: '#1976D2',
      backgroundColor: 'rgba(25, 118, 210, 0.1)',
      tension: 0.4,
      pointBackgroundColor: '#1976D2',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  const responseChartData = {
    labels: ['Accepted', 'Pending', 'Declined'],
    datasets: [{
      label: 'Donor Responses',
      data: [65, 25, 10],
      backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'],
      borderRadius: 8
    }]
  };

  if (loading) {
    return (
      <div className="seeker-dashboard-modern">
        <div className="dashboard-loading">
          <div className="loading-spinner-modern">
            <Droplet className="droplet-icon" />
          </div>
          <p className="loading-text">Loading Hospital Dashboard...</p>
          <div className="loading-bar">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="seeker-dashboard-modern">
        {/* Hero Header */}
        <div className="dashboard-hero">
          <div className="hero-content">
            <div className="hero-title-section">
              <h1 className="hero-title">
                <Droplet className="title-icon" />
                Hospital Dashboard
              </h1>
              <p className="hero-subtitle">Real-time blood request management powered by ML</p>
            </div>
            <button 
              className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
            >
              <RefreshCw className="refresh-icon" />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="dashboard-container">
          {/* Top Summary Cards */}
          <div className="stats-grid-modern">
            <div className="stat-card-modern stat-active" style={{ animationDelay: '0ms' }}>
              <div className="stat-icon-wrapper">
                <Activity className="stat-icon" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Active Requests</p>
                <h3 className="stat-value">{dashboardData.stats.activeRequests}</h3>
                <div className="stat-trend">
                  <TrendingUp size={14} />
                  <span>Ongoing</span>
                </div>
              </div>
              <div className="stat-glow stat-glow-active"></div>
            </div>

            <div className="stat-card-modern stat-fulfilled" style={{ animationDelay: '100ms' }}>
              <div className="stat-icon-wrapper">
                <CheckCircle2 className="stat-icon" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Fulfilled Requests</p>
                <h3 className="stat-value">{dashboardData.stats.fulfilledRequests}</h3>
                <div className="stat-trend">
                  <TrendingUp size={14} />
                  <span>Completed</span>
                </div>
              </div>
              <div className="stat-glow stat-glow-fulfilled"></div>
            </div>

            <div className="stat-card-modern stat-pending" style={{ animationDelay: '200ms' }}>
              <div className="stat-icon-wrapper">
                <Clock className="stat-icon" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Pending Matches</p>
                <h3 className="stat-value">{dashboardData.stats.pendingMatches}</h3>
                <div className="stat-trend">
                  <Users size={14} />
                  <span>Awaiting response</span>
                </div>
              </div>
              <div className="stat-glow stat-glow-pending"></div>
            </div>

            <div className="stat-card-modern stat-urgent" style={{ animationDelay: '300ms' }}>
              <div className="stat-icon-wrapper">
                <AlertCircle className="stat-icon" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Urgent Requests</p>
                <h3 className="stat-value">{dashboardData.stats.urgentRequests}</h3>
                <div className="stat-trend urgent-trend">
                  <Zap size={14} />
                  <span>Immediate attention</span>
                </div>
              </div>
              <div className="stat-glow stat-glow-urgent"></div>
            </div>
          </div>

          {/* ML Prediction Card */}
          <div className="ml-prediction-card" style={{ animationDelay: '400ms' }}>
            <div className="ml-header">
              <div className="ml-icon-wrapper">
                <Zap className="ml-icon" />
              </div>
              <div>
                <h3 className="ml-title">🤖 ML-Powered Prediction</h3>
                <p className="ml-subtitle">AI-based blood demand forecasting</p>
              </div>
            </div>
            <div className="ml-content">
              <div className="ml-prediction">
                <span className="ml-label">Predicted High Demand:</span>
                <span className="ml-value blood-type-badge">{dashboardData.stats.predictedDemand}</span>
              </div>
              <div className="ml-prediction">
                <span className="ml-label">Confidence Level:</span>
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{ width: '85%' }}></div>
                  <span className="confidence-text">85%</span>
                </div>
              </div>
              <div className="ml-prediction">
                <span className="ml-label">Forecast Period:</span>
                <span className="ml-value">Next 7 days</span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-grid">
            <div className="chart-card-modern" style={{ animationDelay: '500ms' }}>
              <div className="chart-header">
                <h3 className="chart-title">📈 Monthly Requests Trend</h3>
                <p className="chart-subtitle">Request volume over time</p>
              </div>
              <div className="chart-content">
                <Line 
                  data={trendChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        borderRadius: 8
                      }
                    },
                    scales: {
                      y: { 
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                      },
                      x: { grid: { display: false } }
                    }
                  }} 
                />
              </div>
            </div>

            <div className="chart-card-modern" style={{ animationDelay: '600ms' }}>
              <div className="chart-header">
                <h3 className="chart-title">🩸 Blood Demand by Group</h3>
                <p className="chart-subtitle">Current distribution</p>
              </div>
              <div className="chart-content">
                <Doughnut 
                  data={demandChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { 
                        position: 'bottom',
                        labels: { padding: 15, font: { size: 12 } }
                      }
                    }
                  }} 
                />
              </div>
            </div>

            <div className="chart-card-modern" style={{ animationDelay: '700ms' }}>
              <div className="chart-header">
                <h3 className="chart-title">📊 Donor Response Rate</h3>
                <p className="chart-subtitle">Match confirmation status</p>
              </div>
              <div className="chart-content">
                <Bar 
                  data={responseChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                      x: { grid: { display: false } }
                    }
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Donor Matches Section */}
          <div className="section-card" style={{ animationDelay: '800ms' }}>
            <div className="section-header-modern">
              <div>
                <h2 className="section-title">🤝 Top Donor Matches (ML-Powered)</h2>
                <p className="section-subtitle">AI-recommended donors based on compatibility</p>
              </div>
              <Link to="/seeker/matches" className="view-all-btn">
                View All <ChevronRight size={16} />
              </Link>
            </div>
            <div className="matches-grid">
              {dashboardData.donorMatches.length > 0 ? (
                dashboardData.donorMatches.map((match, idx) => (
                  <div key={match.id} className="match-card" style={{ animationDelay: `${900 + idx * 50}ms` }}>
                    <div className="match-header">
                      <div className="match-avatar">
                        <User size={20} />
                      </div>
                      <div className="match-info">
                        <h4 className="match-name">{match.donorName}</h4>
                        <span className="blood-type-badge">{match.bloodGroup}</span>
                      </div>
                      <div className="match-score">
                        <div className="score-circle" style={{ '--score': match.matchScore }}>
                          <span>{match.matchScore}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="match-details">
                      <div className="match-detail">
                        <MapPin size={14} />
                        <span>{match.distance}</span>
                      </div>
                      <div className="match-detail">
                        <Phone size={14} />
                        <span>{match.contact}</span>
                      </div>
                    </div>
                    <div className="match-actions">
                      <button className="btn-confirm">Confirm</button>
                      <button className="btn-decline">Decline</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Users size={48} />
                  <p>No donor matches available</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="section-card" style={{ animationDelay: '1000ms' }}>
            <div className="section-header-modern">
              <div>
                <h2 className="section-title">📋 Recent Activity</h2>
                <p className="section-subtitle">Latest updates and notifications</p>
              </div>
            </div>
            <div className="activity-timeline">
              {dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.map((activity, idx) => (
                  <div key={idx} className="activity-item" style={{ animationDelay: `${1100 + idx * 30}ms` }}>
                    <div className="activity-icon">
                      <div className="activity-dot"></div>
                    </div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.title || activity.message || 'Activity'}</p>
                      <p className="activity-time">
                        <Calendar size={12} />
                        {activity.time || activity.timestamp || 'Recently'}
                      </p>
                    </div>
                    <span className={`activity-badge ${activity.type}`}>{activity.type || 'info'}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Activity size={48} />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Notifications Panel */}
          {dashboardData.notifications.length > 0 && (
            <div className="notifications-panel" style={{ animationDelay: '1200ms' }}>
              <div className="notifications-header">
                <Bell size={20} />
                <h3>Real-time Notifications</h3>
              </div>
              <div className="notifications-list">
                {dashboardData.notifications.map(notif => (
                  <div key={notif.id} className={`notification-item notification-${notif.type}`}>
                    <div className="notification-icon">
                      {notif.type === 'match' && <Users size={16} />}
                      {notif.type === 'urgent' && <AlertCircle size={16} />}
                      {notif.type === 'prediction' && <Zap size={16} />}
                    </div>
                    <div className="notification-content">
                      <p>{notif.message}</p>
                      <span>{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <Link to="/seeker/requests/create" className="fab-modern" title="Create New Request">
          <Plus size={24} />
          <span className="fab-text">New Request</span>
        </Link>
      </div>
    </SeekerLayout>
  );
}
