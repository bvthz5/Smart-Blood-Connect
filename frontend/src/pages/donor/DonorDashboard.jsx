import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDonorProfile, getDonorDashboard, getDonorMatches, setAvailability, respondToMatch } from "../../services/api";
import "./donor-dashboard.css";

function initial(name) {
  if (!name) return "";
  const c = (name || "").trim().charAt(0);
  return c ? c.toUpperCase() : "";
}

function DonorDashboard() {
  const nav = useNavigate();
  const [profile, setProfile] = useState({});
  const [metrics, setMetrics] = useState({});
  const [matches, setMatches] = useState([]);
  const [available, setAvailable] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  const lastDonation = metrics?.last_donation_date ? new Date(metrics.last_donation_date) : null;
  let nextEligibleDate = "";
  if (lastDonation) {
    const d = new Date(lastDonation);
    d.setDate(d.getDate() + 56);
    nextEligibleDate = d.toLocaleDateString();
  } else if (typeof metrics?.eligible_in_days === "number" && metrics.eligible_in_days > 0) {
    const d = new Date();
    d.setDate(d.getDate() + metrics.eligible_in_days);
    nextEligibleDate = d.toLocaleDateString();
  }

  let eligibilityProgress = null;
  if (typeof metrics?.eligible_in_days === 'number') {
    const remaining = Math.max(0, metrics.eligible_in_days);
    const total = 56;
    eligibilityProgress = Math.round(((total - Math.min(total, remaining)) / total) * 100);
  }

  const livesImpacted = typeof metrics?.total_donations === 'number' ? metrics.total_donations * 3 : '—';

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

  function handleLogout() {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      nav('/donor/login', { replace: true });
    }
  }


  return (
    <div className="donor-dashboard">
      {/* Fixed Header */}
      <header className="dd-header">
        <div className="dd-header-inner">
          <div className="dd-left">
            <button className="brand" onClick={() => nav('/donor/dashboard')} aria-label="VitalLink Donor Hub">🩸 <span>VitalLink Donor Hub</span></button>
          </div>
          <nav className="dd-center" aria-label="Primary">
            <button className="nav-item active" onClick={() => nav('/donor/dashboard')}>Dashboard</button>
            <button className="nav-item" onClick={() => nav('/donor/history')}>History</button>
            <button className="nav-item" aria-disabled="true" disabled>Achievements</button>
            <button className="nav-item" aria-disabled="true" disabled>Resources</button>
          </nav>
          <div className="dd-right">
            <button className="icon-btn" aria-label="Notifications">🔔</button>
            <div className="avatar-menu">
              <button className="avatar-btn" onClick={() => setMenuOpen(v => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
                <span className="avatar-circle">{initial(metrics.name || profile.name)}</span>
              </button>
              {menuOpen && (
                <div className="dropdown" role="menu">
                  <button className="dropdown-item" onClick={() => nav('/donor/profile')}>👤 My Profile</button>
                  <button className="dropdown-item" onClick={() => nav('/donor/settings')}>⚙️ Settings</button>
                  <div className="dropdown-divider" role="separator" />
                  <button className="dropdown-item danger" onClick={handleLogout}>🚪 Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Fixed Sidebar */}
      <aside className="dd-sidebar" aria-label="Sidebar">
        <button className="side-item active">📊 Dashboard</button>
        <button className="side-item" onClick={() => nav('/donor/history')}>🩸 Donation History</button>
        <button className="side-item" onClick={() => nav('/donor/requests')}>
          🎯 Active Missions {metrics?.active_matches_count > 0 && (<span className="badge-count">{metrics.active_matches_count}</span>)}
        </button>
        <button className="side-item" disabled>🏆 Achievements</button>
        <button className="side-item" disabled>📚 Resources</button>
      </aside>

      {/* Main Content */}
      <main className="dd-main">
        <div className="dd-container">
          {/* Hero Status Bar */}
          <section className="hero-status-bar simple-card">
            <div className="status">
              <span className={`pulse-dot ${available ? 'on' : 'off'}`} aria-hidden="true" />
              <span className="status-text">{available ? 'Online' : 'Offline'}</span>
            </div>
            <div className="beacon">
              <label className="switch">
                <input type="checkbox" checked={available} onChange={() => toggle(available ? 'unavailable' : 'available')} aria-pressed={available} />
                <span className="slider" />
              </label>
              <span className="beacon-label">Available for Emergencies</span>
            </div>
            {typeof metrics?.reliability_score === 'number' && (
              <div className="trust-badge" aria-label="Trust Rating">
                <span className="star">⭐</span>
                <span className="trust-text">{metrics.reliability_score.toFixed(2)}</span>
              </div>
            )}
          </section>

          {/* Metric Grid (2x2) */}
          <section className="metric-grid">
            <div className="metric-card holo simple-card">
              <div className="metric-title">Total Donations</div>
              <div className="metric-value mono">{typeof metrics.total_donations === 'number' ? metrics.total_donations : '—'}</div>
            </div>

            <div className="metric-card simple-card">
              <div className="metric-title">Last Donation</div>
              <div className="metric-value">{metrics.last_donation_date ? new Date(metrics.last_donation_date).toLocaleDateString() : '—'}</div>
              {metrics.last_donated_to && <div className="metric-subtitle">{metrics.last_donated_to}</div>}
            </div>

            <div className="metric-card simple-card">
              <div className="metric-title">Next Eligible</div>
              <div className="metric-value">{typeof metrics.eligible_in_days === 'number' ? (metrics.eligible_in_days > 0 ? (nextEligibleDate || '—') : 'Today') : '—'}</div>
              {eligibilityProgress !== null && (
                <div className="progress"><div className="bar" style={{ width: `${eligibilityProgress}%` }} /></div>
              )}
            </div>

            <div className="metric-card simple-card">
              <div className="metric-title">Lives Impacted</div>
              <div className="metric-value mono">{livesImpacted}</div>
              <div className="metric-subtitle">Estimated</div>
            </div>
          </section>

          {/* Geo-Match Feed */}
          <section className="geo-feed simple-card">
            <div className="feed-header">
              <h3>Geo-Match Feed</h3>
              <span className="text-muted">Active: {metrics.active_matches_count || 0}</span>
            </div>
            {matches.length === 0 ? (
              <div className="text-muted text-sm">No matches yet.</div>
            ) : (
              <ul className="feed-list">
                {matches.map((m) => (
                  <li key={m.match_id} className="feed-item">
                    <div className="feed-info">
                      <div className="feed-title">Request: {m.request_id}</div>
                      <div className="feed-sub">Score: {m.score} • Status: {m.response || 'pending'}</div>
                    </div>
                    <div className="feed-actions">
                      <button onClick={() => respond(m.match_id, 'accept')} className="cta accept">Accept Mission</button>
                      <button onClick={() => respond(m.match_id, 'reject')} className="cta reject">Decline</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
