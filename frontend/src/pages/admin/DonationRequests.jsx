import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import {
  Search,
  Filter,
  ClipboardList,
  Building2,
  Droplets,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Eye,
  UserPlus,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Users,
  Loader,
  Target,
  Trash2
} from 'lucide-react';
import { getAdminDonationRequests, getAdminRequestDetails, updateAdminRequestStatus } from '../../services/api';
import './DonationRequests.css';

const DonationRequestsContent = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    blood_group: '',
    hospital_id: '',
    urgency: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const urgencyLevels = ['low', 'medium', 'high', 'critical'];
  const statusOptions = ['pending', 'in_progress', 'completed', 'cancelled', 'closed'];

  useEffect(() => {
    fetchRequests();
  }, [pagination.page, searchTerm, filters]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        search: searchTerm,
        blood_group: filters.blood_group,
        hospital_id: filters.hospital_id,
        urgency: filters.urgency,
        status: filters.status,
        page: pagination.page,
        per_page: pagination.per_page
      };

      const response = await getAdminDonationRequests(params);
      
      if (response.data && response.data.requests) {
        setRequests(response.data.requests);
        setPagination(prev => ({
          ...prev,
          total: response.data.total || 0,
          pages: response.data.pages || 1
        }));
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err.message || 'Failed to fetch requests');
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
    setFilters({ blood_group: '', hospital_id: '', urgency: '', status: '' });
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewDetails = async (request) => {
    try {
      const response = await getAdminRequestDetails(request.id);
      setSelectedRequest(response.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching request details:', err);
      setError('Failed to fetch request details');
    }
  };

  const handleAssignDonor = (request) => {
    // Redirect to the Assign Donor page with the request ID
    navigate(`/admin/assign-donor/${request.id}`);
  };

  const handleDeleteRequest = (request) => {
    setSelectedRequest(request);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRequest = async () => {
    if (!selectedRequest) return;
    
    setActionLoading(true);
    try {
      // Update request status to cancelled instead of deleting
      await updateAdminRequestStatus(selectedRequest.id, 'cancelled');
      
      // Update local state
      setRequests(prev => prev.map(request => 
        request.id === selectedRequest.id 
          ? { ...request, status: 'cancelled', updated_at: new Date().toISOString() }
          : request
      ));
      
      setShowDeleteConfirm(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Error cancelling request:', err);
      setError('Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'orange', icon: Clock, label: 'Pending' },
      in_progress: { color: 'blue', icon: Target, label: 'In Progress' },
      completed: { color: 'green', icon: CheckCircle, label: 'Completed' },
      cancelled: { color: 'red', icon: XCircle, label: 'Cancelled' },
      closed: { color: 'gray', icon: X, label: 'Closed' }
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
      high: { color: 'red', label: 'High' },
      critical: { color: 'red', label: 'Critical' }
    };
    
    const config = urgencyConfig[urgency] || urgencyConfig.medium;
    
    return (
      <span className={`urgency-badge ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && requests.length === 0) {
    return (
      <div className="donation-requests-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading donation requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="donation-requests">
      {/* Header */}
      <div className="requests-header">
        <div className="header-content">
          <div className="header-title">
            <ClipboardList size={28} />
            <h1>Donation Requests</h1>
          </div>
          <div className="header-actions">
            <button className="btn-secondary">
              <Download size={16} />
              Export
            </button>
            <button className="btn-primary" onClick={fetchRequests}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="requests-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <ClipboardList size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{pagination.total}</div>
            <div className="stat-label">Total Requests</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon in-progress">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {requests.filter(r => r.status === 'in_progress').length}
            </div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon completed">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {requests.filter(r => r.status === 'completed').length}
            </div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="requests-controls">
        <div className="search-section">
          <div className="search-input">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by patient, hospital, or contact person..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="filters-section">
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
          
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
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

      {/* Requests Table */}
      <div className="requests-table-container">
        <div className="table-header">
          <div className="table-title">
            <span>Donation Requests</span>
            <span className="table-count">({pagination.total} requests)</span>
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        
        <div className="table-wrapper">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Patient</th>
                <th>Blood Group</th>
                <th>Units</th>
                <th>Urgency</th>
                <th>Status</th>
                <th>Matches</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="hospital-info">
                      <div className="hospital-avatar">
                        <Building2 size={20} />
                      </div>
                      <div className="hospital-details">
                        <div className="hospital-name">{request.hospital_name}</div>
                        <div className="hospital-location">
                          <MapPin size={12} />
                          {request.hospital_city}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="patient-info">
                      <div className="patient-name">{request.patient_name}</div>
                      <div className="contact-person">
                        <Phone size={12} />
                        {request.contact_person}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="blood-group">
                      <Droplets size={16} />
                      {request.blood_group}
                    </div>
                  </td>
                  <td>
                    <div className="units-required">
                      <span className="units-number">{request.units_required}</span>
                      <span className="units-label">units</span>
                    </div>
                  </td>
                  <td>{getUrgencyBadge(request.urgency)}</td>
                  <td>{getStatusBadge(request.status)}</td>
                  <td>
                    <div className="match-count">
                      <Users size={14} />
                      {request.match_count || 0}
                    </div>
                  </td>
                  <td>
                    <div className="created-date">
                      <Calendar size={14} />
                      {formatDate(request.created_at)}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn view"
                        onClick={() => handleViewDetails(request)}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {request.status === 'pending' && (
                        <button 
                          className="action-btn assign"
                          onClick={() => handleAssignDonor(request)}
                          title="Assign Donor"
                        >
                          <UserPlus size={16} />
                        </button>
                      )}
                      {(request.status === 'pending' || request.status === 'in_progress') && (
                        <button 
                          className="action-btn cancel"
                          onClick={() => handleDeleteRequest(request)}
                          title="Cancel Request"
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
                            <div className="loading-spinner"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {requests.length === 0 && !loading && (
            <div className="no-requests">
              <div className="no-requests-icon">
                <ClipboardList size={48} />
              </div>
              <h3>No requests found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          )}
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

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h3>Request Details</h3>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-section">
                  <h4>Hospital Information</h4>
                  <div className="detail-item">
                    <strong>Name:</strong> {selectedRequest.hospital_name}
                  </div>
                  <div className="detail-item">
                    <strong>City:</strong> {selectedRequest.hospital_city}
                  </div>
                  <div className="detail-item">
                    <strong>District:</strong> {selectedRequest.hospital_district}
                  </div>
                  <div className="detail-item">
                    <strong>Address:</strong> {selectedRequest.hospital_address}
                  </div>
                  <div className="detail-item">
                    <strong>Phone:</strong> {selectedRequest.hospital_phone}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Patient Information</h4>
                  <div className="detail-item">
                    <strong>Name:</strong> {selectedRequest.patient_name}
                  </div>
                  <div className="detail-item">
                    <strong>Blood Group:</strong> {selectedRequest.blood_group}
                  </div>
                  <div className="detail-item">
                    <strong>Units Required:</strong> {selectedRequest.units_required}
                  </div>
                  <div className="detail-item">
                    <strong>Urgency:</strong> {getUrgencyBadge(selectedRequest.urgency)}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Contact Information</h4>
                  <div className="detail-item">
                    <strong>Contact Person:</strong> {selectedRequest.contact_person}
                  </div>
                  <div className="detail-item">
                    <strong>Phone:</strong> {selectedRequest.contact_phone}
                  </div>
                  <div className="detail-item">
                    <strong>Required By:</strong> {formatDate(selectedRequest.required_by)}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Request Information</h4>
                  <div className="detail-item">
                    <strong>Status:</strong> {getStatusBadge(selectedRequest.status)}
                  </div>
                  <div className="detail-item">
                    <strong>Created At:</strong> {formatDate(selectedRequest.created_at)}
                  </div>
                  <div className="detail-item">
                    <strong>Updated At:</strong> {formatDate(selectedRequest.updated_at)}
                  </div>
                  <div className="detail-item">
                    <strong>Matches:</strong> {selectedRequest.match_count || 0}
                  </div>
                </div>
                
                {selectedRequest.description && (
                  <div className="detail-section full-width">
                    <h4>Description</h4>
                    <div className="detail-item">
                      {selectedRequest.description}
                    </div>
                  </div>
                )}
                
                {selectedRequest.matches && selectedRequest.matches.length > 0 && (
                  <div className="detail-section full-width">
                    <h4>Assigned Matches</h4>
                    <div className="matches-list">
                      {selectedRequest.matches.map((match) => (
                        <div key={match.id} className="match-item">
                          <div className="match-info">
                            <div className="donor-name">{match.donor_name}</div>
                            <div className="donor-contact">
                              <Mail size={12} /> {match.donor_email} | 
                              <Phone size={12} /> {match.donor_phone}
                            </div>
                          </div>
                          <div className="match-details">
                            <div className="blood-group">
                              <Droplets size={14} /> {match.donor_blood_group}
                            </div>
                            <div className="match-status">
                              {getStatusBadge(match.match_status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Cancel Request</h3>
            </div>
            <div className="modal-body">
              <div className="delete-confirm-content">
                <p>Are you sure you want to cancel this request?</p>
                <div className="request-summary">
                  <p><strong>Patient:</strong> {selectedRequest?.patient_name}</p>
                  <p><strong>Hospital:</strong> {selectedRequest?.hospital_name}</p>
                  <p><strong>Blood Group:</strong> {selectedRequest?.blood_group}</p>
                </div>
                <p className="warning-text">
                  This action will set the request status to "Cancelled". This cannot be undone.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={confirmDeleteRequest}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DonationRequests = () => {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <DonationRequestsContent />
      </DashboardLayout>
    </ThemeProvider>
  );
};

export default DonationRequests;