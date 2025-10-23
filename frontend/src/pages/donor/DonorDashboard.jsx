import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDonorProfile, getDonorDashboard, getDonorMatches, setAvailability, respondToMatch } from "../../services/api";
import "./donor-dashboard.css";

export default function DonorDashboard() {
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [matches, setMatches] = useState([]);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  function getInitials(name) {
    const n = (name || "").trim();
    return n ? n.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) : "DN";
  }

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [profileData, dashboardData, matchesData] = await Promise.all([
        getDonorProfile(),
        getDonorDashboard(),
        getDonorMatches()
      ]);
      
      setProfile(profileData.data);
      setMetrics(dashboardData.data);
      setMatches(Array.isArray(matchesData.data) ? matchesData.data : []);
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load dashboard data.";
      setToast(msg);
      setTimeout(() => setToast(""), 4000);
      
      if (err?.response?.status === 403) {
        localStorage.setItem("toast_message", msg);
        nav("/donor/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function toggleAvailability(nextStatus) {
    try {
      await setAvailability(nextStatus);
      await loadDashboardData();
      setToast(`Availability ${nextStatus === 'available' ? 'enabled' : 'disabled'}`);
      setTimeout(() => setToast(""), 3000);
    } catch (_) {
      setToast("Failed to update availability");
      setTimeout(() => setToast(""), 3000);
    }
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    nav('/donor/login', { replace: true });
  }

  async function handleMatchResponse(matchId, action) {
    try {
      await respondToMatch(matchId, action);
      await loadDashboardData();
      setToast(`Mission ${action === 'accept' ? 'accepted' : 'declined'}`);
      setTimeout(() => setToast(""), 3000);
    } catch (_) {
      setToast("Action failed");
      setTimeout(() => setToast(""), 3000);
    }
  }

  // Calculate derived data
  const isAvailable = profile?.availability_status === "available";
  const livesImpacted = (metrics?.total_donations || 0) * 3;
  const trustScore = typeof metrics?.reliability_score === 'number' ? metrics.reliability_score : 4.5;
  
  const calculateNextEligibleDate = () => {
    try {
      const today = new Date();
      if (typeof metrics?.eligible_in_days === "number") {
        const nextDate = new Date();
        nextDate.setDate(today.getDate() + Math.max(0, metrics.eligible_in_days));
        return {
          date: nextDate.toLocaleDateString(),
          daysRemaining: metrics.eligible_in_days
        };
      }
      if (metrics?.last_donation_date) {
        const lastDonation = new Date(metrics.last_donation_date);
        const nextDate = new Date(lastDonation);
        nextDate.setDate(nextDate.getDate() + 56);
        const daysRemaining = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        return {
          date: nextDate.toLocaleDateString(),
          daysRemaining: Math.max(0, daysRemaining)
        };
      }
    } catch (_) {}
    return { date: "—", daysRemaining: 0 };
  };

  const eligibleData = calculateNextEligibleDate();
  const eligibilityProgress = eligibleData.daysRemaining > 0 ? 
    Math.round(((56 - Math.min(56, eligibleData.daysRemaining)) / 56) * 100) : 100;

  if (loading) {
    return (
      <div className="donor-dashboard loading">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="pulse-ring"></div>
            <div className="blood-drop">💉</div>
          </div>
          <h3>Loading your donor dashboard...</h3>
          <p>Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  if (!profile || !metrics) {
    return (
      <div className="donor-dashboard error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Unable to load dashboard</h3>
          <p>There was an error loading your donor information.</p>
          <button className="retry-btn" onClick={loadDashboardData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard", active: true, badge: null },
    { id: "history", icon: "🩸", label: "Donation History", active: false, badge: null },
    { id: "missions", icon: "🎯", label: "Active Missions", active: false, badge: metrics?.active_matches_count || 0 },
    { id: "achievements", icon: "🏆", label: "Achievements", active: false, badge: null },
    { id: "resources", icon: "📚", label: "Resources", active: false, badge: null }
  ];

  const criticalRequests = matches.filter(match => match.urgency === 'critical').slice(0, 3);

  return (
    <div className="donor-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div className="brand">
              <div className="brand-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
                </svg>
              </div>
              <div className="brand-text">
                <h1>SmartBlood Connect</h1>
                <span>Donor Portal</span>
              </div>
            </div>
          </div>

          <nav className="header-nav">
            <button className={`nav-btn ${location.pathname === '/donor/dashboard' ? 'active' : ''}`}>
              Dashboard
            </button>
            <button className="nav-btn">History</button>
            <button className="nav-btn">Achievements</button>
            <button className="nav-btn">Resources</button>
          </nav>

          <div className="header-actions">
            <button className="icon-btn notification-btn">
              <span className="icon">🔔</span>
              {metrics?.active_matches_count > 0 && (
                <span className="notification-badge">{metrics.active_matches_count}</span>
              )}
            </button>
            
            <div className="user-menu">
              <button 
                className="user-avatar-btn"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <div className="avatar">
                  {getInitials(metrics.name || profile.name)}
                </div>
                <span className="user-name">{metrics.name || profile.name}</span>
                <span className={`dropdown-arrow ${menuOpen ? 'open' : ''}`}>▼</span>
              </button>

              {menuOpen && (
                <div className="user-dropdown">
                  <button className="dropdown-item" onClick={() => nav('/donor/profile')}>
                    <span className="item-icon">👤</span>
                    My Profile
                  </button>
                  <button className="dropdown-item" onClick={() => nav('/donor/settings')}>
                    <span className="item-icon">⚙️</span>
                    Settings
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <span className="item-icon">🚪</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${item.active ? 'active' : ''}`}
              onClick={() => item.id === 'history' && nav('/donor/history')}
            >
              <span className="item-icon">{item.icon}</span>
              <span className="item-label">{item.label}</span>
              {item.badge > 0 && (
                <span className="item-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="support-card">
            <div className="support-icon">🆘</div>
            <div className="support-text">
              <strong>Emergency Support</strong>
              <span>24/7 Available</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Welcome Section */}
          <section className="welcome-section">
            <div className="welcome-content">
              <h2>Welcome back, {profile.name?.split(' ')[0] || 'Donor'}!</h2>
              <p>Ready to save lives? Your availability status and recent activity are shown below.</p>
            </div>
            <div className="welcome-actions">
              <button 
                className={`status-toggle ${isAvailable ? 'available' : 'unavailable'}`}
                onClick={() => toggleAvailability(isAvailable ? 'unavailable' : 'available')}
              >
                <div className="status-indicator"></div>
                <span>{isAvailable ? 'Available for Donations' : 'Currently Unavailable'}</span>
              </button>
            </div>
          </section>

          {/* Status Cards */}
          <section className="status-cards">
            <div className="status-card primary">
              <div className="card-header">
                <div className="card-icon">💉</div>
                <h3>Total Donations</h3>
              </div>
              <div className="card-content">
                <div className="metric-value">{metrics.total_donations || 0}</div>
                <div className="metric-subtitle">Lifetime donations</div>
                <div className="metric-trend positive">+12% this month</div>
              </div>
            </div>

            <div className="status-card secondary">
              <div className="card-header">
                <div className="card-icon">❤️</div>
                <h3>Lives Impacted</h3>
              </div>
              <div className="card-content">
                <div className="metric-value">{livesImpacted}</div>
                <div className="metric-subtitle">Estimated lives saved</div>
              </div>
            </div>

            <div className="status-card accent">
              <div className="card-header">
                <div className="card-icon">⭐</div>
                <h3>Trust Rating</h3>
              </div>
              <div className="card-content">
                <div className="trust-score">
                  <div className="stars">
                    {'★'.repeat(Math.floor(trustScore))}
                    <span className="decimal">.{Math.round((trustScore % 1) * 10)}</span>
                  </div>
                  <div className="trust-label">Reliability Score</div>
                </div>
              </div>
            </div>

            <div className="status-card info">
              <div className="card-header">
                <div className="card-icon">📅</div>
                <h3>Next Eligible</h3>
              </div>
              <div className="card-content">
                <div className="metric-value">{eligibleData.date}</div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${eligibilityProgress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{eligibleData.daysRemaining} days remaining</span>
                </div>
              </div>
            </div>
          </section>

          {/* Critical Requests Section */}
          <section className="critical-requests">
            <div className="section-header">
              <h2>Critical Blood Requests</h2>
              <div className="section-badge">
                <span className="active-count">{metrics.active_matches_count || 0} Active</span>
              </div>
            </div>

            {criticalRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <h3>No Critical Matches</h3>
                <p>You'll be notified when urgent blood requests match your profile and location.</p>
                <div className="empty-actions">
                  <button className="btn-secondary" onClick={loadDashboardData}>
                    Refresh
                  </button>
                </div>
              </div>
            ) : (
              <div className="requests-grid">
                {criticalRequests.map((match, index) => (
                  <div key={match.match_id} className="request-card urgent">
                    <div className="request-header">
                      <div className="urgency-badge">URGENT</div>
                      <div className="match-score">Match: {match.score}%</div>
                    </div>
                    
                    <div className="request-content">
                      <h4 className="hospital-name">{match.hospital || "Metro Medical Center"}</h4>
                      <div className="request-details">
                        <div className="detail-row">
                          <span className="detail-label">Blood Type:</span>
                          <span className="detail-value">{match.blood_type || "O+"}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Distance:</span>
                          <span className="detail-value">{match.distance_km || "2.3"} km</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Time Left:</span>
                          <span className="detail-value urgent-time">{match.time_window || "4h 23m"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button 
                        className="btn-primary"
                        onClick={() => handleMatchResponse(match.match_id, 'accept')}
                      >
                        <span className="btn-icon">🎯</span>
                        Accept Mission
                      </button>
                      <button 
                        className="btn-secondary"
                        onClick={() => handleMatchResponse(match.match_id, 'reject')}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className="quick-actions">
            <h2>Quick Actions</h2>
            <div className="actions-grid">
              <button className="action-card" onClick={() => nav('/donor/history')}>
                <div className="action-icon">📊</div>
                <h3>View History</h3>
                <p>Check your donation history</p>
              </button>
              <button className="action-card" onClick={() => nav('/donor/profile')}>
                <div className="action-icon">👤</div>
                <h3>Update Profile</h3>
                <p>Manage your information</p>
              </button>
              <button className="action-card" onClick={() => nav('/donor/settings')}>
                <div className="action-icon">⚙️</div>
                <h3>Settings</h3>
                <p>Configure preferences</p>
              </button>
              <button className="action-card" onClick={loadDashboardData}>
                <div className="action-icon">🔄</div>
                <h3>Refresh Data</h3>
                <p>Update dashboard information</p>
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          <div className="toast-content">
            <span className="toast-message">{toast}</span>
            <button className="toast-close" onClick={() => setToast("")}>×</button>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
    </div>
  );
}