import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDonorDonations } from "../../services/api";
import "./my-donations.css";

const MyDonations = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({
    total_donations: 0,
    total_units: 0,
    most_frequent_hospital: "",
    avg_interval_days: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDonations();
  }, []);

  async function loadDonations() {
    setLoading(true);
    setError("");
    try {
      const response = await getDonorDonations();
      const donationsData = response.data?.donations || [];
      
      setDonations(donationsData);
      
      // Calculate statistics
      const totalUnits = donationsData.reduce((sum, d) => sum + (d.units || 1), 0);
      const hospitalCounts = {};
      donationsData.forEach(d => {
        if (d.hospital_name) {
          hospitalCounts[d.hospital_name] = (hospitalCounts[d.hospital_name] || 0) + 1;
        }
      });
      
      const mostFrequent = Object.keys(hospitalCounts).length > 0
        ? Object.keys(hospitalCounts).reduce((a, b) => 
            hospitalCounts[a] > hospitalCounts[b] ? a : b
          )
        : "N/A";

      // Calculate average interval between donations
      let avgInterval = 0;
      if (donationsData.length >= 2) {
        const dates = donationsData
          .map(d => new Date(d.donation_date))
          .sort((a, b) => a - b);
        
        let totalDays = 0;
        for (let i = 1; i < dates.length; i++) {
          const diffTime = Math.abs(dates[i] - dates[i-1]);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalDays += diffDays;
        }
        avgInterval = Math.round(totalDays / (dates.length - 1));
      }

      setStats({
        total_donations: donationsData.length,
        total_units: totalUnits,
        most_frequent_hospital: mostFrequent,
        avg_interval_days: avgInterval
      });
    } catch (error) {
      console.error("Failed to load donations:", error);
      setError("Failed to load donation history. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status) {
    const badges = {
      completed: { class: "success", icon: "✅", text: "Completed" },
      verified: { class: "verified", icon: "🎖️", text: "Verified" },
      pending: { class: "warning", icon: "⏳", text: "Pending" }
    };
    return badges[status] || badges.completed;
  }

  const handleViewDetails = (donationId) => {
    navigate(`/donor/donations/${donationId}`);
  };

  if (loading) {
    return (
      <div className="my-donations loading">
        <div className="loading-spinner">
          <div className="pulse-ring"></div>
          <div className="blood-drop">🩸</div>
        </div>
        <p>Loading donation history...</p>
      </div>
    );
  }

  return (
    <div className="my-donations">
      {/* Header */}
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/donor/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>🩸 My Donations</h1>
          <p>Your complete donation history and achievements</p>
        </div>
      </header>

      <div className="donations-container">
        {/* Statistics Panel */}
        <aside className="stats-sidebar">
          <div className="stats-card">
            <h3>📊 Your Impact</h3>
            
            <div className="stat-item-large">
              <div className="stat-icon-large">💉</div>
              <div className="stat-content-large">
                <div className="stat-value-large">{stats.total_donations}</div>
                <div className="stat-label-large">Total Donations</div>
              </div>
            </div>

            <div className="stat-divider"></div>

            <div className="stat-item">
              <span className="stat-icon">🩸</span>
              <div>
                <div className="stat-value">{stats.total_units}</div>
                <div className="stat-label">Units Donated</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">🏥</span>
              <div>
                <div className="stat-value-text">{stats.most_frequent_hospital}</div>
                <div className="stat-label">Most Frequent Hospital</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">📅</span>
              <div>
                <div className="stat-value">{stats.avg_interval_days} days</div>
                <div className="stat-label">Avg. Interval</div>
              </div>
            </div>

            <div className="achievement-badge">
              <div className="badge-icon">🏆</div>
              <div className="badge-text">
                <strong>Hero Status</strong>
                <span>Life Saver Badge Earned</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="donations-main">
          {/* Error Display */}
          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Donations List */}
          <div className="donations-list">
            {donations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No donations yet</h3>
                <p>Your donation history will appear here once you donate blood.</p>
              </div>
            ) : (
              donations.map((donation, index) => (
                <div key={donation.id} className="donation-card" style={{"--index": index}}>
                  <div className="donation-header">
                    <div className="donation-date">
                      <span className="date-icon">📅</span>
                      <span>{new Date(donation.donation_date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}</span>
                    </div>
                    <div className={`status-badge ${getStatusBadge(donation.status).class}`}>
                      <span>{getStatusBadge(donation.status).icon}</span>
                      <span>{getStatusBadge(donation.status).text}</span>
                    </div>
                  </div>

                  <div className="donation-details">
                    <div className="detail-row">
                      <span className="detail-icon">🏥</span>
                      <div className="detail-content">
                        <div className="detail-label">Hospital</div>
                        <div className="detail-value">{donation.hospital_name}</div>
                      </div>
                    </div>

                    <div className="detail-row">
                      <span className="detail-icon">📍</span>
                      <div className="detail-content">
                        <div className="detail-label">District</div>
                        <div className="detail-value">{donation.district}</div>
                      </div>
                    </div>

                    <div className="detail-row">
                      <span className="detail-icon">🩸</span>
                      <div className="detail-content">
                        <div className="detail-label">Units Donated</div>
                        <div className="detail-value">{donation.units_donated} unit(s)</div>
                      </div>
                    </div>

                    <div className="detail-row">
                      <span className="detail-icon">🔖</span>
                      <div className="detail-content">
                        <div className="detail-label">Request ID</div>
                        <div className="detail-value">{donation.request_id}</div>
                      </div>
                    </div>
                  </div>

                  <div className="donation-actions">
                    <button 
                      className="btn-details"
                      onClick={() => handleViewDetails(donation.id)}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyDonations;
