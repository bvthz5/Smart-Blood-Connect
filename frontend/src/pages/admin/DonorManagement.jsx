import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import {
  Search,
  Filter,
  Plus,
  Shield,
  ShieldOff,
  Users,
  Droplets,
  MapPin,
  Calendar,
  Phone,
  Mail,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw
} from 'lucide-react';
import ViewIcon from '../../assets/icons/view.svg';
import EditIcon from '../../assets/icons/edit.svg';
import DeleteIcon from '../../assets/icons/delete.svg';
import BlockIcon from '../../assets/icons/block.svg';
import UnblockIcon from '../../assets/icons/unblock.svg';
import donorManagementService from '../../services/donorManagementService';
import './DonorManagement.css';

const DonorManagementContent = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    blood_group: '',
    status: '',
    availability: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    pages: 0
  });
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    active: 0,
    blocked: 0
  });
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Mock data for development
  const mockDonors = [
    {
      id: 1,
      donor_id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+91-9876543210',
      blood_group: 'O+',
      gender: 'Male',
      date_of_birth: '1990-05-15',
      is_available: true,
      last_donation_date: '2024-01-15',
      reliability_score: 85.5,
      status: 'active',
      city: 'Kochi',
      district: 'Ernakulam',
      created_at: '2023-06-15T10:30:00Z',
      last_login: '2024-01-20T14:25:00Z'
    },
    {
      id: 2,
      donor_id: 2,
      name: 'Sarah Wilson',
      email: 'sarah.wilson@example.com',
      phone: '+91-9876543211',
      blood_group: 'A+',
      gender: 'Female',
      date_of_birth: '1988-12-03',
      is_available: false,
      last_donation_date: '2023-12-10',
      reliability_score: 92.0,
      status: 'active',
      city: 'Thiruvananthapuram',
      district: 'Thiruvananthapuram',
      created_at: '2023-05-20T09:15:00Z',
      last_login: '2024-01-18T11:45:00Z'
    },
    {
      id: 3,
      donor_id: 3,
      name: 'Michael Chen',
      email: 'michael.chen@example.com',
      phone: '+91-9876543212',
      blood_group: 'B+',
      gender: 'Male',
      date_of_birth: '1992-08-22',
      is_available: true,
      last_donation_date: null,
      reliability_score: 78.5,
      status: 'blocked',
      city: 'Kozhikode',
      district: 'Kozhikode',
      created_at: '2023-08-10T16:20:00Z',
      last_login: '2024-01-10T08:30:00Z'
    }
  ];

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const statusOptions = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'inactive', label: 'Inactive', color: 'gray' },
    { value: 'blocked', label: 'Blocked', color: 'red' },
    { value: 'deleted', label: 'Deleted', color: 'red' }
  ];

  useEffect(() => {
    fetchDonors();
  }, [pagination.page, searchTerm, filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const statsData = await donorManagementService.getDonorStats();
      setStats({
        total: statsData.total || 0,
        available: statsData.available || 0,
        active: statsData.active || 0,
        blocked: statsData.blocked || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      // Keep stats at 0 if fetch fails
    }
  };

  const fetchDonors = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        search: searchTerm,
        blood_group: filters.blood_group,
        status: filters.status,
        availability: filters.availability,
        page: pagination.page,
        per_page: pagination.per_page
      };
      
      const response = await donorManagementService.getDonors(params);
      
      setDonors(response.donors || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
        pages: response.pages || 0
      }));
      
    } catch (err) {
      // Extract error message from backend response
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to fetch donors. Please try again.';
      setError(errorMessage);
      console.error('Error fetching donors:', err);
      // On error, clear data to reflect no records and reset counts
      setDonors([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        pages: 0
      }));
      // Don't reset stats on error to maintain layout
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
    setFilters({ blood_group: '', status: '', availability: '' });
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
    setError(null);
  };

  const handleEdit = (donor) => {
    navigate(`/admin/donors/edit/${donor.donor_id}`);
  };

  const handleDelete = (donor) => {
    setSelectedDonor(donor);
    setShowDeleteModal(true);
  };

  const handleBlock = (donor) => {
    setSelectedDonor(donor);
    setShowBlockModal(true);
  };

  const handleView = (donor) => {
    // Navigate to donor details page
    navigate(`/admin/donors/${donor.donor_id}`);
  };

  const confirmDelete = async () => {
    setActionLoading(true);
    try {
      await donorManagementService.deleteDonor(selectedDonor.donor_id);
      setShowDeleteModal(false);
      setSelectedDonor(null);
      // Refresh the donors list and stats
      await fetchDonors();
      await fetchStats();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete donor';
      setError(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmBlock = async () => {
    setActionLoading(true);
    try {
      const action = selectedDonor.status === 'blocked' ? 'unblock' : 'block';
      await donorManagementService.blockDonor(selectedDonor.donor_id, action);
      setShowBlockModal(false);
      setSelectedDonor(null);
      // Refresh the donors list and stats
      await fetchDonors();
      await fetchStats();
    } catch (err) {
      const errorMsg = err.response?.data?.message || `Failed to ${selectedDonor.status === 'blocked' ? 'unblock' : 'block'} donor`;
      setError(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(opt => opt.value === status);
    return (
      <span className={`status-badge status-${statusConfig?.color || 'gray'}`}>
        {statusConfig?.label || status}
      </span>
    );
  };

  const getAvailabilityBadge = (isAvailable) => (
    <span className={`availability-badge ${isAvailable ? 'available' : 'unavailable'}`}>
      {isAvailable ? 'Available' : 'Unavailable'}
    </span>
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading && donors.length === 0) {
    return (
      <div className="donor-management-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading donors...</div>
        </div>
      </div>
    );
  }

  const exportCsv = async () => {
    try {
      // Export all filtered donors (not just current page)
      const params = {
        search: searchTerm,
        blood_group: filters.blood_group,
        status: filters.status,
        availability: filters.availability
      };
      
      // Get all donors with current filters (no pagination)
      const allDonorsParams = { ...params, per_page: 10000 }; // Large number to get all
      const response = await donorManagementService.getDonors(allDonorsParams);
      const allDonors = response.donors || [];
      
      // Generate CSV
      const headers = ['ID','Name','Email','Phone','Blood Group','Gender','Status','Available','City','District','Last Donation','Reliability Score','Created At'];
      const rows = allDonors.map(d => [
        d.id,
        d.name,
        d.email,
        d.phone,
        d.blood_group,
        d.gender || '',
        d.status,
        d.is_available ? 'Yes' : 'No',
        d.city || '',
        d.district || '',
        d.last_donation_date || 'Never',
        d.reliability_score || '0',
        d.created_at ? new Date(d.created_at).toLocaleDateString() : ''
      ]);
      
      const csv = [headers, ...rows].map(r => 
        r.map(x => (`${x}`.includes(',') || `${x}`.includes('"') ? `"${(`${x}`).replaceAll('"','""')}"` : `${x}`)).join(',')
      ).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `donors_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMsg = 'Failed to export donors. Please try again.';
      setError(errorMsg);
      console.error('Export error:', err);
    }
  };

  // Using server-side pagination; donors already represent the current page

  return (
    <div className="donor-management">
      {/* Header */}
      <div className="donor-header">
        <div className="header-content">
          <div className="header-title">
            <Users size={28} />
            <h1>Donor Management</h1>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={exportCsv}>
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="donor-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Donors</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon available">
            <Droplets size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.available}</div>
            <div className="stat-label">Available</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <Shield size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blocked">
            <ShieldOff size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.blocked}</div>
            <div className="stat-label">Blocked</div>
          </div>
        </div>
      </div>

      {/* Filters moved near table */}

      {/* Donors Table */}
      <div className="donor-table-container">
        <div className="table-header">
          <div className="table-title">
            <span>Donors List</span>
            <span className="table-count">({pagination.total} donors)</span>
          </div>
          <div className="search-input" style={{ maxWidth: 360 }}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search donors by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            color: '#991b1b',
            background: 'rgba(239,68,68,0.08)',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)'
          }}>
            {error}
          </div>
        )}

        <div className="filters-inline">
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
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Availability</label>
              <select
                value={filters.availability}
                onChange={(e) => handleFilterChange('availability', e.target.value)}
              >
                <option value="">All</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            
            <button className="clear-filters" onClick={clearFilters}>
              <RefreshCw size={16} />
              Clear Filters
            </button>
          </div>
        </div>
        
        <div className="table-wrapper">
          <table className="donor-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Blood Group</th>
                <th>Status</th>
                <th>Availability</th>
                <th>Last Donation</th>
                <th>Reliability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {donors.length === 0 && !loading && (
                <tr className="empty-state-row">
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-textSecondary)' }}>
                    <div style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      No records found
                    </div>
                    {(searchTerm || filters.blood_group || filters.status || filters.availability) && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-textSecondary)', opacity: 0.8 }}>
                        Try adjusting your search or filters
                      </div>
                    )}
                  </td>
                </tr>
              )}
              {donors.map((donor) => (
                <tr key={donor.id}>
                  <td>
                    <div className="donor-info">
                      <div className="donor-avatar">
                        {donor.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="donor-details">
                        <div className="donor-name">{donor.name}</div>
                        <div className="donor-location">
                          <MapPin size={12} />
                          {donor.city}, {donor.district}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="blood-group">
                      <Droplets size={16} />
                      {donor.blood_group}
                    </div>
                  </td>
                  <td>{getStatusBadge(donor.status)}</td>
                  <td>{getAvailabilityBadge(donor.is_available)}</td>
                  <td>
                    <div className="last-donation">
                      <Calendar size={14} />
                      {formatDate(donor.last_donation_date)}
                    </div>
                  </td>
                  <td>
                    <div className="reliability-score">
                      <div className="score-value">{donor.reliability_score}%</div>
                      <div className="score-bar">
                        <div 
                          className="score-fill" 
                          style={{ width: `${donor.reliability_score}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn icon-only view"
                        onClick={() => handleView(donor)}
                        title="View Details"
                      >
                        <img src={ViewIcon} alt="View" />
                        <span className="sr-only">View</span>
                      </button>
                      {donor.status !== 'deleted' && (
                        <>
                          <button 
                            className="action-btn icon-only edit"
                            onClick={() => handleEdit(donor)}
                            title="Edit Donor"
                          >
                            <img src={EditIcon} alt="Edit" />
                          </button>
                          <button 
                            className={`action-btn icon-only ${donor.status === 'blocked' ? 'unblock' : 'block'}`}
                            onClick={() => handleBlock(donor)}
                            title={donor.status === 'blocked' ? 'Unblock Donor' : 'Block Donor'}
                          >
                            <img 
                              src={donor.status === 'blocked' ? UnblockIcon : BlockIcon} 
                              alt={donor.status === 'blocked' ? 'Unblock' : 'Block'} 
                            />
                          </button>
                          <button 
                            className="action-btn icon-only delete"
                            onClick={() => handleDelete(donor)}
                            title="Delete Donor"
                          >
                            <img src={DeleteIcon} alt="Delete" />
                          </button>
                        </>
                      )}
                      {donor.status === 'deleted' && (
                        <span className="deleted-badge" title={`Deleted on ${donor.deleted_at ? new Date(donor.deleted_at).toLocaleDateString() : 'N/A'}`}>
                          🗑️ Deleted
                        </span>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete Donor</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{selectedDonor?.name}</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={confirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Confirmation Modal */}
      {showBlockModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{selectedDonor?.status === 'blocked' ? 'Unblock' : 'Block'} Donor</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to {selectedDonor?.status === 'blocked' ? 'unblock' : 'block'} <strong>{selectedDonor?.name}</strong>?</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowBlockModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className={selectedDonor?.status === 'blocked' ? 'btn-success' : 'btn-warning'}
                onClick={confirmBlock}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : (selectedDonor?.status === 'blocked' ? 'Unblock' : 'Block')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DonorManagement = () => {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <DonorManagementContent />
      </DashboardLayout>
    </ThemeProvider>
  );
};

export default DonorManagement;
