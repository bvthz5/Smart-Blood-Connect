import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import {
  Search,
  Filter,
  Heart,
  Building2,
  User,
  Droplets,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Target,
  MapPin,
  Phone,
  Mail,
  Eye,
  Check,
  X,
  Loader
} from 'lucide-react';
import './BloodMatching.css';

const BloodMatchingContent = () => {
  const { theme } = useTheme();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    blood_group: '',
    urgency: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0
  });
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Mock data for development
  const mockMatches = [
    {
      id: 1,
      donor_name: 'John Smith',
      donor_email: 'john.smith@email.com',
      donor_phone: '+91-9876543210',
      hospital_name: 'City General Hospital',
      hospital_city: 'Kochi',
      patient_name: 'Sarah Johnson',
      blood_group: 'O+',
      units_required: 2,
      urgency: 'high',
      match_score: 95,
      status: 'pending',
      matched_at: '2024-01-20T10:30:00Z',
      confirmed_at: null,
      completed_at: null,
      notes: ''
    },
    {
      id: 2,
      donor_name: 'Emily Davis',
      donor_email: 'emily.davis@email.com',
      donor_phone: '+91-9876543211',
      hospital_name: 'Metro Medical Center',
      hospital_city: 'Thiruvananthapuram',
      patient_name: 'Michael Brown',
      blood_group: 'A+',
      units_required: 1,
      urgency: 'medium',
      match_score: 88,
      status: 'accepted',
      matched_at: '2024-01-19T14:20:00Z',
      confirmed_at: '2024-01-19T16:45:00Z',
      completed_at: null,
      notes: 'Donor confirmed availability'
    },
    {
      id: 3,
      donor_name: 'Robert Wilson',
      donor_email: 'robert.wilson@email.com',
      donor_phone: '+91-9876543212',
      hospital_name: 'Regional Hospital',
      hospital_city: 'Kozhikode',
      patient_name: 'Lisa Anderson',
      blood_group: 'B+',
      units_required: 3,
      urgency: 'low',
      match_score: 92,
      status: 'completed',
      matched_at: '2024-01-18T09:15:00Z',
      confirmed_at: '2024-01-18T11:30:00Z',
      completed_at: '2024-01-19T08:00:00Z',
      notes: 'Donation completed successfully'
    },
    {
      id: 4,
      donor_name: 'Maria Garcia',
      donor_email: 'maria.garcia@email.com',
      donor_phone: '+91-9876543213',
      hospital_name: 'City General Hospital',
      hospital_city: 'Kochi',
      patient_name: 'David Lee',
      blood_group: 'AB+',
      units_required: 1,
      urgency: 'high',
      match_score: 76,
      status: 'declined',
      matched_at: '2024-01-17T13:45:00Z',
      confirmed_at: null,
      completed_at: null,
      notes: 'Donor unavailable due to travel'
    }
  ];

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const urgencyLevels = ['low', 'medium', 'high'];
  const statusOptions = ['pending', 'accepted', 'declined', 'completed', 'cancelled'];

  useEffect(() => {
    fetchMatches();
  }, [pagination.page, searchTerm, filters]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      // Simulate API call - use requestIdleCallback for better performance
      await new Promise(resolve => {
        if (window.requestIdleCallback) {
          requestIdleCallback(() => resolve(), { timeout: 1000 });
        } else {
          setTimeout(resolve, 1000);
        }
      });
      
      // Filter mock data based on search and filters
      let filteredMatches = [...mockMatches];
      
      if (searchTerm) {
        filteredMatches = filteredMatches.filter(match =>
          match.donor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          match.hospital_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          match.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (filters.status) {
        filteredMatches = filteredMatches.filter(match => match.status === filters.status);
      }
      
      if (filters.blood_group) {
        filteredMatches = filteredMatches.filter(match => match.blood_group === filters.blood_group);
      }
      
      if (filters.urgency) {
        filteredMatches = filteredMatches.filter(match => match.urgency === filters.urgency);
      }
      
      setMatches(filteredMatches);
      setPagination(prev => ({
        ...prev,
        total: filteredMatches.length,
        pages: Math.ceil(filteredMatches.length / prev.per_page)
      }));
    } catch (err) {
      setError('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ status: '', blood_group: '', urgency: '' });
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewDetails = (match) => {
    setSelectedMatch(match);
    setShowDetailsModal(true);
  };

  const handleStatusChange = (match, status) => {
    setSelectedMatch(match);
    setNewStatus(status);
    setStatusNotes('');
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    setActionLoading(true);
    try {
      // Simulate API call - use requestIdleCallback for better performance
      await new Promise(resolve => {
        if (window.requestIdleCallback) {
          requestIdleCallback(() => resolve(), { timeout: 1000 });
        } else {
          setTimeout(resolve, 1000);
        }
      });
      
      setMatches(prev => prev.map(match => 
        match.id === selectedMatch.id 
          ? { 
              ...match, 
              status: newStatus,
              confirmed_at: newStatus === 'accepted' ? new Date().toISOString() : match.confirmed_at,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : match.completed_at,
              notes: statusNotes
            }
          : match
      ));
      
      setShowStatusModal(false);
      setSelectedMatch(null);
      setNewStatus('');
      setStatusNotes('');
    } catch (err) {
      setError('Failed to update match status');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'orange', icon: Clock, label: 'Pending' },
      accepted: { color: 'green', icon: CheckCircle, label: 'Accepted' },
      declined: { color: 'red', icon: XCircle, label: 'Declined' },
      completed: { color: 'blue', icon: Check, label: 'Completed' },
      cancelled: { color: 'gray', icon: X, label: 'Cancelled' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`status-badge ${config.color}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const urgencyConfig = {
      low: { color: 'green', label: 'Low' },
      medium: { color: 'orange', label: 'Medium' },
      high: { color: 'red', label: 'High' }
    };
    
    const config = urgencyConfig[urgency] || urgencyConfig.medium;
    
    return (
      <span className={`urgency-badge ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getMatchScoreColor = (score) => {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    return 'poor';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && matches.length === 0) {
    return (
      <div className="blood-matching-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading blood matches...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="blood-matching">
      {/* Header */}
      <div className="matching-header">
        <div className="header-content">
          <div className="header-title">
            <Heart size={28} />
            <h1>Blood Matching</h1>
          </div>
          <div className="header-actions">
            <button className="btn-secondary">
              <Download size={16} />
              Export
            </button>
            <button className="btn-primary" onClick={fetchMatches}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="matching-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{pagination.total}</div>
            <div className="stat-label">Total Matches</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {matches.filter(m => m.status === 'pending').length}
            </div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon accepted">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {matches.filter(m => m.status === 'accepted').length}
            </div>
            <div className="stat-label">Accepted</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon completed">
            <Check size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {matches.filter(m => m.status === 'completed').length}
            </div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="matching-controls">
        <div className="search-section">
          <div className="search-input">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by donor, hospital, or patient name..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="filters-section">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Blood Group</label>
            <select
              value={filters.blood_group}
              onChange={(e) => handleFilterChange('blood_group', e.target.value)}
            >
              <option value="">All Blood Groups</option>
              {bloodGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Urgency</label>
            <select
              value={filters.urgency}
              onChange={(e) => handleFilterChange('urgency', e.target.value)}
            >
              <option value="">All Urgency</option>
              {urgencyLevels.map(level => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <button className="clear-filters" onClick={clearFilters}>
            <RefreshCw size={16} />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Matches Table */}
      <div className="matches-table-container">
        <div className="table-header">
          <div className="table-title">
            <span>Blood Matches</span>
            <span className="table-count">({pagination.total} matches)</span>
          </div>
        </div>
        
        <div className="table-wrapper">
          <table className="matches-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Hospital</th>
                <th>Patient</th>
                <th>Blood Group</th>
                <th>Match Score</th>
                <th>Status</th>
                <th>Urgency</th>
                <th>Matched Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id}>
                  <td>
                    <div className="donor-info">
                      <div className="donor-avatar">
                        {match.donor_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="donor-details">
                        <div className="donor-name">{match.donor_name}</div>
                        <div className="donor-contact">
                          <Mail size={12} />
                          {match.donor_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="hospital-info">
                      <div className="hospital-name">{match.hospital_name}</div>
                      <div className="hospital-location">
                        <MapPin size={12} />
                        {match.hospital_city}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="patient-info">
                      <div className="patient-name">{match.patient_name}</div>
                      <div className="units-required">{match.units_required} units</div>
                    </div>
                  </td>
                  <td>
                    <div className="blood-group">
                      <Droplets size={16} />
                      {match.blood_group}
                    </div>
                  </td>
                  <td>
                    <div className={`match-score ${getMatchScoreColor(match.match_score)}`}>
                      <div className="score-value">{match.match_score}%</div>
                      <div className="score-bar">
                        <div 
                          className="score-fill" 
                          style={{ width: `${match.match_score}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>{getStatusBadge(match.status)}</td>
                  <td>{getUrgencyBadge(match.urgency)}</td>
                  <td>
                    <div className="matched-date">
                      <Calendar size={14} />
                      {formatDate(match.matched_at)}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        aria-label="View Details"
                        className="action-btn view"
                        onClick={() => handleViewDetails(match)}
                        title="View Details"
                      >
                        {/* use icon class so sizing/stroke can be controlled by CSS for consistent look */}
                        <Eye className="icon view-icon" aria-hidden="true" />
                      </button>
                      {match.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            aria-label="Accept Match"
                            className="action-btn accept"
                            onClick={() => handleStatusChange(match, 'accepted')}
                            title="Accept Match"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label="Decline Match"
                            className="action-btn decline"
                            onClick={() => handleStatusChange(match, 'declined')}
                            title="Decline Match"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      {match.status === 'accepted' && (
                        <button
                          type="button"
                          aria-label="Mark as Completed"
                          className="action-btn complete"
                          onClick={() => handleStatusChange(match, 'completed')}
                          title="Mark as Completed"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <div className="pagination-info">
            Page {pagination.page} of {pagination.pages}
          </div>
          
          <button 
            className="pagination-btn"
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Update Match Status</h3>
            </div>
            <div className="modal-body">
              <div className="status-change-info">
                <p><strong>Donor:</strong> {selectedMatch?.donor_name}</p>
                <p><strong>Hospital:</strong> {selectedMatch?.hospital_name}</p>
                <p><strong>Patient:</strong> {selectedMatch?.patient_name}</p>
                <p><strong>New Status:</strong> {newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</p>
              </div>
              
              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add any notes about this status change..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowStatusModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={confirmStatusChange}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h3>Match Details</h3>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-section">
                  <h4>Donor Information</h4>
                  <div className="detail-item">
                    <strong>Name:</strong> {selectedMatch?.donor_name}
                  </div>
                  <div className="detail-item">
                    <strong>Email:</strong> {selectedMatch?.donor_email}
                  </div>
                  <div className="detail-item">
                    <strong>Phone:</strong> {selectedMatch?.donor_phone}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Hospital Information</h4>
                  <div className="detail-item">
                    <strong>Name:</strong> {selectedMatch?.hospital_name}
                  </div>
                  <div className="detail-item">
                    <strong>City:</strong> {selectedMatch?.hospital_city}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Patient Information</h4>
                  <div className="detail-item">
                    <strong>Name:</strong> {selectedMatch?.patient_name}
                  </div>
                  <div className="detail-item">
                    <strong>Blood Group:</strong> {selectedMatch?.blood_group}
                  </div>
                  <div className="detail-item">
                    <strong>Units Required:</strong> {selectedMatch?.units_required}
                  </div>
                  <div className="detail-item">
                    <strong>Urgency:</strong> {getUrgencyBadge(selectedMatch?.urgency)}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Match Information</h4>
                  <div className="detail-item">
                    <strong>Match Score:</strong> 
                    <span className={`match-score-badge ${getMatchScoreColor(selectedMatch?.match_score)}`}>
                      {selectedMatch?.match_score}%
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong> {getStatusBadge(selectedMatch?.status)}
                  </div>
                  <div className="detail-item">
                    <strong>Matched At:</strong> {formatDate(selectedMatch?.matched_at)}
                  </div>
                  {selectedMatch?.confirmed_at && (
                    <div className="detail-item">
                      <strong>Confirmed At:</strong> {formatDate(selectedMatch?.confirmed_at)}
                    </div>
                  )}
                  {selectedMatch?.completed_at && (
                    <div className="detail-item">
                      <strong>Completed At:</strong> {formatDate(selectedMatch?.completed_at)}
                    </div>
                  )}
                  {selectedMatch?.notes && (
                    <div className="detail-item">
                      <strong>Notes:</strong> {selectedMatch?.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BloodMatching = () => {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <BloodMatchingContent />
      </DashboardLayout>
    </ThemeProvider>
  );
};

export default BloodMatching;
