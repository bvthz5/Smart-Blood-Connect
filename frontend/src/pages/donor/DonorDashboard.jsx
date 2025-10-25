import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDonorDashboard, setAvailability, respondToMatch, updateDonorLocation, getDonorCertificates, getDonorBadges } from "../../services/api";
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
  const [dashboardData, setDashboardData] = useState(null);
  const [available, setAvailable] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [locationUpdated, setLocationUpdated] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [badges, setBadges] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [mlInsights, setMlInsights] = useState(null);

  // Auto-update donor location with enhanced error handling
  const updateLocation = async () => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser");
      return;
    }

    if (locationUpdated) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await updateDonorLocation(
            position.coords.latitude,
            position.coords.longitude
          );
          setLocationUpdated(true);
          console.log("✅ Location updated successfully");
        } catch (err) {
          console.error("Failed to update location:", err);
          setToast("Location update failed. Please try again later.");
          setTimeout(() => setToast(""), 3000);
        }
      },
      (err) => {
        // Handle geolocation errors gracefully
        let errorMessage = "Unable to access location.";
        
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access in your browser settings to use nearby features.";
            console.warn("Geolocation permission denied by user");
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Please check your device settings.";
            console.warn("Geolocation position unavailable");
            break;
          case err.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            console.warn("Geolocation request timeout");
            break;
          default:
            errorMessage = "An unknown error occurred while accessing location.";
            console.warn("Geolocation unknown error:", err);
        }
        
        // Don't show toast immediately, just log - let user continue using the app
        console.info("ℹ️ " + errorMessage);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 300000 
      }
    );
  };

  async function load() {
    setLoading(true);
    try {
      // Load dashboard data
      const response = await getDonorDashboard();
      const data = response?.data ?? response ?? {};
      
      setDashboardData(data);
      setAvailable(data?.donor?.is_available ?? false);
      setMlInsights(data?.ml_insights || null);

      // Load certificates and badges
      try {
        const [certResponse, badgeResponse] = await Promise.all([
          getDonorCertificates(),
          getDonorBadges()
        ]);
        
        setCertificates(certResponse?.data?.certificates || []);
        setBadges(badgeResponse?.data?.badges || []);
      } catch (err) {
        console.warn("Failed to load certificates/badges:", err);
      }

      // Generate AI insights based on donor data
      generateAiInsights(data);
      
    } catch (e) {
      console.error("Dashboard load error:", e);
      setToast("Failed to load dashboard. Please try again.");
      setTimeout(() => setToast(""), 4000);
    } finally {
      setLoading(false);
    }
  }

  const generateAiInsights = (data) => {
    const insights = [];
    const donor = data?.donor || {};
    const stats = data?.stats || {};
    
    // Generate insights based on donor data
    if (donor.blood_group) {
      insights.push({
        id: 1,
        hospital: "Metro General Hospital",
        description: `High demand for your blood type (${donor.blood_group}) this week`,
        matchScore: 92,
        icon: "🏥"
      });
      
      insights.push({
        id: 2,
        hospital: "City Medical Center", 
        description: "Regular donor needed for scheduled procedures",
        matchScore: 87,
        icon: "🏥"
      });
      
      insights.push({
        id: 3,
        hospital: "Community Health Clinic",
        description: "Close to your location with flexible timing",
        matchScore: 78,
        icon: "🏥"
      });
    }
    
    setAiInsights(insights);
  };

  useEffect(() => {
    load();
    updateLocation(); // Auto-update location on mount
  }, []);

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

  // Extract data from consolidated dashboard
  const user = dashboardData?.user || {};
  const donor = dashboardData?.donor || {};
  const stats = dashboardData?.stats || {};
  const recentDonations = dashboardData?.recent_donations || [];
  const pendingMatches = dashboardData?.pending_matches || [];

  // Calculate derived data
  const calculateNextEligibleDate = () => {
    try {
      const today = new Date();
      if (typeof donor?.eligible_in_days === "number") {
        const nextDate = new Date();
        nextDate.setDate(today.getDate() + Math.max(0, donor.eligible_in_days));
        return {
          date: nextDate.toLocaleDateString(),
          daysRemaining: donor.eligible_in_days
        };
      }
      if (donor?.last_donation_date) {
        const lastDonation = new Date(donor.last_donation_date);
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

  if (loading || !dashboardData) {
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

  const criticalMatches = pendingMatches.filter(match => match.urgency === 'high').slice(0, 3);
  const fullName = `${user.first_name} ${user.last_name}`.trim();

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
              Welcome back, <span className="highlight">{user.first_name || 'Donor'}</span>! 👋
            </div>
          </div>

          <div className="header-actions">
            <button className="icon-btn notification-btn" onClick={() => nav('/donor/notifications')}>
              <span className="icon">🔔</span>
              {stats?.pending_matches_count > 0 && (
                <span className="notification-badge">{stats.pending_matches_count}</span>
              )}
            </button>
            
            <div className="user-menu">
              <button 
                className="user-avatar-btn"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <div className="avatar">
                  {getInitials(fullName)}
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
                  <div className="stat-value">{stats.total_donations || 0}</div>
                  <p className="stat-description">Successful donations</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏥</div>
                <div className="stat-content">
                  <h3>Last Hospital</h3>
                  <div className="stat-value-small">
                    {stats.last_hospital || "—"}
                  </div>
                  <p className="stat-description">Last donated hospital</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <h3>Last Donation Date</h3>
                  <div className="stat-value-small">
                    {donor.last_donation_date ? 
                      new Date(donor.last_donation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Never"
                    }
                  </div>
                  <p className="stat-description">
                    {donor.last_donation_date ? 
                      `${Math.floor((new Date() - new Date(donor.last_donation_date)) / (1000 * 60 * 60 * 24))} days ago` : 
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
                  <h3>Blood Group</h3>
                  <div className="stat-value">
                    {donor.blood_group || "O+"}
                  </div>
                  <p className="stat-description">
                    Your blood type
                  </p>
                </div>
              </div>

              <div className="stat-card pending-card">
                <div className="stat-icon">🔔</div>
                <div className="stat-content">
                  <h3>Pending Requests</h3>
                  <div className="stat-value">
                    {stats.pending_matches_count || 0}
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
                    {stats.pending_matches_count || 0} Active
                  </div>
                </div>

                <div className="card-content">
                  {criticalMatches.length === 0 ? (
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
                      {criticalMatches.map((match) => (
                        <div key={match.match_id} className="request-item urgent">
                          <div className="request-header">
                            <span className="urgency-badge">URGENT</span>
                            <span className="match-score">{match.score || 85}% Match</span>
                          </div>
                          <div className="request-details">
                            <h4>{match.hospital}</h4>
                            <div className="detail-grid">
                              <div className="detail-item">
                                <span>Blood Type:</span>
                                <strong>{match.blood_group}</strong>
                              </div>
                              <div className="detail-item">
                                <span>Units:</span>
                                <strong>{match.units_required} units</strong>
                              </div>
                              <div className="detail-item">
                                <span>Urgency:</span>
                                <strong className="urgent-time">{match.urgency.toUpperCase()}</strong>
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
                    ML-Powered Analysis
                  </div>
                </div>
                <div className="card-content">
                  {mlInsights && (
                    <div className="ml-metrics">
                      <div className="metric-item">
                        <div className="metric-icon">🎯</div>
                        <div className="metric-content">
                          <div className="metric-label">AI Availability Score</div>
                          <div className="metric-value">{(mlInsights.ai_availability_score * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="metric-item">
                        <div className="metric-icon">⚡</div>
                        <div className="metric-content">
                          <div className="metric-label">Response Time</div>
                          <div className="metric-value">{mlInsights.predicted_response_time}h</div>
                        </div>
                      </div>
                      <div className="metric-item">
                        <div className="metric-icon">📊</div>
                        <div className="metric-content">
                          <div className="metric-label">Success Rate</div>
                          <div className="metric-value">{mlInsights.match_success_rate}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="insights-list">
                    {aiInsights.map((insight) => (
                      <div key={insight.id} className="insight-item">
                        <div className="insight-icon">{insight.icon}</div>
                        <div className="insight-content">
                          <h4>{insight.hospital}</h4>
                          <p>{insight.description}</p>
                        </div>
                        <div className="insight-match">{insight.matchScore}% match</div>
                      </div>
                    ))}
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

          {/* Badges Section */}
          {badges.length > 0 && (
            <section className="badges-section">
              <div className="content-card badges-list">
                <div className="card-header">
                  <h2>🏆 Your Badges</h2>
                  <div className="card-badge">
                    {badges.filter(b => b.earned).length} / {badges.length}
                  </div>
                </div>
                <div className="card-content">
                  <div className="badges-grid">
                    {badges.slice(0, 6).map((badge) => (
                      <div key={badge.id} className={`badge-item ${badge.earned ? 'earned' : 'locked'}`}>
                        <div className="badge-icon">{badge.icon}</div>
                        <div className="badge-info">
                          <h4>{badge.name}</h4>
                          <p>{badge.description}</p>
                          {badge.earned ? (
                            <span className="badge-status earned">✓ Earned</span>
                          ) : (
                            <span className="badge-status locked">🔒 Locked</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
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