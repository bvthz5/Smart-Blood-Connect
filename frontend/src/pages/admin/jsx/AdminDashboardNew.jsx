import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  Building2, 
  Heart, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  Droplets,
  Zap,
  Calendar,
  MapPin,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import '../css/AdminDashboardNew.css';

const AdminDashboardNew = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // Memoized dashboard data
  const mockDashboardData = useMemo(() => ({
    summary: {
      total_donors: 1240,
      active_donors: 512,
      total_hospitals: 42,
      open_requests: 15,
      urgent_requests: 5,
      donations_today: 12,
      total_matches: 89,
      success_rate: 94.5
    },
    charts: {
      blood_groups: [
        { blood_group: 'O+', count: 450, color: '#FC3D21', percentage: 36.3 },
        { blood_group: 'A+', count: 320, color: '#0B3D91', percentage: 25.8 },
        { blood_group: 'B+', count: 280, color: '#1E3A8A', percentage: 22.6 },
        { blood_group: 'AB+', count: 120, color: '#6B7280', percentage: 9.7 },
        { blood_group: 'O-', count: 45, color: '#10B981', percentage: 3.6 },
        { blood_group: 'A-', count: 25, color: '#F59E0B', percentage: 2.0 }
      ],
      requests_per_day: [
        { date: '2025-01-01', count: 8 },
        { date: '2025-01-02', count: 12 },
        { date: '2025-01-03', count: 15 },
        { date: '2025-01-04', count: 10 },
        { date: '2025-01-05', count: 18 },
        { date: '2025-01-06', count: 14 },
        { date: '2025-01-07', count: 16 }
      ]
    },
    recent_activities: [
      {
        id: 1,
        type: 'urgent_request',
        message: 'Emergency O+ blood needed at Medical College Trivandrum',
        time: '2 minutes ago',
        status: 'pending',
        priority: 'high'
      },
      {
        id: 2,
        type: 'donation_completed',
        message: 'Anu Joseph completed donation at Kottayam Hospital',
        time: '15 minutes ago',
        status: 'completed',
        priority: 'normal'
      },
      {
        id: 3,
        type: 'new_donor',
        message: 'New donor registered: Priya Suresh (A+)',
        time: '1 hour ago',
        status: 'active',
        priority: 'normal'
      },
      {
        id: 4,
        type: 'match_found',
        message: 'Match found for B+ request at Alappuzha Hospital',
        time: '2 hours ago',
        status: 'matched',
        priority: 'normal'
      },
      {
        id: 5,
        type: 'urgent_request',
        message: 'Critical AB- blood needed at Aster Medcity',
        time: '3 hours ago',
        status: 'pending',
        priority: 'high'
      }
    ]
  }), []);

  // Simulate API call
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setDashboardData(mockDashboardData);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [mockDashboardData]);

  // Memoized StatCard component
  const StatCard = useCallback(({ icon: Icon, title, value, change, color, delay = 0 }) => (
    <div className="stat-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-card-header">
        <div className="stat-icon" style={{ backgroundColor: color }}>
          <Icon size={24} />
        </div>
        <div className={`stat-change ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}`}>
          {change > 0 ? '+' : ''}{change}%
        </div>
      </div>
      <div className="stat-content">
        <h3 className="stat-value">{value.toLocaleString()}</h3>
        <p className="stat-title">{title}</p>
      </div>
    </div>
  ), []);

  // Memoized ChartCard component
  const ChartCard = useCallback(({ title, children, delay = 0 }) => (
    <div className="chart-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
      </div>
      <div className="chart-content">
        {children}
      </div>
    </div>
  ), []);

  // Memoized ActivityItem component
  const ActivityItem = useCallback(({ activity }) => (
    <div className={`activity-item ${activity.priority}`}>
      <div className="activity-icon">
        {activity.type === 'urgent_request' && <AlertTriangle size={16} />}
        {activity.type === 'donation_completed' && <CheckCircle size={16} />}
        {activity.type === 'new_donor' && <Users size={16} />}
        {activity.type === 'match_found' && <Zap size={16} />}
      </div>
      <div className="activity-content">
        <p className="activity-message">{activity.message}</p>
        <span className="activity-time">{activity.time}</span>
      </div>
      <div className={`activity-status ${activity.status}`}>
        {activity.status}
      </div>
    </div>
  ), []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-logo">
          <Droplets size={48} />
        </div>
        <p>Loading SmartBlood Dashboard...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-error">
        <AlertTriangle size={48} />
        <h2>Failed to load dashboard data</h2>
        <p>Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-new">
      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome to SmartBlood Admin</h1>
          <p className="welcome-subtitle">Monitor and manage your blood donation network</p>
        </div>
        <div className="welcome-stats">
          <div className="welcome-stat">
            <span className="stat-number">{dashboardData.summary.donations_today}</span>
            <span className="stat-label">Donations Today</span>
          </div>
          <div className="welcome-stat">
            <span className="stat-number">{dashboardData.summary.urgent_requests}</span>
            <span className="stat-label">Urgent Requests</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <section className="stats-section">
        <StatCard
          icon={Users}
          title="Total Donors"
          value={dashboardData.summary.total_donors}
          change={12.5}
          color="#FC3D21"
          delay={100}
        />
        <StatCard
          icon={Activity}
          title="Active Donors"
          value={dashboardData.summary.active_donors}
          change={8.2}
          color="#0B3D91"
          delay={200}
        />
        <StatCard
          icon={Building2}
          title="Hospitals"
          value={dashboardData.summary.total_hospitals}
          change={3.1}
          color="#1E3A8A"
          delay={300}
        />
        <StatCard
          icon={Heart}
          title="Open Requests"
          value={dashboardData.summary.open_requests}
          change={-5.2}
          color="#10B981"
          delay={400}
        />
        <StatCard
          icon={AlertTriangle}
          title="Urgent Requests"
          value={dashboardData.summary.urgent_requests}
          change={-15.8}
          color="#F59E0B"
          delay={500}
        />
        <StatCard
          icon={TrendingUp}
          title="Success Rate"
          value={dashboardData.summary.success_rate}
          change={2.3}
          color="#8B5CF6"
          delay={600}
        />
      </section>

      {/* Charts Section */}
      <section className="charts-section">
        <ChartCard title="Blood Group Distribution" delay={700}>
          <div className="blood-group-chart">
            {dashboardData.charts.blood_groups.map((group) => (
              <div
                key={group.blood_group}
                className="blood-group-item"
              >
                <div className="blood-group-info">
                  <div
                    className="blood-group-color"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="blood-group-label">{group.blood_group}</span>
                </div>
                <div className="blood-group-stats">
                  <span className="blood-group-count">{group.count}</span>
                  <span className="blood-group-percentage">{group.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Requests Trend (7 Days)" delay={800}>
          <div className="line-chart">
            <div className="chart-bars">
              {dashboardData.charts.requests_per_day.map((day) => (
                <div
                  key={day.date}
                  className="chart-bar"
                  style={{ height: `${(day.count / 20) * 100}%` }}
                >
                  <div className="bar-value">{day.count}</div>
                </div>
              ))}
            </div>
            <div className="chart-labels">
              {dashboardData.charts.requests_per_day.map(day => (
                <span key={day.date} className="chart-label">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              ))}
            </div>
          </div>
        </ChartCard>
      </section>

      {/* Recent Activities */}
      <section className="activities-section">
        <ChartCard title="Recent Activities" delay={900}>
          <div className="activities-list">
            {dashboardData.recent_activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
              />
            ))}
          </div>
        </ChartCard>
      </section>
    </div>
  );
};

export default AdminDashboardNew;
