import React, { useEffect, useState } from 'react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import seekerService from '../../services/seekerService';
import './MatchedDonors.css';

const barColor = (score) => {
  if (!score) return '#94a3b8';
  return score > 80 ? '#16a34a' : score > 60 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444';
};

const formatScore = (score) => {
  if (score === null || score === undefined) return 'N/A';
  return `${Math.round(score)}%`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

const getStatusBadge = (status) => {
  const statusConfig = {
    pending: { color: 'orange', text: 'Pending' },
    accepted: { color: 'green', text: 'Accepted' },
    declined: { color: 'red', text: 'Declined' },
    completed: { color: 'blue', text: 'Completed' },
    cancelled: { color: 'gray', text: 'Cancelled' }
  };

  const config = statusConfig[status] || statusConfig.pending;
  return <span className={`status-badge ${config.color}`}>{config.text}</span>;
};

const MatchedDonors = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await seekerService.listMatches();
        setRows(data?.items || data?.results || []);
      } catch (err) {
        setError(err.message || 'Failed to load matched donors');
        console.error('Error loading matches:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onLogout = () => {
    localStorage.removeItem('seeker_token');
    localStorage.removeItem('token');
    localStorage.removeItem('seeker_refresh_token');
    window.location.href = '/seeker/login';
  };

  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="page-wrap">
        <div className="card table-card">
          <div className="table-header">
            <h2>Matched Donors</h2>
            <p>View and manage potential blood donors for your requests</p>
          </div>
          
          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}
          
          <div className="table-scroll">
            <table className="matched-donors-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Blood Group</th>
                  <th>Distance</th>
                  <th>Match Score</th>
                  <th>Availability</th>
                  <th>Reliability</th>
                  <th>Last Donation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="loading-cell">
                      <div className="loading-spinner"></div>
                      Loading matched donors...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-cell">
                      <div className="empty-state">
                        <p>No matched donors found</p>
                        <p>Create a blood request to find potential donors</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r, index) => (
                    <tr key={r.match_id || r.id || index}>
                      <td>
                        <div className="donor-info">
                          <div className="donor-name">{r.donor_name || `Donor ${r.donor_id}`}</div>
                          <div className="donor-location">
                            {r.donor_city && r.donor_district 
                              ? `${r.donor_city}, ${r.donor_district}` 
                              : 'Location not available'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="blood-group-badge">
                          {r.donor_blood_group || r.blood_group || 'N/A'}
                        </div>
                      </td>
                      <td>{r.distance_km ? `${r.distance_km.toFixed(1)} km` : 'N/A'}</td>
                      <td>
                        <div className="score-cell">
                          <div className="score-bar-container">
                            <div 
                              className="score-bar" 
                              style={{
                                width: `${r.match_score || 0}%`,
                                background: barColor(r.match_score)
                              }}
                            />
                          </div>
                          <span className="score-value">{formatScore(r.match_score)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="score-cell">
                          <div className="score-bar-container">
                            <div 
                              className="score-bar" 
                              style={{
                                width: `${r.availability_score ? r.availability_score * 100 : 0}%`,
                                background: barColor(r.availability_score ? r.availability_score * 100 : 0)
                              }}
                            />
                          </div>
                          <span className="score-value">{formatScore(r.availability_score ? r.availability_score * 100 : null)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="score-cell">
                          <div className="score-bar-container">
                            <div 
                              className="score-bar" 
                              style={{
                                width: `${r.reliability_score || 0}%`,
                                background: barColor(r.reliability_score)
                              }}
                            />
                          </div>
                          <span className="score-value">{formatScore(r.reliability_score)}</span>
                        </div>
                      </td>
                      <td>{r.last_donation_date ? formatDate(r.last_donation_date) : 'Never'}</td>
                      <td>{getStatusBadge(r.status)}</td>
                      <td>
                        <div className="action-buttons">
                          {r.donor_phone && (
                            <button 
                              className="btn btn-primary btn-small"
                              onClick={() => window.open(`tel:${r.donor_phone}`, '_blank')}
                            >
                              Call
                            </button>
                          )}
                          {r.donor_email && (
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => window.open(`mailto:${r.donor_email}`, '_blank')}
                            >
                              Email
                            </button>
                          )}
                          {!r.donor_phone && !r.donor_email && (
                            <span className="contact-unavailable">Not notified</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SeekerLayout>
  );
};

export default MatchedDonors;