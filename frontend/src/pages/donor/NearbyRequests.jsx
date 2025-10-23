import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./nearby-requests.css";

const NearbyRequests = () => {
  const navigate = useNavigate();
  const [nearbyRequests, setNearbyRequests] = useState([
    {
      id: 1,
      hospital_name: "Medical Trust Hospital",
      blood_group: "O+",
      urgency: "high",
      units_required: 2,
      distance: 2.5,
      address: "MG Road, Kochi",
      lat: 9.9312,
      lng: 76.2673
    },
    {
      id: 2,
      hospital_name: "Amrita Institute",
      blood_group: "O+",
      urgency: "medium",
      units_required: 1,
      distance: 4.8,
      address: "Ponekkara, Kochi",
      lat: 10.0219,
      lng: 76.3242
    }
  ]);

  return (
    <div className="nearby-requests">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/donor/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>🧭 Nearby Requests</h1>
          <p>Blood donation requests within 10-20 km of your location</p>
        </div>
      </header>

      <div className="nearby-container">
        {/* Map Placeholder */}
        <div className="map-container">
          <div className="map-placeholder">
            <div className="map-icon">🗺️</div>
            <p>Interactive Map View</p>
            <small>Hospital locations will be displayed here</small>
          </div>
        </div>

        {/* Request Cards */}
        <div className="requests-grid">
          {nearbyRequests.map((req, index) => (
            <div key={req.id} className="nearby-card" style={{"--index": index}}>
              <div className="card-header-nearby">
                <h3>{req.hospital_name}</h3>
                <div className={`urgency-tag ${req.urgency}`}>
                  {req.urgency === 'high' ? '🚨' : '⚠️'} {req.urgency.toUpperCase()}
                </div>
              </div>

              <div className="card-details">
                <div className="detail-row-nearby">
                  <span className="icon">🩸</span>
                  <span><strong>Blood Group:</strong> {req.blood_group}</span>
                </div>
                <div className="detail-row-nearby">
                  <span className="icon">💉</span>
                  <span><strong>Units:</strong> {req.units_required}</span>
                </div>
                <div className="detail-row-nearby">
                  <span className="icon">📍</span>
                  <span><strong>Distance:</strong> {req.distance} km</span>
                </div>
                <div className="detail-row-nearby">
                  <span className="icon">📌</span>
                  <span><strong>Address:</strong> {req.address}</span>
                </div>
              </div>

              <div className="card-actions">
                <button className="btn-directions">
                  🗺️ Get Directions
                </button>
                <button className="btn-contact">
                  📞 Contact Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NearbyRequests;
