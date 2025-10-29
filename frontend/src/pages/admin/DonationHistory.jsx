import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import {
  Search,
  Filter,
  Calendar,
  Building2,
  Droplets,
  User,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Eye,
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
  FileText,
  FileDown,
  ClipboardList
} from 'lucide-react';
import './DonationHistory.css';
import donationHistoryService from '../../services/donationHistoryService';

const DonationHistoryContent = () => {
  const { theme } = useTheme();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    donor_name: '',
    hospital_name: '',
    blood_group: '',
    date_from: '',
    date_to: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0
  });
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Mock data for demonstration
  const mockDonations = [
    {
      id: 1,
      donor: {
        id: 1,
        name: 'John Doe',
        phone: '+91 9876543210',
        email: 'john@example.com',
        blood_group: 'O+'
      },
      hospital: {
        id: 1,
        name: 'City General Hospital',
        address: '123 Main St, City',
        phone: '+91 1234567890'
      },
      units: 1,
      donation_date: '2024-01-15T10:30:00Z',
      status: 'completed',
      request_id: 101
    },
    {
      id: 2,
      donor: {
        id: 2,
        name: 'Jane Smith',
        phone: '+91 9876543211',
        email: 'jane@example.com',
        blood_group: 'A+'
      },
      hospital: {
        id: 2,
        name: 'Metro Medical Center',
        address: '456 Oak Ave, Metro',
        phone: '+91 1234567891'
      },
      units: 2,
      donation_date: '2024-01-14T14:20:00Z',
      status: 'completed',
      request_id: 102
    },
    {
      id: 3,
      donor: {
        id: 3,
        name: 'Mike Johnson',
        phone: '+91 9876543212',
        email: 'mike@example.com',
        blood_group: 'B+'
      },
      hospital: {
        id: 1,
        name: 'City General Hospital',
        address: '123 Main St, City',
        phone: '+91 1234567890'
      },
      units: 1,
      donation_date: '2024-01-13T09:15:00Z',
      status: 'completed',
      request_id: 103
    }
  ];

  // Load donations data
  useEffect(() => {
    loadDonations();
  }, [pagination.page, pagination.per_page, searchTerm, filters]);

  const loadDonations = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        search: searchTerm,
        ...filters
      };
      
      const response = await donationHistoryService.getDonationHistory(params);
      
      setDonations(response.donations || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
        pages: response.pages || 0
      }));
    } catch (err) {
      console.error('Error loading donations:', err);
      setError('Failed to load donation history');
      // Fallback to mock data for demonstration
      setDonations(mockDonations);
      setPagination(prev => ({
        ...prev,
        total: mockDonations.length,
        pages: Math.ceil(mockDonations.length / prev.per_page)
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      donor_name: '',
      hospital_name: '',
      blood_group: '',
      date_from: '',
      date_to: '',
      status: ''
    });
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePerPageChange = (newPerPage) => {
    setPagination(prev => ({ ...prev, per_page: newPerPage, page: 1 }));
  };

  const viewDonationDetails = (donation) => {
    setSelectedDonation(donation);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedDonation(null);
    setShowDetailsModal(false);
  };

  const exportToCSV = async () => {
    setExportLoading(true);
    try {
      const params = {
        search: searchTerm,
        ...filters
      };
      
      await donationHistoryService.exportToCSV(params);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPDF = async () => {
    setExportLoading(true);
    try {
      // Simulate PDF export - use requestIdleCallback for better performance
      await new Promise(resolve => {
        if (window.requestIdleCallback) {
          requestIdleCallback(() => resolve(), { timeout: 2000 });
        } else {
          setTimeout(resolve, 2000);
        }
      });
      alert('PDF export functionality would be implemented here');
    } catch (err) {
      setError('Failed to export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="status-icon completed" />;
      case 'pending':
        return <Clock className="status-icon pending" />;
      case 'cancelled':
        return <XCircle className="status-icon cancelled" />;
      default:
        return <AlertCircle className="status-icon unknown" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'var(--color-success)';
      case 'pending':
        return 'var(--color-warning)';
      case 'cancelled':
        return 'var(--color-error)';
      default:
        return 'var(--color-textSecondary)';
    }
  };

  if (loading && donations.length === 0) {
    return (
      <div className="donation-history">
        <div className="donation-history-loading">
          <div className="loading-content">
            <Loader className="loading-spinner" />
            <p className="loading-text">Loading donation history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="donation-history">
      {/* Header */}
      <div className="history-header">
        <div className="header-content">
          <div className="header-title">
            <Calendar className="header-icon" />
            <div>
              <h1>Donation History</h1>
              <p>Record of successful blood donations</p>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setLoading(true);
                loadDonations().then(() => setLoading(false));
              }}
              disabled={loading}
            >
              <RefreshCw className={`icon ${loading ? 'spinning' : ''}`} />
              Refresh
            </button>
            <button 
              className="btn btn-primary"
              onClick={exportToCSV}
              disabled={exportLoading}
            >
              <FileDown className="icon" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by donor name or hospital..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <button 
          className="btn btn-outline filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="icon" />
          Filters
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="advanced-filters">
          <div className="filter-grid">
            <div className="filter-group">
              <label>Donor Name</label>
              <input
                type="text"
                placeholder="Filter by donor name"
                value={filters.donor_name}
                onChange={(e) => handleFilterChange('donor_name', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Hospital</label>
              <input
                type="text"
                placeholder="Filter by hospital name"
                value={filters.hospital_name}
                onChange={(e) => handleFilterChange('hospital_name', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Blood Group</label>
              <select
                value={filters.blood_group}
                onChange={(e) => handleFilterChange('blood_group', e.target.value)}
              >
                <option value="">All Blood Groups</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Date From</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Date To</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>
          </div>
          <div className="filter-actions">
            <button className="btn btn-outline" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="results-summary">
        <p>
          Showing {donations.length} of {pagination.total} donations
        </p>
        <div className="per-page-selector">
          <label>Per page:</label>
          <select
            value={pagination.per_page}
            onChange={(e) => handlePerPageChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Donations Table */}
      <div className="donations-table-container">
        <table className="donations-table">
          <thead>
            <tr>
              <th>Donor</th>
              <th>Hospital</th>
              <th>Blood Group</th>
              <th>Units</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((donation) => (
              <tr key={donation.id}>
                <td>
                  <div className="donor-info">
                    <User className="donor-icon" />
                    <div>
                      <div className="donor-name">{donation.donor.name}</div>
                      <div className="donor-contact">{donation.donor.phone}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="hospital-info">
                    <Building2 className="hospital-icon" />
                    <div>
                      <div className="hospital-name">{donation.hospital.name}</div>
                      <div className="hospital-address">{donation.hospital.address}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="blood-group">
                    <Droplets className="blood-icon" />
                    <span>{donation.donor.blood_group}</span>
                  </div>
                </td>
                <td>
                  <div className="units">
                    <Target className="units-icon" />
                    <span>{donation.units}</span>
                  </div>
                </td>
                <td>
                  <div className="donation-date">
                    <Calendar className="date-icon" />
                    <span>{new Date(donation.donation_date).toLocaleDateString()}</span>
                  </div>
                </td>
                <td>
                  <div className="status" style={{ color: getStatusColor(donation.status) }}>
                    {getStatusIcon(donation.status)}
                    <span className="status-text">{donation.status}</span>
                  </div>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => viewDonationDetails(donation)}
                  >
                    <Eye className="icon" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-outline"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="icon" />
            Previous
          </button>
          
          <div className="pagination-info">
            Page {pagination.page} of {pagination.pages}
          </div>
          
          <button
            className="btn btn-outline"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            Next
            <ChevronRight className="icon" />
          </button>
        </div>
      )}

      {/* Donation Details Modal */}
      {showDetailsModal && selectedDonation && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Donation Details</h2>
              <button className="modal-close" onClick={closeDetailsModal}>
                <X className="icon" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-section">
                  <h3>Donor Information</h3>
                  <div className="detail-item">
                    <User className="detail-icon" />
                    <div>
                      <strong>Name:</strong> {selectedDonation.donor.name}
                    </div>
                  </div>
                  <div className="detail-item">
                    <Phone className="detail-icon" />
                    <div>
                      <strong>Phone:</strong> {selectedDonation.donor.phone}
                    </div>
                  </div>
                  <div className="detail-item">
                    <Mail className="detail-icon" />
                    <div>
                      <strong>Email:</strong> {selectedDonation.donor.email}
                    </div>
                  </div>
                  <div className="detail-item">
                    <Droplets className="detail-icon" />
                    <div>
                      <strong>Blood Group:</strong> {selectedDonation.donor.blood_group}
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Hospital Information</h3>
                  <div className="detail-item">
                    <Building2 className="detail-icon" />
                    <div>
                      <strong>Name:</strong> {selectedDonation.hospital.name}
                    </div>
                  </div>
                  <div className="detail-item">
                    <MapPin className="detail-icon" />
                    <div>
                      <strong>Address:</strong> {selectedDonation.hospital.address}
                    </div>
                  </div>
                  <div className="detail-item">
                    <Phone className="detail-icon" />
                    <div>
                      <strong>Phone:</strong> {selectedDonation.hospital.phone}
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Donation Details</h3>
                  <div className="detail-item">
                    <Target className="detail-icon" />
                    <div>
                      <strong>Units:</strong> {selectedDonation.units}
                    </div>
                  </div>
                  <div className="detail-item">
                    <Calendar className="detail-icon" />
                    <div>
                      <strong>Date:</strong> {new Date(selectedDonation.donation_date).toLocaleString()}
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="status" style={{ color: getStatusColor(selectedDonation.status) }}>
                      {getStatusIcon(selectedDonation.status)}
                      <strong>Status:</strong> {selectedDonation.status}
                    </div>
                  </div>
                  <div className="detail-item">
                    <ClipboardList className="detail-icon" />
                    <div>
                      <strong>Request ID:</strong> #{selectedDonation.request_id}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DonationHistory = () => {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <DonationHistoryContent />
      </DashboardLayout>
    </ThemeProvider>
  );
};

export default DonationHistory;
