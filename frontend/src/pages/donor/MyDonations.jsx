import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadDonations();
  }, []);

  async function loadDonations() {
    setLoading(true);
    try {
      // API call - replace with actual endpoint
      // const res = await getDonationHistory();
      
      // Mock data for demonstration
      const mockDonations = [
        {
          id: 1,
          donation_date: "2024-01-15",
          hospital_name: "Medical Trust Hospital",
          district: "Ernakulam",
          units_donated: 1,
          request_id: "REQ-2024-001",
          status: "completed",
          certificate_url: "/certificates/cert-001.pdf"
        },
        {
          id: 2,
          donation_date: "2023-10-10",
          hospital_name: "Amrita Institute of Medical Sciences",
          district: "Ernakulam",
          units_donated: 1,
          request_id: "REQ-2023-089",
          status: "verified",
          certificate_url: "/certificates/cert-002.pdf"
        },
        {
          id: 3,
          donation_date: "2023-07-05",
          hospital_name: "Lakeshore Hospital",
          district: "Kochi",
          units_donated: 1,
          request_id: "REQ-2023-067",
          status: "completed",
          certificate_url: null
        }
      ];

      setDonations(mockDonations);
      
      // Calculate statistics
      const totalUnits = mockDonations.reduce((sum, d) => sum + d.units_donated, 0);
      const hospitalCounts = {};
      mockDonations.forEach(d => {
        hospitalCounts[d.hospital_name] = (hospitalCounts[d.hospital_name] || 0) + 1;
      });
      
      const mostFrequent = Object.keys(hospitalCounts).reduce((a, b) => 
        hospitalCounts[a] > hospitalCounts[b] ? a : b, ""
      );

      setStats({
        total_donations: mockDonations.length,
        total_units: totalUnits,
        most_frequent_hospital: mostFrequent,
        avg_interval_days: 96
      });
    } catch (error) {
      console.error("Failed to load donations:", error);
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

  const filteredDonations = filter === "all" 
    ? donations 
    : donations.filter(d => d.status === filter);

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
          {/* Filters */}
          <div className="filter-bar">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Donations ({donations.length})
            </button>
            <button 
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
            <button 
              className={`filter-btn ${filter === 'verified' ? 'active' : ''}`}
              onClick={() => setFilter('verified')}
            >
              Verified
            </button>
          </div>

          {/* Donations List */}
          <div className="donations-list">
            {filteredDonations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No donations yet</h3>
                <p>Your donation history will appear here once you donate blood.</p>
              </div>
            ) : (
              filteredDonations.map((donation, index) => (
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
                    {donation.certificate_url ? (
                      <button className="btn-certificate">
                        📜 Download Certificate
                      </button>
                    ) : (
                      <button className="btn-certificate disabled">
                        ⏳ Certificate Pending
                      </button>
                    )}
                    <button className="btn-details">
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
