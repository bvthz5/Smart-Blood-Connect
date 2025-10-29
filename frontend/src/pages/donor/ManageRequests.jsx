import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getDonorDashboard, respondToMatch } from "../../services/api";
import "./manage-requests.css";

const ManageRequests = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState({ pending: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [donorLocation, setDonorLocation] = useState(null);

  useEffect(() => {
    loadMatches();
    getDonorLocation();
  }, []);

  useEffect(() => {
    if (showMap && mapRef.current && selectedRequest) {
      initializeMap();
    }
  }, [showMap, selectedRequest]);

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

  async function getDonorLocation() {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setDonorLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.warn("Location permission denied:", error);
            // Default to Kochi if location denied
            setDonorLocation({ lat: 9.9312, lng: 76.2673 });
          }
        );
      } else {
        setDonorLocation({ lat: 9.9312, lng: 76.2673 });
      }
    } catch (error) {
      console.error("Error getting location:", error);
      setDonorLocation({ lat: 9.9312, lng: 76.2673 });
    }
  }

  function initializeMap() {
    if (!mapRef.current || !selectedRequest || !donorLocation) return;

    // Create a simple map using Google Maps embed
    const mapContainer = mapRef.current;
    const hospitalName = encodeURIComponent(selectedRequest.hospital_name);
    const donorLat = donorLocation.lat;
    const donorLng = donorLocation.lng;
    
    // Create embedded map URL
    const mapUrl = `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWWgU6xq4j0tY&origin=${donorLat},${donorLng}&destination=${hospitalName}&mode=driving`;
    
    // Clear previous content and safely set new content
    mapContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '400';
    iframe.style.border = '0';
    iframe.style.borderRadius = '12px';
    iframe.loading = 'lazy';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.src = mapUrl;
    mapContainer.appendChild(iframe);
  }

  function openMapView(request) {
    setSelectedRequest(request);
    setShowMap(true);
  }

  function closeMapView() {
    setShowMap(false);
    setSelectedRequest(null);
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
              <button className="btn-view-map" onClick={() => openMapView(req)}>
                🗺️ View Route
              </button>
              <button className="btn-external-map" onClick={() => openMapSearch(req.hospital_name)}>
                📍 Open Maps
              </button>
              <button className="btn-accept" onClick={() => handleAccept(req.match_id)}>
                ✅ Accept Request
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Map Modal */}
      {showMap && selectedRequest && (
        <div className="map-modal-overlay" onClick={closeMapView}>
          <div className="map-modal" onClick={(e) => e.stopPropagation()}>
            <div className="map-modal-header">
              <h3>📍 Route to {selectedRequest.hospital_name}</h3>
              <button className="close-map-btn" onClick={closeMapView}>
                ✕
              </button>
            </div>
            <div className="map-modal-content">
              <div className="map-info">
                <div className="map-info-item">
                  <span className="info-icon">🏥</span>
                  <div>
                    <div className="info-label">Hospital</div>
                    <div className="info-value">{selectedRequest.hospital_name}</div>
                  </div>
                </div>
                <div className="map-info-item">
                  <span className="info-icon">🩸</span>
                  <div>
                    <div className="info-label">Blood Group</div>
                    <div className="info-value">{selectedRequest.blood_group}</div>
                  </div>
                </div>
                <div className="map-info-item">
                  <span className="info-icon">💉</span>
                  <div>
                    <div className="info-label">Units Required</div>
                    <div className="info-value">{selectedRequest.units_required}</div>
                  </div>
                </div>
                {typeof selectedRequest.distance === 'number' && (
                  <div className="map-info-item">
                    <span className="info-icon">📏</span>
                    <div>
                      <div className="info-label">Distance</div>
                      <div className="info-value">{selectedRequest.distance} km</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="map-container" ref={mapRef}>
                <div className="map-loading">
                  <div className="loading-spinner">
                    <div className="pulse-ring"></div>
                    <div className="blood-drop">🗺️</div>
                  </div>
                  <p>Loading map...</p>
                </div>
              </div>
            </div>
            <div className="map-modal-actions">
              <button className="btn-secondary" onClick={closeMapView}>
                Close Map
              </button>
              <button className="btn-primary" onClick={() => openMapSearch(selectedRequest.hospital_name)}>
                Open in Google Maps
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRequests;
