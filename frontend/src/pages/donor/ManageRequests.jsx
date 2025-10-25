import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDonorDashboard, respondToMatch } from "../../services/api";
import "./manage-requests.css";

const ManageRequests = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState({ pending: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    setLoading(true);
    setError("");
    try {
      const res = await getDonorDashboard();
      const data = res?.data ?? res ?? {};
      const pending = Array.isArray(data.pending_matches) ? data.pending_matches.map((m) => ({
        id: m.request_id,
        match_id: m.match_id,
        hospital_name: m.hospital,
        blood_group: m.blood_group,
        urgency: m.urgency,
        units_required: m.units_required,
        contact_person: m.contact_person,
        contact_phone: m.contact_phone,
        created_at: m.matched_at,
        distance: m.distance_km
      })) : [];
      setRequests({ pending, completed: [] });
    } catch (e) {
      console.error("Failed to load matches", e);
      setError("Failed to load requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getUrgencyBadge(urgency) {
    const badges = {
      high: { class: "urgent", icon: "🚨", text: "Urgent" },
      medium: { class: "medium", icon: "⚠️", text: "Medium" },
      low: { class: "low", icon: "ℹ️", text: "Low Priority" }
    };
    return badges[urgency] || badges.medium;
  }

  async function handleAccept(matchId) {
    if (!matchId) return;
    if (!window.confirm("Accept this request? The hospital will be notified.")) return;
    try {
      await respondToMatch(matchId, "accept");
      await loadMatches();
    } catch (e) {
      alert("Failed to accept request. Please try again.");
    }
  }

  async function handleReject(matchId) {
    if (!matchId) return;
    if (!window.confirm("Reject this request?")) return;
    try {
      await respondToMatch(matchId, "reject");
      await loadMatches();
    } catch (e) {
      alert("Failed to reject request. Please try again.");
    }
  }

  function openMapSearch(hospitalName) {
    if (!hospitalName) return;
    const q = encodeURIComponent(hospitalName);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  }

  return (
    <div className="manage-requests">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/donor/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>🏥 Manage Requests</h1>
          <p>Accept or reject blood donation requests matched to you</p>
        </div>
      </header>

      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          📩 Pending ({requests.pending.length})
        </button>
        <button 
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          ✅ History ({requests.completed.length})
        </button>
      </div>

      <div className="requests-container">
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner">
              <div className="pulse-ring"></div>
              <div className="blood-drop">🩸</div>
            </div>
            <p>Loading requests...</p>
          </div>
        )}
        {activeTab === 'pending' && requests.pending.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Pending Requests</h3>
            <p>You don't have any pending donation requests at the moment.</p>
          </div>
        )}

        {activeTab === 'pending' && requests.pending.map((req, index) => (
          <div key={req.id} className="request-card" style={{"--index": index}}>
            <div className="request-header">
              <div className={`urgency-badge ${getUrgencyBadge(req.urgency).class}`}>
                <span>{getUrgencyBadge(req.urgency).icon}</span>
                <span>{getUrgencyBadge(req.urgency).text}</span>
              </div>
              {typeof req.distance === 'number' && (
                <div className="distance-badge">📍 {req.distance} km away</div>
              )}
            </div>

            <h3 className="hospital-name">{req.hospital_name}</h3>

            <div className="request-details-grid">
              <div className="detail-item">
                <span className="detail-icon">🩸</span>
                <div>
                  <div className="detail-label">Blood Group</div>
                  <div className="detail-value">{req.blood_group}</div>
                </div>
              </div>

              <div className="detail-item">
                <span className="detail-icon">💉</span>
                <div>
                  <div className="detail-label">Units Needed</div>
                  <div className="detail-value">{req.units_required} unit(s)</div>
                </div>
              </div>

              <div className="detail-item">
                <span className="detail-icon">👤</span>
                <div>
                  <div className="detail-label">Contact Person</div>
                  <div className="detail-value">{req.contact_person}</div>
                </div>
              </div>

              <div className="detail-item">
                <span className="detail-icon">📞</span>
                <div>
                  <div className="detail-label">Phone</div>
                  <div className="detail-value">{req.contact_phone}</div>
                </div>
              </div>
            </div>

            <div className="request-time">
              🕒 Requested {new Date(req.created_at).toLocaleString()}
            </div>

            <div className="request-actions">
              <button className="btn-reject" onClick={() => handleReject(req.match_id)}>
                ❌ Reject
              </button>
              <button className="btn-view-map" onClick={() => openMapSearch(req.hospital_name)}>
                🗺️ View on Map
              </button>
              <button className="btn-accept" onClick={() => handleAccept(req.match_id)}>
                ✅ Accept Request
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageRequests;
