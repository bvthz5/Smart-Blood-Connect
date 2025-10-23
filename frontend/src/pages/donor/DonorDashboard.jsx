import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDonorProfile, getDonorDashboard, getDonorMatches, setAvailability, respondToMatch } from "../../services/api";
import "./donor-dashboard.css";

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

function DonorDashboard() {
  const nav = useNavigate();
  const [profile, setProfile] = useState({});
  const [metrics, setMetrics] = useState({});
  const [matches, setMatches] = useState([]);
  const [available, setAvailable] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [pRes, dRes, mRes] = await Promise.all([
        getDonorProfile(),
        getDonorDashboard(),
        getDonorMatches(),
      ]);
      const p = pRes?.data ?? pRes ?? {};
      const d = dRes?.data ?? dRes ?? {};
      const m = mRes?.data?.matches ?? mRes?.data ?? mRes ?? [];
      setProfile(p || {});
      setMetrics(d || {});
      setMatches(Array.isArray(m) ? m : []);
      const isAvail = (p?.availability_status === 'available') || (p?.is_available === true);
      setAvailable(!!isAvail);
    } catch (e) {
      setToast("Failed to load dashboard. Please try again.");
      setTimeout(() => setToast(""), 4000);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleAvailability() {
    try {
      const nextStatus = available ? 'unavailable' : 'available';
      await setAvailability(nextStatus);
      setAvailable(!available);
      setToast(`You are now ${!available ? 'available' : 'unavailable'} for emergencies`);
    } catch (e) {
      setToast("Failed to update status");
    } finally {
      setTimeout(() => setToast(""), 3000);
    }
  }

  async function handleMatchResponse(matchId, action) {
    try {
      await respondToMatch(matchId, action);
      await load();
      setToast(`Request ${action === 'accept' ? 'accepted' : 'declined'}`);
      setTimeout(() => setToast(""), 3000);
    } catch (_) {
      setToast("Action failed");
      setTimeout(() => setToast(""), 3000);
    }
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    nav('/donor/login');
  }

  // Calculate derived data
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

  const criticalRequests = matches.filter(match => match.urgency === 'critical').slice(0, 3);

  return (
    <div className="donor-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand">
              <div className="brand-icon">
                <div className="heart-pulse">❤️</div>
              </div>
              <div className="brand-text">
                <h1>SmartBlood Connect</h1>
                <span>Donor Portal</span>
              </div>
            </div>
          </div>

          <div className="header-center">
            <div className="welcome-text">
              Welcome back, <span className="highlight">{profile.name?.split(' ')[0] || 'Donor'}</span>! 👋
            </div>
          </div>

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
                <span className={`dropdown-arrow ${menuOpen ? 'open' : ''}`}>▼</span>
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <button className="dropdown-item" onClick={() => nav('/donor/profile')}>
                    <span className="item-icon">👤</span>
                    View Profile
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

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Welcome & Status Section */}
          <section className="welcome-section">
            <div className="welcome-content">
              <div className="welcome-text-content">
                <h1>Ready to save lives today? 🩸</h1>
                <p>Your availability helps hospitals match critical blood requests in real-time.</p>
              </div>
              <div className="availability-section">
                <div className="availability-status">
                  <div className={`status-indicator ${available ? 'available' : 'offline'}`}>
                    <div className="status-dot"></div>
                    <span>{available ? 'Available for Emergencies' : 'Currently Offline'}</span>
                  </div>
                </div>
                <button 
                  className={`availability-toggle ${available ? 'active' : ''}`}
                  onClick={toggleAvailability}
                >
                  {available ? 'Go Offline' : 'Go Online'}
                </button>
              </div>
            </div>
          </section>

          {/* Stats Grid - Perfect 6 Cards in 3 Column Layout */}
          <section className="stats-section">
            <div className="stats-grid">
              {/* Row 1 - Primary Stats */}
              <div className="stat-card">
                <div className="stat-icon">🩸</div>
                <div className="stat-content">
                  <h3>Total Donations</h3>
                  <div className="stat-value">{metrics.total_donations || profile.donation_count || 0}</div>
                  <p className="stat-description">Successful donations</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏥</div>
                <div className="stat-content">
                  <h3>Last Hospital</h3>
                  <div className="stat-value-small">
                    {metrics.last_donated_to || profile.last_hospital || "—"}
                  </div>
                  <p className="stat-description">Last donated hospital</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <h3>Last Donation Date</h3>
                  <div className="stat-value-small">
                    {metrics.last_donation_date ? 
                      new Date(metrics.last_donation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Never"
                    }
                  </div>
                  <p className="stat-description">
                    {metrics.last_donation_date ? 
                      `${Math.floor((new Date() - new Date(metrics.last_donation_date)) / (1000 * 60 * 60 * 24))} days ago` : 
                      "No donations yet"
                    }
                  </p>
                </div>
              </div>

              {/* Row 2 - Secondary Stats */}
              <div className="stat-card highlight">
                <div className="stat-icon">⏳</div>
                <div className="stat-content">
                  <h3>Next Eligible Date</h3>
                  <div className="stat-value-small">{eligibleData.date}</div>
                  <p className="stat-description">
                    {eligibleData.daysRemaining > 0 ? 
                      `${eligibleData.daysRemaining} days remaining` : 
                      "Eligible now!"
                    }
                  </p>
                  {eligibleData.daysRemaining > 0 && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${eligibilityProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="stat-card ai-card">
                <div className="stat-icon">🤖</div>
                <div className="stat-content">
                  <h3>AI Recommendation</h3>
                  <div className="stat-value-small">
                    {metrics.nearest_hospital || "Metro General"}
                  </div>
                  <p className="stat-description">
                    {metrics.nearest_distance ? `${metrics.nearest_distance} km away` : "Nearest hospital needing blood"}
                  </p>
                </div>
              </div>

              <div className="stat-card pending-card">
                <div className="stat-icon">🔔</div>
                <div className="stat-content">
                  <h3>Pending Requests</h3>
                  <div className="stat-value">
                    {matches.filter(m => m.status === 'pending').length || metrics.active_matches_count || 0}
                  </div>
                  <p className="stat-description">Awaiting your response</p>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content Area - Perfect 2 Column Layout */}
          <div className="main-content-area">
            {/* Left Column - Critical Requests */}
            <div className="content-column left-column">
              <section className="content-card critical-requests">
                <div className="card-header">
                  <h2>🩸 Critical Blood Requests</h2>
                  <div className="card-badge">
                    {metrics.active_matches_count || 0} Active
                  </div>
                </div>

                <div className="card-content">
                  {criticalRequests.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">🎯</div>
                      <div className="empty-text">
                        <h3>No Critical Matches</h3>
                        <p>You'll be notified when urgent blood requests match your profile.</p>
                      </div>
                      <button className="refresh-btn" onClick={load}>
                        Refresh
                      </button>
                    </div>
                  ) : (
                    <div className="requests-list">
                      {criticalRequests.map((match) => (
                        <div key={match.match_id} className="request-item urgent">
                          <div className="request-header">
                            <span className="urgency-badge">URGENT</span>
                            <span className="match-score">{match.score || 85}% Match</span>
                          </div>
                          <div className="request-details">
                            <h4>{match.hospital || "Metro Medical Center"}</h4>
                            <div className="detail-grid">
                              <div className="detail-item">
                                <span>Blood Type:</span>
                                <strong>{match.blood_type || "O+"}</strong>
                              </div>
                              <div className="detail-item">
                                <span>Distance:</span>
                                <strong>{match.distance_km || "2.3"} km</strong>
                              </div>
                              <div className="detail-item">
                                <span>Time Left:</span>
                                <strong className="urgent-time">{match.time_window || "4h 23m"}</strong>
                              </div>
                            </div>
                          </div>
                          <div className="request-actions">
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleMatchResponse(match.match_id, 'accept')}
                            >
                              Accept Request
                            </button>
                            <button 
                              className="btn btn-secondary"
                              onClick={() => handleMatchResponse(match.match_id, 'reject')}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* AI Match Insights - Below Critical Requests */}
              <section className="content-card ai-insights">
                <div className="card-header">
                  <h2>🧠 AI Match Insights</h2>
                  <div className="card-badge">
                    Real-time Analysis
                  </div>
                </div>
                <div className="card-content">
                  <div className="insights-list">
                    <div className="insight-item">
                      <div className="insight-icon">🏥</div>
                      <div className="insight-content">
                        <h4>Metro General Hospital</h4>
                        <p>High demand for your blood type (O+) this week</p>
                      </div>
                      <div className="insight-match">92% match</div>
                    </div>
                    <div className="insight-item">
                      <div className="insight-icon">🏥</div>
                      <div className="insight-content">
                        <h4>City Medical Center</h4>
                        <p>Regular donor needed for scheduled procedures</p>
                      </div>
                      <div className="insight-match">87% match</div>
                    </div>
                    <div className="insight-item">
                      <div className="insight-icon">🏥</div>
                      <div className="insight-content">
                        <h4>Community Health Clinic</h4>
                        <p>Close to your location with flexible timing</p>
                      </div>
                      <div className="insight-match">78% match</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column - Health Tips & Quick Navigation */}
            <div className="content-column right-column">
              {/* Health & Wellness Tips */}
              <section className="content-card health-tips">
                <div className="card-header">
                  <h2>💡 Health & Wellness Tips</h2>
                </div>
                <div className="card-content">
                  <div className="tips-list">
                    <div className="tip-item">
                      <div className="tip-icon">💧</div>
                      <div className="tip-content">
                        <h4>Stay Hydrated</h4>
                        <p>Drink plenty of water before and after donation</p>
                      </div>
                    </div>
                    <div className="tip-item">
                      <div className="tip-icon">🍽️</div>
                      <div className="tip-content">
                        <h4>Eat Iron-Rich Foods</h4>
                        <p>Include spinach, lentils, and red meat in your diet</p>
                      </div>
                    </div>
                    <div className="tip-item">
                      <div className="tip-icon">😴</div>
                      <div className="tip-content">
                        <h4>Get Adequate Rest</h4>
                        <p>Ensure 7-8 hours of sleep before donating blood</p>
                      </div>
                    </div>
                    <div className="tip-item">
                      <div className="tip-icon">🚫</div>
                      <div className="tip-content">
                        <h4>Avoid Alcohol</h4>
                        <p>Refrain from alcohol 24 hours before donation</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Quick Navigation */}
              <section className="content-card quick-nav">
                <div className="card-header">
                  <h2>🧭 Quick Navigation</h2>
                </div>
                <div className="card-content">
                  <div className="nav-grid">
                    <button className="nav-item" onClick={() => nav('/donor/donations')}>
                      <div className="nav-icon">💉</div>
                      <span>My Donations</span>
                    </button>
                    <button className="nav-item" onClick={() => nav('/donor/eligibility')}>
                      <div className="nav-icon">📅</div>
                      <span>Next Eligibility</span>
                    </button>
                    <button className="nav-item" onClick={() => nav('/donor/requests')}>
                      <div className="nav-icon">🏥</div>
                      <span>Manage Requests</span>
                    </button>
                    <button className="nav-item" onClick={() => nav('/donor/nearby')}>
                      <div className="nav-icon">🧭</div>
                      <span>Nearby Requests</span>
                    </button>
                    <button className="nav-item" onClick={() => nav('/donor/notifications')}>
                      <div className="nav-icon">🔔</div>
                      <span>Notifications</span>
                    </button>
                    <button className="nav-item" onClick={() => nav('/donor/settings')}>
                      <div className="nav-icon">⚙️</div>
                      <span>Settings</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
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
    </div>
  );
}

export default DonorDashboard;