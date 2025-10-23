import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDonorProfile, getDonorDashboard, getDonorMatches, setAvailability, respondToMatch } from "../../services/api";
import "./donor-dashboard.css";

// Helper function to get initials from name
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
    }
  }

  useEffect(() => { load(); }, []);

  async function toggle(next) {
    try {
      await setAvailability(next);
      setAvailable(next === "available");
      setToast("Status updated");
    } catch (e) {
      setToast("Failed to update status");
    } finally {
      setTimeout(() => setToast(""), 3000);
    }
  }

  async function respond(id, action) {
    try {
      await respondToMatch(id, action);
      setMatches((prev) => prev.map((x) => (x.match_id === id ? { ...x, response: action } : x)));
      setToast("Response recorded");
    } catch (e) {
      setToast("Failed to submit response");
    } finally {
      setTimeout(() => setToast(""), 3000);
    }
  }

  async function handleMatchResponse(matchId, action) {
    try {
      await respondToMatch(matchId, action);
      await load(); // Reload data after response
      setToast(`Request ${action === 'accept' ? 'accepted' : 'declined'}`);
      setTimeout(() => setToast(""), 3000);
    } catch (_) {
      setToast("Action failed");
      setTimeout(() => setToast(""), 3000);
    }
  }

  function handleLogout() {
    // Add logout logic here
    nav('/login');
  }

  // Calculate derived data
  const isAvailable = profile?.availability_status === "available";
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

  const criticalRequests = matches.filter(match => match.urgency === 'critical').slice(0, 3);
  const pendingRequests = matches.filter(match => match.status === 'pending').slice(0, 5);

  return (
    <div className="donor-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
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

          <div className="header-actions">
            <div className="welcome-text">
              Welcome, {profile.name?.split(' ')[0] || 'Donor'} 👋
            </div>
            
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
                  <button className="dropdown-item">
                    <span className="item-icon">💬</span>
                    Help / Support
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
          {/* Welcome Section */}
          <section className="welcome-section">
            <div className="welcome-content">
              <h2>Welcome back, {profile.name?.split(' ')[0] || 'Donor'}! 👋</h2>
              <p>Ready to save lives? Your availability status and recent activity are shown below.</p>
            </div>
            <div className="beacon">
              <label className="switch">
                <input type="checkbox" checked={available} onChange={() => toggle(available ? 'unavailable' : 'available')} aria-pressed={available} />
                <span className="slider" />
              </label>
              <span className="beacon-label">Available for Emergencies</span>
            </div>
          </section>

          {/* Stats Cards */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="card-icon">💉</div>
              <div className="card-content">
                <h3>Total Donations</h3>
                <div className="metric-value">{metrics.total_donations || 0}</div>
                <p>Lifetime successful donations</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="card-icon">🏥</div>
              <div className="card-content">
                <h3>Last Donation Hospital</h3>
                <div className="metric-value">{metrics.last_donation_hospital || "Not Available"}</div>
                <p>{metrics.last_donation_address || "No recent donations"}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="card-icon">📅</div>
              <div className="card-content">
                <h3>Last Donation Date</h3>
                <div className="metric-value">
                  {metrics.last_donation_date ? 
                    new Date(metrics.last_donation_date).toLocaleDateString() : "Never"
                  }
                </div>
                <p>Most recent donation</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="card-icon">✅</div>
              <div className="card-content">
                <h3>Next Eligible Donation</h3>
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

            <div className="stat-card">
              <div className="card-icon">📍</div>
              <div className="card-content">
                <h3>Current Location</h3>
                <div className="metric-value">{profile.district || "Not Set"}</div>
                <p>{profile.city || "Update your location in settings"}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="card-icon">⏳</div>
              <div className="card-content">
                <h3>Pending Requests</h3>
                <div className="metric-value">{pendingRequests.length}</div>
                <p>Requests awaiting your response</p>
              </div>
            </div>
          </section>

          {/* Two Column Layout */}
          <div className="content-columns">
            {/* Left Column */}
            <div className="column-left">
              {/* Critical Requests */}
              <section className="content-section critical-requests">
                <div className="section-header">
                  <h2>🩸 Critical Blood Requests</h2>
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
                  <div className="requests-list">
                    {criticalRequests.map((match, index) => (
                      <div key={match.match_id} className="request-card urgent">
                        <div className="request-header">
                          <div className="urgency-badge">URGENT</div>
                          <div className="match-score">Match: {match.score || 85}%</div>
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
                            <span className="btn-icon">✅</span>
                            Accept Request
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

              {/* AI Match Insights */}
              <section className="content-section ai-insights">
                <div className="section-header">
                  <h2>🧠 AI Match Insights</h2>
                </div>
                <div className="insights-content">
                  <div className="insight-item">
                    <div className="insight-icon">🏥</div>
                    <div className="insight-text">
                      <h4>Metro General Hospital</h4>
                      <p>High demand for your blood type (O+) this week</p>
                    </div>
                    <div className="insight-match">92% match</div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-icon">🏥</div>
                    <div className="insight-text">
                      <h4>City Medical Center</h4>
                      <p>Regular donor needed for scheduled procedures</p>
                    </div>
                    <div className="insight-match">87% match</div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-icon">🏥</div>
                    <div className="insight-text">
                      <h4>Community Health Clinic</h4>
                      <p>Close to your location with flexible timing</p>
                    </div>
                    <div className="insight-match">78% match</div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="column-right">
              {/* Health Tips */}
              <section className="content-section health-tips">
                <div className="section-header">
                  <h2>💡 Health & Wellness Tips</h2>
                </div>
                <div className="tips-content">
                  <div className="tip-item">
                    <div className="tip-icon">💧</div>
                    <div className="tip-text">
                      <h4>Stay Hydrated</h4>
                      <p>Drink plenty of water before and after donation</p>
                    </div>
                  </div>
                  <div className="tip-item">
                    <div className="tip-icon">🍽️</div>
                    <div className="tip-text">
                      <h4>Eat Iron-Rich Foods</h4>
                      <p>Include spinach, lentils, and red meat in your diet</p>
                    </div>
                  </div>
                  <div className="tip-item">
                    <div className="tip-icon">😴</div>
                    <div className="tip-text">
                      <h4>Get Adequate Rest</h4>
                      <p>Ensure 7-8 hours of sleep before donating blood</p>
                    </div>
                  </div>
                  <div className="tip-item">
                    <div className="tip-icon">🚫</div>
                    <div className="tip-text">
                      <h4>Avoid Alcohol</h4>
                      <p>Refrain from alcohol 24 hours before donation</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Quick Navigation */}
              <section className="content-section quick-nav">
                <div className="section-header">
                  <h2>🧭 Quick Navigation</h2>
                </div>
                <div className="nav-grid">
                  <button className="nav-card" onClick={() => nav('/donor/donations')}>
                    <div className="nav-icon">💉</div>
                    <span>My Donations</span>
                  </button>
                  <button className="nav-card" onClick={() => nav('/donor/eligibility')}>
                    <div className="nav-icon">📅</div>
                    <span>Next Eligibility</span>
                  </button>
                  <button className="nav-card" onClick={() => nav('/donor/requests')}>
                    <div className="nav-icon">🏥</div>
                    <span>Manage Requests</span>
                  </button>
                  <button className="nav-card" onClick={() => nav('/donor/nearby')}>
                    <div className="nav-icon">🧭</div>
                    <span>Nearby Requests</span>
                  </button>
                  <button className="nav-card" onClick={() => nav('/donor/notifications')}>
                    <div className="nav-icon">🔔</div>
                    <span>Notifications</span>
                  </button>
                  <button className="nav-card" onClick={() => nav('/donor/settings')}>
                    <div className="nav-icon">⚙️</div>
                    <span>Settings</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
          <div style={{ background: '#1f2937', color: 'white', padding: '10px 14px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );

}

export default DonorDashboard;
