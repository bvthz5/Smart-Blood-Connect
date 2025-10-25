import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDonationDetails } from '../../services/api';
import './donation-details.css';

/**
 * DonationDetails Component
 * 
 * Displays detailed information about a specific donation
 * Including certificate download and sharing options
 */
export default function DonationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchDonationDetails();
  }, [id]);

  const fetchDonationDetails = async () => {
    setLoading(true);
    try {
      const response = await getDonationDetails(id);
      setDonation(response.data);
    } catch (err) {
      console.error('Failed to fetch donation details:', err);
      setError('Failed to load donation details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!donation?.certificate_url) {
      setToast('Certificate not available');
      setTimeout(() => setToast(''), 3000);
      return;
    }

    try {
      // Open certificate in new tab for download
      window.open(donation.certificate_url, '_blank');
      setToast('Certificate opened in new tab');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      console.error('Failed to download certificate:', err);
      setToast('Failed to download certificate');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleShare = async () => {
    const shareText = `I just completed my ${donation?.donation_number || 'latest'} blood donation at ${donation?.hospital_name}! 🩸 Join me in saving lives. #BloodDonation #SaveLives`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Blood Donation Achievement',
          text: shareText,
          url: window.location.href
        });
        setToast('Shared successfully!');
        setTimeout(() => setToast(''), 3000);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      setToast('Copied to clipboard!');
      setTimeout(() => setToast(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="donation-details-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading donation details...</p>
        </div>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="donation-details-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>{error || 'Donation not found'}</h3>
          <button onClick={() => navigate('/donor/donations')} className="btn-back">
            Back to Donations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="donation-details-container">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="details-header">
        <button onClick={() => navigate('/donor/donations')} className="btn-back">
          ← Back to Donations
        </button>
        <h1>Donation Details</h1>
      </div>

      {/* Main Content */}
      <div className="details-content">
        {/* Certificate Card */}
        <div className="certificate-card">
          <div className="certificate-preview">
            <div className="certificate-icon">🏆</div>
            <h2>Certificate of Appreciation</h2>
            <p className="certificate-number">Certificate #{donation.certificate_number || donation.id}</p>
          </div>
          <div className="certificate-actions">
            <button 
              onClick={handleDownloadCertificate}
              className="btn-primary"
              disabled={!donation.certificate_url}
            >
              📥 Download Certificate
            </button>
            <button onClick={handleShare} className="btn-secondary">
              🔗 Share Achievement
            </button>
          </div>
        </div>

        {/* Donation Information */}
        <div className="info-section">
          <h3>Donation Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Donation Date</span>
              <span className="info-value">
                {new Date(donation.donation_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Blood Group</span>
              <span className="info-value blood-group">{donation.blood_group}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Units Donated</span>
              <span className="info-value">{donation.units || 1} Unit(s)</span>
            </div>
            <div className="info-item">
              <span className="info-label">Donation Type</span>
              <span className="info-value">{donation.donation_type || 'Whole Blood'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className={`status-badge ${donation.status}`}>
                {donation.status === 'completed' ? '✓ Completed' : donation.status}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Donation Number</span>
              <span className="info-value">#{donation.donation_number || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Hospital Information */}
        <div className="info-section">
          <h3>Hospital Information</h3>
          <div className="hospital-card">
            <div className="hospital-header">
              <div className="hospital-icon">🏥</div>
              <div>
                <h4>{donation.hospital_name}</h4>
                <p className="hospital-address">{donation.hospital_address}</p>
              </div>
            </div>
            <div className="hospital-details">
              <div className="detail-item">
                <span className="detail-icon">📍</span>
                <span>{donation.hospital_city}, {donation.hospital_district}</span>
              </div>
              {donation.hospital_phone && (
                <div className="detail-item">
                  <span className="detail-icon">📞</span>
                  <span>{donation.hospital_phone}</span>
                </div>
              )}
              {donation.contact_person && (
                <div className="detail-item">
                  <span className="detail-icon">👤</span>
                  <span>Contact: {donation.contact_person}</span>
                </div>
              )}
            </div>
            {donation.hospital_lat && donation.hospital_lng && (
              <button 
                onClick={() => window.open(`https://maps.google.com/?q=${donation.hospital_lat},${donation.hospital_lng}`, '_blank')}
                className="btn-map"
              >
                🗺️ View on Map
              </button>
            )}
          </div>
        </div>

        {/* Donation Timeline */}
        <div className="info-section">
          <h3>Donation Timeline</h3>
          <div className="timeline">
            {donation.created_at && (
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <span className="timeline-date">
                    {new Date(donation.created_at).toLocaleString()}
                  </span>
                  <span className="timeline-label">Request Created</span>
                </div>
              </div>
            )}
            {donation.accepted_at && (
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <span className="timeline-date">
                    {new Date(donation.accepted_at).toLocaleString()}
                  </span>
                  <span className="timeline-label">Request Accepted</span>
                </div>
              </div>
            )}
            {donation.donation_date && (
              <div className="timeline-item completed">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <span className="timeline-date">
                    {new Date(donation.donation_date).toLocaleString()}
                  </span>
                  <span className="timeline-label">Donation Completed</span>
                </div>
              </div>
            )}
            {donation.certificate_generated_at && (
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <span className="timeline-date">
                    {new Date(donation.certificate_generated_at).toLocaleString()}
                  </span>
                  <span className="timeline-label">Certificate Generated</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Badges Earned */}
        {donation.badges_earned && donation.badges_earned.length > 0 && (
          <div className="info-section">
            <h3>Badges Earned</h3>
            <div className="badges-grid">
              {donation.badges_earned.map((badge, index) => (
                <div key={index} className="badge-item">
                  <div className="badge-icon">{badge.icon || '🏅'}</div>
                  <div className="badge-name">{badge.name}</div>
                  <div className="badge-description">{badge.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {donation.notes && (
          <div className="info-section">
            <h3>Additional Notes</h3>
            <div className="notes-box">
              <p>{donation.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
