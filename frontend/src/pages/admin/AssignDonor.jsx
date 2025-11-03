import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  ArrowLeft,
  Droplets,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Building2,
  User,
  AlertTriangle,
  Search,
  Filter,
  Loader,
  UserPlus,
  Award,
  TrendingUp
} from 'lucide-react';
import { getAdminRequestDetails, getAvailableDonorsForRequest, assignDonorToRequest } from '../../services/api';
import './AssignDonor.css';

const AssignDonorContent = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [request, setRequest] = useState(null);
  const [donors, setDonors] = useState([]);
  const [filteredDonors, setFilteredDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEligibility, setFilterEligibility] = useState('all'); // all, eligible, ineligible
  const [filterDistance, setFilterDistance] = useState('all'); // all, near (0-20km), far (>20km)
  const [sortBy, setSortBy] = useState('distance'); // distance, donations, reliability
  const [assigningDonorId, setAssigningDonorId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [requestId]);

  useEffect(() => {
    applyFilters();
  }, [donors, searchTerm, filterEligibility, filterDistance, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requestResponse, donorsResponse] = await Promise.all([
        getAdminRequestDetails(requestId),
        getAvailableDonorsForRequest(requestId)
      ]);
      
      if (requestResponse && requestResponse.data) {
        setRequest(requestResponse.data);
      } else {
        throw new Error('Invalid request response');
      }
      
      if (donorsResponse && donorsResponse.data && donorsResponse.data.donors) {
        setDonors(donorsResponse.data.donors);
      } else {
        throw new Error('Invalid donors response');
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...donors];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(donor =>
        donor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donor.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donor.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Eligibility filter
    if (filterEligibility === 'eligible') {
      filtered = filtered.filter(donor => donor.is_eligible);
    } else if (filterEligibility === 'ineligible') {
      filtered = filtered.filter(donor => !donor.is_eligible);
    }
    
    // Distance filter
    if (filterDistance === 'near') {
      filtered = filtered.filter(donor => donor.distance_km && donor.distance_km <= 20);
    } else if (filterDistance === 'far') {
      filtered = filtered.filter(donor => donor.distance_km && donor.distance_km > 20);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'distance') {
        const distA = a.distance_km || 9999;
        const distB = b.distance_km || 9999;
        return distA - distB;
      } else if (sortBy === 'donations') {
        return (b.donation_count || 0) - (a.donation_count || 0);
      } else if (sortBy === 'reliability') {
        return (b.reliability_score || 0) - (a.reliability_score || 0);
      }
      return 0;
    });
    
    setFilteredDonors(filtered);
  };

  const handleAssignDonor = async (donorId) => {
    if (!window.confirm('Are you sure you want to assign this donor? They will be notified immediately.')) {
      return;
    }
    
    setAssigningDonorId(donorId);
    try {
      await assignDonorToRequest(requestId, donorId);
      toast.success('Donor assigned successfully! Notification sent.');
      setTimeout(() => {
        navigate('/admin/donation-requests');
      }, 2000);
    } catch (err) {
      console.error('Error assigning donor:', err);
      const errorMessage = err.response?.data?.error || 'Failed to assign donor';
      toast.error(errorMessage);
    } finally {
      setAssigningDonorId(null);
    }
  };

  const getEligibilityBadge = (donor) => {
    if (donor.is_eligible) {
      return (
        <span className="eligibility-badge eligible">
          <CheckCircle size={14} />
          Eligible
        </span>
      );
    }
    return (
      <span className="eligibility-badge ineligible">
        <XCircle size={14} />
        Not Eligible
      </span>
    );
  };

  if (loading) {
    return (
      <div className="assign-donor-loading">
        <div className="loading-content">
          <Loader className="loading-spinner" size={48} />
          <h2>Loading...</h2>
          <p>Fetching available donors and request details</p>
        </div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="assign-donor-error">
        <div className="error-content">
          <AlertTriangle size={48} color="#f44336" />
          <h3>Error</h3>
          <p>{error}</p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/admin/donation-requests')}
          >
            <ArrowLeft size={16} />
            Back to Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="assign-donor-page">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header */}
      <div className="assign-header">
        <div className="header-left">
          <button 
            className="btn-back"
            onClick={() => navigate('/admin/donation-requests')}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="header-title">
            <UserPlus size={28} />
            <h1>Assign Donor Manually</h1>
          </div>
        </div>
      </div>

      {/* Request Info Card */}
      {request && (
        <div className="request-info-card">
          <div className="card-header">
            <h2>Request Information</h2>
            <span className="urgency-badge" data-urgency={request.urgency}>
              {request.urgency?.toUpperCase()}
            </span>
          </div>
          <div className="card-grid">
            <div className="info-item">
              <User size={18} />
              <div>
                <label>Patient Name</label>
                <strong>{request.patient_name}</strong>
              </div>
            </div>
            <div className="info-item">
              <Droplets size={18} />
              <div>
                <label>Blood Group</label>
                <strong className="blood-group">{request.blood_group}</strong>
              </div>
            </div>
            <div className="info-item">
              <Activity size={18} />
              <div>
                <label>Units Required</label>
                <strong>{request.units_required}</strong>
              </div>
            </div>
            <div className="info-item">
              <Building2 size={18} />
              <div>
                <label>Hospital</label>
                <strong>{request.hospital_name || 'N/A'}</strong>
              </div>
            </div>
            <div className="info-item">
              <MapPin size={18} />
              <div>
                <label>Location</label>
                <strong>{request.hospital_city || 'N/A'}</strong>
              </div>
            </div>
            <div className="info-item">
              <Calendar size={18} />
              <div>
                <label>Required By</label>
                <strong>{request.required_by ? new Date(request.required_by).toLocaleDateString() : 'ASAP'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="donors-controls">
        <div className="search-section">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by name, district, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filters-section">
          <div className="filter-group">
            <label>Eligibility</label>
            <select value={filterEligibility} onChange={(e) => setFilterEligibility(e.target.value)}>
              <option value="all">All Donors</option>
              <option value="eligible">Eligible Only</option>
              <option value="ineligible">Not Eligible</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Distance</label>
            <select value={filterDistance} onChange={(e) => setFilterDistance(e.target.value)}>
              <option value="all">All Distances</option>
              <option value="near">Within 20 km</option>
              <option value="far">Beyond 20 km</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="distance">Distance (Near First)</option>
              <option value="donations">Donation Count</option>
              <option value="reliability">Reliability Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Donors Stats */}
      <div className="donors-stats">
        <div className="stat-item">
          <div className="stat-value">{filteredDonors.length}</div>
          <div className="stat-label">Available Donors</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{filteredDonors.filter(d => d.is_eligible).length}</div>
          <div className="stat-label">Eligible</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{filteredDonors.filter(d => d.distance_km && d.distance_km <= 20).length}</div>
          <div className="stat-label">Within 20km</div>
        </div>
      </div>

      {/* Donors List */}
      <div className="donors-list">
        {filteredDonors.length === 0 ? (
          <div className="no-donors">
            <User size={48} />
            <h3>No Donors Found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          filteredDonors.map((donor) => (
            <div key={donor.id} className="donor-card">
              <div className="donor-header">
                <div className="donor-basic-info">
                  <div className="donor-avatar">
                    <User size={24} />
                  </div>
                  <div className="donor-name-group">
                    <h3>{donor.name}</h3>
                    <div className="blood-group-badge">
                      <Droplets size={16} />
                      {donor.blood_group}
                    </div>
                  </div>
                </div>
                <div className="donor-badges">
                  {getEligibilityBadge(donor)}
                  {donor.distance_km && (
                    <span className="distance-badge">
                      <MapPin size={14} />
                      {donor.distance_km} km
                    </span>
                  )}
                </div>
              </div>

              <div className="donor-body">
                {/* Contact & Location */}
                <div className="donor-section">
                  <h4>Contact & Location</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <MapPin size={16} />
                      <span>{donor.city}, {donor.district}</span>
                    </div>
                    <div className="info-item">
                      <Phone size={16} />
                      <span>{donor.phone}</span>
                    </div>
                    {donor.email && (
                      <div className="info-item">
                        <Mail size={16} />
                        <span>{donor.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Eligibility Info */}
                <div className="donor-section">
                  <h4>Eligibility Status</h4>
                  <div className="eligibility-info">
                    <p className={donor.is_eligible ? 'eligible-text' : 'ineligible-text'}>
                      {donor.eligibility_reason}
                    </p>
                    {donor.days_since_donation !== null && (
                      <div className="info-item">
                        <Clock size={16} />
                        <span>Last donated {donor.days_since_donation} days ago</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Donation Stats */}
                <div className="donor-section">
                  <h4>Donation Statistics</h4>
                  <div className="stats-grid">
                    <div className="stat-box">
                      <TrendingUp size={20} />
                      <div>
                        <div className="stat-value">{donor.donation_count || 0}</div>
                        <div className="stat-label">Total Donations</div>
                      </div>
                    </div>
                    <div className="stat-box">
                      <Award size={20} />
                      <div>
                        <div className="stat-value">{(donor.reliability_score * 100).toFixed(0)}%</div>
                        <div className="stat-label">Reliability</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Donation History */}
                {donor.donation_history && donor.donation_history.length > 0 && (
                  <div className="donor-section">
                    <h4>Recent Donation History</h4>
                    <div className="history-list">
                      {donor.donation_history.map((history, idx) => (
                        <div key={idx} className="history-item">
                          <Calendar size={14} />
                          <span>{history.date}</span>
                          <Building2 size={14} />
                          <span>{history.hospital}</span>
                          <Activity size={14} />
                          <span>{history.units} units</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="donor-footer">
                <button
                  className={`btn-assign ${!donor.is_eligible ? 'btn-assign-warning' : ''}`}
                  onClick={() => handleAssignDonor(donor.id)}
                  disabled={assigningDonorId === donor.id}
                >
                  {assigningDonorId === donor.id ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      {donor.is_eligible ? 'Assign Donor' : 'Assign Anyway'}
                    </>
                  )}
                </button>
                {!donor.is_eligible && (
                  <span className="warning-text">
                    <AlertTriangle size={14} />
                    Donor may not be eligible - assign with caution
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AssignDonor = () => {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <AssignDonorContent />
      </DashboardLayout>
    </ThemeProvider>
  );
};

export default AssignDonor;
