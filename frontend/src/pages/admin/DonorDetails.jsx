import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Droplets,
  Activity,
  Shield,
  Clock,
  Award,
  Heart,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Edit,
  Ban,
  Trash2,
  MessageSquare,
  FileText,
  BarChart3
} from 'lucide-react';
import donorManagementService from '../../services/donorManagementService';
import './DonorDetails.css';

const DonorDetailsContent = () => {
  const { theme } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDonorDetails();
  }, [id]);

  const fetchDonorDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await donorManagementService.getDonorById(id);
      setDonor(response.data);
    } catch (err) {
      console.error('Error fetching donor details:', err);
      setError(err.response?.data?.message || 'Failed to load donor details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/donors');
  };

  const handleEdit = () => {
    navigate(`/admin/donors/${id}/edit`);
  };

  const handleBlock = async () => {
    if (window.confirm(`Are you sure you want to ${donor.status === 'active' ? 'block' : 'unblock'} this donor?`)) {
      try {
        await donorManagementService.toggleDonorStatus(id);
        fetchDonorDetails();
      } catch (err) {
        alert('Failed to update donor status');
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this donor? This action cannot be undone.')) {
      try {
        await donorManagementService.deleteDonor(id);
        navigate('/admin/donors');
      } catch (err) {
        alert('Failed to delete donor');
      }
    }
  };

  const handleDownloadReport = () => {
    // Implement download functionality
    console.log('Downloading donor report...');
  };

  if (loading) {
    return (
      <div className="donor-details-loading">
        <div className="loading-spinner"></div>
        <p>Loading donor details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="donor-details-error">
        <AlertCircle size={48} />
        <h2>Error Loading Donor Details</h2>
        <p>{error}</p>
        <button onClick={handleBack} className="btn-back">
          <ArrowLeft size={20} />
          Back to Donors
        </button>
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="donor-details-error">
        <AlertCircle size={48} />
        <h2>Donor Not Found</h2>
        <p>The requested donor could not be found.</p>
        <button onClick={handleBack} className="btn-back">
          <ArrowLeft size={20} />
          Back to Donors
        </button>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { icon: CheckCircle, color: 'success', label: 'Active' },
      blocked: { icon: Ban, color: 'danger', label: 'Blocked' },
      inactive: { icon: XCircle, color: 'warning', label: 'Inactive' }
    };
    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;
    return (
      <span className={`status-badge status-${config.color}`}>
        <Icon size={16} />
        {config.label}
      </span>
    );
  };

  const getAvailabilityBadge = (isAvailable) => {
    return (
      <span className={`availability-badge ${isAvailable ? 'available' : 'unavailable'}`}>
        <Activity size={16} />
        {isAvailable ? 'Available' : 'Unavailable'}
      </span>
    );
  };

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="donor-details-page">
      {/* Header Section */}
      <div className="donor-details-header">
        <div className="header-top">
          <button onClick={handleBack} className="btn-back">
            <ArrowLeft size={20} />
            Back to Donors
          </button>
          <div className="header-actions">
            <button onClick={handleDownloadReport} className="btn-action btn-download">
              <Download size={18} />
              Download Report
            </button>
            <button onClick={handleEdit} className="btn-action btn-edit">
              <Edit size={18} />
              Edit
            </button>
            <button 
              onClick={handleBlock} 
              className={`btn-action ${donor.status === 'active' ? 'btn-block' : 'btn-unblock'}`}
            >
              <Ban size={18} />
              {donor.status === 'active' ? 'Block' : 'Unblock'}
            </button>
            <button onClick={handleDelete} className="btn-action btn-delete">
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-circle">
              <User size={48} />
            </div>
            <div className="avatar-badge">
              <Droplets size={20} />
              {donor.blood_group}
            </div>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{donor.name}</h1>
            <p className="profile-id">Donor ID: #{donor.donor_id}</p>
            <div className="profile-badges">
              {getStatusBadge(donor.status)}
              {getAvailabilityBadge(donor.is_available)}
              {donor.reliability_score >= 80 && (
                <span className="badge-verified">
                  <Award size={16} />
                  Verified Donor
                </span>
              )}
            </div>
          </div>
          <div className="profile-stats">
            <div className="stat-item">
              <Heart size={24} />
              <div className="stat-content">
                <span className="stat-value">{donor.total_donations || 0}</span>
                <span className="stat-label">Total Donations</span>
              </div>
            </div>
            <div className="stat-item">
              <TrendingUp size={24} />
              <div className="stat-content">
                <span className="stat-value">{donor.reliability_score?.toFixed(1) || 0}%</span>
                <span className="stat-label">Reliability Score</span>
              </div>
            </div>
            <div className="stat-item">
              <Shield size={24} />
              <div className="stat-content">
                <span className="stat-value">{donor.response_rate || 0}%</span>
                <span className="stat-label">Response Rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <User size={18} />
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          <Phone size={18} />
          Contact Info
        </button>
        <button 
          className={`tab-btn ${activeTab === 'medical' ? 'active' : ''}`}
          onClick={() => setActiveTab('medical')}
        >
          <Activity size={18} />
          Medical Info
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={18} />
          History
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={18} />
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="info-card">
              <div className="card-header">
                <User size={20} />
                <h3>Personal Information</h3>
              </div>
              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Full Name</span>
                  <span className="info-value">{donor.name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Gender</span>
                  <span className="info-value">{donor.gender || 'Not specified'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Date of Birth</span>
                  <span className="info-value">{formatDate(donor.date_of_birth)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Age</span>
                  <span className="info-value">{calculateAge(donor.date_of_birth)} years</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Blood Group</span>
                  <span className="info-value blood-group">{donor.blood_group}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="card-header">
                <MapPin size={20} />
                <h3>Location Details</h3>
              </div>
              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">City</span>
                  <span className="info-value">{donor.city || 'Not specified'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">District</span>
                  <span className="info-value">{donor.district || 'Not specified'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">State</span>
                  <span className="info-value">{donor.state || 'Kerala'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Pin Code</span>
                  <span className="info-value">{donor.pin_code || 'Not specified'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address</span>
                  <span className="info-value">{donor.address || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="card-header">
                <Activity size={20} />
                <h3>Donation Status</h3>
              </div>
              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Availability</span>
                  <span className="info-value">
                    {getAvailabilityBadge(donor.is_available)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last Donation</span>
                  <span className="info-value">{formatDate(donor.last_donation_date)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Total Donations</span>
                  <span className="info-value">{donor.total_donations || 0}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Reliability Score</span>
                  <span className="info-value">{donor.reliability_score?.toFixed(1) || 0}%</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Response Rate</span>
                  <span className="info-value">{donor.response_rate || 0}%</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="card-header">
                <Clock size={20} />
                <h3>Account Information</h3>
              </div>
              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Account Status</span>
                  <span className="info-value">{getStatusBadge(donor.status)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Member Since</span>
                  <span className="info-value">{formatDate(donor.created_at)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last Login</span>
                  <span className="info-value">{formatDateTime(donor.last_login)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email Verified</span>
                  <span className="info-value">
                    {donor.email_verified ? (
                      <span className="verified-badge"><CheckCircle size={16} /> Verified</span>
                    ) : (
                      <span className="unverified-badge"><XCircle size={16} /> Not Verified</span>
                    )}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone Verified</span>
                  <span className="info-value">
                    {donor.phone_verified ? (
                      <span className="verified-badge"><CheckCircle size={16} /> Verified</span>
                    ) : (
                      <span className="unverified-badge"><XCircle size={16} /> Not Verified</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Info Tab */}
        {activeTab === 'contact' && (
          <div className="contact-grid">
            <div className="info-card">
              <div className="card-header">
                <Mail size={20} />
                <h3>Email Information</h3>
              </div>
              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Primary Email</span>
                  <span className="info-value">{donor.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email Status</span>
                  <span className="info-value">
                    {donor.email_verified ? (
                      <span className="verified-badge"><CheckCircle size={16} /> Verified</span>
                    ) : (
                      <span className="unverified-badge"><XCircle size={16} /> Not Verified</span>
                    )}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email Notifications</span>
                  <span className="info-value">
                    {donor.email_notifications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="card-header">
                <Phone size={20} />
                <h3>Phone Information</h3>
              </div>
              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Primary Phone</span>
                  <span className="info-value">{donor.phone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone Status</span>
                  <span className="info-value">
                    {donor.phone_verified ? (
                      <span className="verified-badge"><CheckCircle size={16} /> Verified</span>
                    ) : (
                      <span className="unverified-badge"><XCircle size={16} /> Not Verified</span>
                    )}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">SMS Notifications</span>
                  <span className="info-value">
                    {donor.sms_notifications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">WhatsApp Number</span>
                  <span className="info-value">{donor.whatsapp_number || 'Same as phone'}</span>
                </div>
              </div>
            </div>

            <div className="info-card full-width">
              <div className="card-header">
                <MapPin size={20} />
                <h3>Complete Address</h3>
              </div>
              <div className="card-body">
                <div className="address-display">
                  <p>{donor.address || 'Address not provided'}</p>
                  <p>{donor.city}, {donor.district}</p>
                  <p>{donor.state || 'Kerala'} - {donor.pin_code || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medical Info Tab */}
        {activeTab === 'medical' && (
          <div className="medical-grid">
            <div className="info-card">
              <div className="card-header">
                <Droplets size={20} />
                <h3>Blood Information</h3>
              </div>
              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Blood Group</span>
                  <span className="info-value blood-group-large">{donor.blood_group}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last Donation Date</span>
                  <span className="info-value">{formatDate(donor.last_donation_date)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Next Eligible Date</span>
                  <span className="info-value">
                    {donor.next_eligible_date ? formatDate(donor.next_eligible_date) : 'Available Now'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Total Donations</span>
                  <span className="info-value">{donor.total_donations || 0} times</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="card-header">
                <Activity size={20} />
                <h3>Health Status</h3>
              </div>
              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Weight</span>
                  <span className="info-value">{donor.weight || 'Not specified'} kg</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Height</span>
                  <span className="info-value">{donor.height || 'Not specified'} cm</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Medical Conditions</span>
                  <span className="info-value">{donor.medical_conditions || 'None reported'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Allergies</span>
                  <span className="info-value">{donor.allergies || 'None reported'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Current Medications</span>
                  <span className="info-value">{donor.medications || 'None'}</span>
                </div>
              </div>
            </div>

            <div className="info-card full-width">
              <div className="card-header">
                <FileText size={20} />
                <h3>Medical Notes</h3>
              </div>
              <div className="card-body">
                <div className="medical-notes">
                  {donor.medical_notes || 'No medical notes available.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="history-section">
            <div className="info-card">
              <div className="card-header">
                <Clock size={20} />
                <h3>Donation History</h3>
              </div>
              <div className="card-body">
                <div className="timeline">
                  {donor.donation_history && donor.donation_history.length > 0 ? (
                    donor.donation_history.map((donation, index) => (
                      <div key={index} className="timeline-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                          <div className="timeline-date">{formatDate(donation.date)}</div>
                          <div className="timeline-title">Blood Donation</div>
                          <div className="timeline-details">
                            <span>Location: {donation.location}</span>
                            <span>Units: {donation.units}</span>
                            <span>Status: {donation.status}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-data">No donation history available.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="card-header">
                <MessageSquare size={20} />
                <h3>Request History</h3>
              </div>
              <div className="card-body">
                <div className="timeline">
                  {donor.request_history && donor.request_history.length > 0 ? (
                    donor.request_history.map((request, index) => (
                      <div key={index} className="timeline-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                          <div className="timeline-date">{formatDateTime(request.date)}</div>
                          <div className="timeline-title">Blood Request</div>
                          <div className="timeline-details">
                            <span>Hospital: {request.hospital}</span>
                            <span>Response: {request.response}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-data">No request history available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="analytics-grid">
            <div className="info-card">
              <div className="card-header">
                <BarChart3 size={20} />
                <h3>Performance Metrics</h3>
              </div>
              <div className="card-body">
                <div className="metric-item">
                  <div className="metric-label">Reliability Score</div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ width: `${donor.reliability_score || 0}%` }}
                    ></div>
                  </div>
                  <div className="metric-value">{donor.reliability_score?.toFixed(1) || 0}%</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Response Rate</div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ width: `${donor.response_rate || 0}%` }}
                    ></div>
                  </div>
                  <div className="metric-value">{donor.response_rate || 0}%</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Completion Rate</div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ width: `${donor.completion_rate || 0}%` }}
                    ></div>
                  </div>
                  <div className="metric-value">{donor.completion_rate || 0}%</div>
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="card-header">
                <TrendingUp size={20} />
                <h3>Activity Summary</h3>
              </div>
              <div className="card-body">
                <div className="summary-stats">
                  <div className="summary-item">
                    <div className="summary-icon">
                      <Heart size={24} />
                    </div>
                    <div className="summary-content">
                      <div className="summary-value">{donor.total_donations || 0}</div>
                      <div className="summary-label">Total Donations</div>
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-icon">
                      <MessageSquare size={24} />
                    </div>
                    <div className="summary-content">
                      <div className="summary-value">{donor.total_requests || 0}</div>
                      <div className="summary-label">Requests Received</div>
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-icon">
                      <CheckCircle size={24} />
                    </div>
                    <div className="summary-content">
                      <div className="summary-value">{donor.requests_accepted || 0}</div>
                      <div className="summary-label">Requests Accepted</div>
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-icon">
                      <XCircle size={24} />
                    </div>
                    <div className="summary-content">
                      <div className="summary-value">{donor.requests_declined || 0}</div>
                      <div className="summary-label">Requests Declined</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DonorDetails = () => {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <DonorDetailsContent />
      </DashboardLayout>
    </ThemeProvider>
  );
};

export default DonorDetails;
