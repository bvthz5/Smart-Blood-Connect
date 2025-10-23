import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./manage-requests.css";

const ManageRequests = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState({
    pending: [
      {
        id: 1,
        hospital_name: "Amrita Institute of Medical Sciences",
        blood_group: "O+",
        urgency: "high",
        units_required: 2,
        contact_person: "Dr. Ramesh Kumar",
        contact_phone: "+91 9876543210",
        distance: 3.2,
        created_at: "2024-01-20T10:30:00"
      },
      {
        id: 2,
        hospital_name: "Lakeshore Hospital",
        blood_group: "O+",
        urgency: "medium",
        units_required: 1,
        contact_person: "Nurse Priya",
        contact_phone: "+91 9876543211",
        distance: 5.8,
        created_at: "2024-01-19T15:45:00"
      }
    ],
    completed: []
  });

  function getUrgencyBadge(urgency) {
    const badges = {
      high: { class: "urgent", icon: "🚨", text: "Urgent" },
      medium: { class: "medium", icon: "⚠️", text: "Medium" },
      low: { class: "low", icon: "ℹ️", text: "Low Priority" }
    };
    return badges[urgency] || badges.medium;
  }

  async function handleAccept(requestId) {
    if (window.confirm("Are you sure you want to accept this request? The hospital will be notified.")) {
      // API call to accept request
      alert("Request accepted! Hospital has been notified.");
    }
  }

  async function handleReject(requestId) {
    if (window.confirm("Are you sure you want to reject this request?")) {
      // API call to reject request
      alert("Request rejected.");
    }
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
              <div className="distance-badge">
                📍 {req.distance} km away
              </div>
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
              <button className="btn-reject" onClick={() => handleReject(req.id)}>
                ❌ Reject
              </button>
              <button className="btn-view-map">
                🗺️ View on Map
              </button>
              <button className="btn-accept" onClick={() => handleAccept(req.id)}>
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
