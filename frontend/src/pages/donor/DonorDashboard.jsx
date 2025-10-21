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
  const nav = useNavigate();

  function getInitials(name) {
    const n = (name || "").trim();
    return n ? n.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) : "DN";
  }

  async function loadDashboardData() {
    try {
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

  if (!profile || !metrics) {
    return (
      <div className="donor-dashboard loading">
        <div className="loading-spinner">
          <div className="pulse-ring"></div>
          <div className="blood-drop">💉</div>
        </div>
        <p>Loading your donor dashboard...</p>
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
              <div className="brand-icon">❤️</div>
              <div className="brand-text">
                <h1>VitalLink</h1>
                <span>Donor Hub</span>
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
          {/* Status Bar */}
          <section className="status-section">
            <div className="status-card">
              <div className="status-indicators">
                <div className="status-item">
                  <div className={`connection-status ${isAvailable ? 'online' : 'offline'}`}>
                    <div className="status-dot"></div>
                    <span>{isAvailable ? 'Online' : 'Offline'}</span>
                  </div>
                </div>

                <div className="status-item">
                  <div className="availability-toggle">
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={isAvailable}
                        onChange={() => toggleAvailability(isAvailable ? 'unavailable' : 'available')}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">Available for Emergencies</span>
                  </div>
                </div>

                <div className="status-item">
                  <div className="trust-score">
                    <div className="trust-stars">
                      {'★'.repeat(Math.floor(trustScore))}
                      <span className="trust-decimal">.{Math.round((trustScore % 1) * 10)}</span>
                    </div>
                    <span className="trust-label">Trust Rating</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Metrics Grid */}
          <section className="metrics-section">
            <div className="metrics-grid">
              <div className="metric-card primary">
                <div className="metric-icon">💉</div>
                <div className="metric-content">
                  <h3 className="metric-title">Total Donations</h3>
                  <div className="metric-value">{metrics.total_donations || 0}</div>
                  <div className="metric-trend positive">+12% this month</div>
                </div>
              </div>

              <div className="metric-card secondary">
                <div className="metric-icon">📅</div>
                <div className="metric-content">
                  <h3 className="metric-title">Last Donation</h3>
                  <div className="metric-value">
                    {metrics.last_donation_date ? 
                      new Date(metrics.last_donation_date).toLocaleDateString() : 'Never'
                    }
                  </div>
                  {metrics.last_donated_to && (
                    <div className="metric-subtitle">{metrics.last_donated_to}</div>
                  )}
                </div>
              </div>

              <div className="metric-card accent">
                <div className="metric-icon">⏳</div>
                <div className="metric-content">
                  <h3 className="metric-title">Next Eligible</h3>
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

              <div className="metric-card success">
                <div className="metric-icon">❤️</div>
                <div className="metric-content">
                  <h3 className="metric-title">Lives Impacted</h3>
                  <div className="metric-value">{livesImpacted}</div>
                  <div className="metric-subtitle">Estimated lives saved</div>
                </div>
              </div>
            </div>
          </section>

          {/* Geo-Match Feed */}
          <section className="matches-section">
            <div className="section-header">
              <h2>Critical Requests Near You</h2>
              <div className="section-badge">
                <span className="active-count">{metrics.active_matches_count || 0} Active</span>
              </div>
            </div>

            {criticalRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <h3>No Critical Matches</h3>
                <p>You'll be notified when urgent blood requests match your profile.</p>
              </div>
            ) : (
              <div className="matches-grid">
                {criticalRequests.map((match, index) => (
                  <div key={match.match_id} className="match-card urgent">
                    <div className="match-header">
                      <div className="urgency-badge">URGENT</div>
                      <div className="match-score">Match: {match.score}%</div>
                    </div>
                    
                    <div className="match-content">
                      <h4 className="hospital-name">{match.hospital || "Metro Medical Center"}</h4>
                      <div className="match-details">
                        <div className="detail-item">
                          <span className="detail-label">Blood Type:</span>
                          <span className="detail-value">{match.blood_type || "O+"}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Distance:</span>
                          <span className="detail-value">{match.distance_km || "2.3"} km</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Time Left:</span>
                          <span className="detail-value urgent-time">{match.time_window || "4h 23m"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="match-actions">
                      <button 
                        className="btn-primary"
                        onClick={() => handleMatchResponse(match.match_id, 'accept')}
                      >
                        🎯 Accept Mission
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