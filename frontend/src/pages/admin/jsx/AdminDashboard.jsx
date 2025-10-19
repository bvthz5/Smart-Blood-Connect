import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  Building2, 
  Heart, 
  AlertTriangle, 
  Activity,
  Search,
  Bell,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Zap,
  TrendingUp,
  Calendar,
  MapPin
} from 'lucide-react';
import '../css/AdminDashboardNew.css';

const AdminDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesPagination, setActivitiesPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    pages: 0
  });

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
        { blood_group: 'O+', count: 450, color: '#FF6B6B' },
        { blood_group: 'A+', count: 320, color: '#4ECDC4' },
        { blood_group: 'B+', count: 280, color: '#45B7D1' },
        { blood_group: 'AB+', count: 120, color: '#96CEB4' },
        { blood_group: 'O-', count: 45, color: '#FFEAA7' },
        { blood_group: 'A-', count: 25, color: '#DDA0DD' }
      ],
      requests_per_day: [
        { date: '2025-10-01', count: 8 },
        { date: '2025-10-02', count: 12 },
        { date: '2025-10-03', count: 15 },
        { date: '2025-10-04', count: 10 },
        { date: '2025-10-05', count: 18 },
        { date: '2025-10-06', count: 14 },
        { date: '2025-10-07', count: 16 }
      ]
    },
    recent_activities: [
      {
        id: 1,
        type: 'urgent_request',
        message: 'Emergency O+ blood needed at Medical College Trivandrum',
        time: '2 minutes ago',
        status: 'pending'
      },
      {
        id: 2,
        type: 'donation_completed',
        message: 'Anu Joseph completed donation at Kottayam Hospital',
        time: '15 minutes ago',
        status: 'completed'
      },
      {
        id: 3,
        type: 'new_donor',
        message: 'New donor registered: Priya Suresh (A+)',
        time: '1 hour ago',
        status: 'active'
      },
      {
        id: 4,
        type: 'match_found',
        message: 'Match found for B+ request at Alappuzha Hospital',
        time: '2 hours ago',
        status: 'matched'
      },
      {
        id: 5,
        type: 'urgent_request',
        message: 'Critical AB- blood needed at Aster Medcity',
        time: '3 hours ago',
        status: 'pending'
      }
    ]
  }), []);

  // Fetch activities from backend
  const fetchActivities = async () => {
    setActivitiesLoading(true);
    try {
      const response = await fetch(
        `/api/admin/activity-table?page=${activitiesPagination.page}&per_page=${activitiesPagination.per_page}&status=all`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_access_token')}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        setActivitiesPagination(prev => ({
          ...prev,
          total: data.total || 0,
          pages: data.pages || 0
        }));
      } else {
        console.error('Failed to fetch activities');
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Simulate API call for dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setDashboardData(mockDashboardData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [mockDashboardData]);

  // Fetch activities when pagination changes
  useEffect(() => {
    fetchActivities();
  }, [activitiesPagination.page]);

  // Optimized sidebar toggle
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Memoized sidebar items
  const sidebarItems = useMemo(() => [
    { icon: Activity, label: 'Dashboard', active: true, badge: null },
    { icon: Users, label: 'Donors', active: false, badge: null },
    { icon: Building2, label: 'Hospitals', active: false, badge: null },
    { icon: Heart, label: 'Requests', active: false, badge: dashboardData?.summary.open_requests },
    { icon: Settings, label: 'Settings', active: false, badge: null }
  ], [dashboardData?.summary.open_requests]);

  // Memoized StatCard component
  const StatCard = useCallback(({ icon: Icon, title, value, change, color, delay = 0 }) => (
    <div className="stat-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-card-header">
        <div className="stat-icon" style={{ backgroundColor: color }}>
          <Icon size={24} />
        </div>
        <div className="stat-change" style={{ color: change > 0 ? '#4CAF50' : '#F44336' }}>
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
    <div className={`activity-item ${activity.type === 'urgent_request' ? 'high' : 'normal'}`}>
      <div className="activity-icon">
        {activity.type === 'urgent_request' && <AlertTriangle size={16} />}
        {activity.type === 'donation_completed' && <Heart size={16} />}
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
            <span className="stat-number">{dashboardData?.summary.donations_today || 0}</span>
            <span className="stat-label">Donations Today</span>
          </div>
          <div className="welcome-stat">
            <span className="stat-number">{dashboardData?.summary.urgent_requests || 0}</span>
            <span className="stat-label">Urgent Requests</span>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <main>
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
                      <span className="blood-group-percentage">{((group.count / dashboardData.summary.total_donors) * 100).toFixed(1)}%</span>
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
            <div className="chart-header">
              <h3 className="chart-title">Recent Activities</h3>
            </div>
            <div className="activities-list">
              {activitiesLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  Loading activities...
                </div>
              ) : activities.length > 0 ? (
                activities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                  />
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  No activities found
                </div>
              )}
            </div>
            
            {/* Pagination Controls */}
            {activitiesPagination.pages > 1 && (
              <div className="activities-pagination" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1rem',
                marginTop: '1.5rem',
                padding: '1rem'
              }}>
                <button
                  onClick={() => setActivitiesPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={activitiesPagination.page === 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: activitiesPagination.page === 1 ? '#e5e7eb' : '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: activitiesPagination.page === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: activitiesPagination.page === 1 ? '#9ca3af' : '#374151'
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Page {activitiesPagination.page} of {activitiesPagination.pages}
                </div>
                
                <button
                  onClick={() => setActivitiesPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={activitiesPagination.page === activitiesPagination.pages}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: activitiesPagination.page === activitiesPagination.pages ? '#e5e7eb' : '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: activitiesPagination.page === activitiesPagination.pages ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: activitiesPagination.page === activitiesPagination.pages ? '#9ca3af' : '#374151'
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
