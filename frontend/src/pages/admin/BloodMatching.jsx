import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import DashboardLayout from '../../components/admin/DashboardLayout';
import bloodMatchingService from '../../services/bloodMatchingService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
  Loader,
  CheckSquare,
  XSquare,
  FileText,
  UserCheck,
  UserX,
  BarChart2,
  ArrowUpDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
//import { Tooltip } from 'react-tooltip';
//import 'react-tooltip/dist/react-tooltip.css';
import './BloodMatching.css';

const BloodMatchingContent = () => {
  const { theme } = useTheme();
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
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
  const [socket, setSocket] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Blood groups, urgency levels, and status options for filters
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const urgencyLevels = ['low', 'medium', 'high'];
  const statusOptions = ['pending', 'accepted', 'declined', 'completed', 'cancelled'];

  // Sort configuration
  const [sortConfig, setSortConfig] = useState({
    key: 'match_score',
    direction: 'desc'
  });

  // Memoized match score calculation
  const calculateMatchScore = useCallback((match) => {
    // This is a fallback calculation if the backend doesn't provide a score
    // The actual score should come from the backend's ML model
    if (match.match_score !== undefined) {
      return match.match_score;
    }
    
    // Fallback calculation (should be removed once backend integration is complete)
    let score = 0;
    if (match.blood_group_compatibility) score += 30;
    if (match.distance_km < 50) score += 25;
    if (match.urgency === 'high') score += 20;
    if (match.donor_availability) score += 15;
    if (match.donor_reliability > 0.7) score += 10;
    return Math.min(100, Math.max(0, score));
  }, []);

  // Sort matches based on sort configuration
  const sortedMatches = useCallback(() => {
    if (!matches.length) return [];

    return [...matches].sort((a, b) => {
      let aValue, bValue;

      // Handle different sort keys
      switch (sortConfig.key) {
        case 'match_score':
          aValue = calculateMatchScore(a);
          bValue = calculateMatchScore(b);
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'urgency':
          const urgencyOrder = { high: 3, medium: 2, low: 1 };
          aValue = urgencyOrder[a.urgency] || 0;
          bValue = urgencyOrder[b.urgency] || 0;
          break;
        default:
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
      }

      // Handle comparison based on type
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [matches, sortConfig, calculateMatchScore]);

  // Handle sort request
  const requestSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Render sort indicator
  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // Initialize WebSocket connection with Socket.IO
  const initializeWebSocket = useCallback(() => {
    try {
      // Import socket.io-client dynamically to avoid SSR issues
      const io = require('socket.io-client');
      
      if (socket) {
        socket.disconnect();
      }
      
      // Create a new Socket.IO connection
      const socketIo = io({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      
      // Connection established
      socketIo.on('connect', () => {
        console.log('Socket.IO Connected');
        reconnectAttempts.current = 0;
        
        // Subscribe to match updates
        socketIo.emit('subscribe_to_matches', { user_id: 'admin' });
      });
      
      // Handle match updates
      socketIo.on('match_updated', (data) => {
        console.log('Match update received:', data);
        
        if (data.match) {
          // Update the specific match in the list
          setMatches(prevMatches => 
            prevMatches.map(match => 
              match.id === data.match.id ? { ...match, ...data.match } : match
            )
          );
          
          // If the updated match is currently selected, update it
          if (selectedMatch && selectedMatch.id === data.match.id) {
            setSelectedMatch(prev => ({ ...prev, ...data.match }));
          }
          
          // Show a toast notification
          toast.info(`Match ${data.match.id} status updated to ${data.match.status}`);
          
          // Refresh stats
          fetchStats();
        }
      });
      
      // Handle errors
      socketIo.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        
        // Attempt to reconnect with exponential backoff
        const attempts = reconnectAttempts.current + 1;
        reconnectAttempts.current = attempts;
        
        if (attempts <= 5) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Max 30s delay
          console.log(`Reconnection attempt ${attempts} in ${delay}ms`);
          
          setTimeout(() => {
            if (socketIo && !socketIo.connected) {
              socketIo.connect();
            }
          }, delay);
        }
      });
      
      // Handle disconnection
      socketIo.on('disconnect', (reason) => {
        console.log('Socket.IO Disconnected:', reason);
        
        if (reason === 'io server disconnect') {
          // The server has forcibly disconnected the socket, try to reconnect
          socketIo.connect();
        }
      });
      
      // Store the socket instance in state
      setSocket(socketIo);
      
      // Cleanup function
      return () => {
        if (socketIo) {
          socketIo.disconnect();
        }
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }, [selectedMatch]);

  useEffect(() => {
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Initial data fetch
    const loadInitialData = async () => {
      try {
        await Promise.all([fetchStats(), fetchMatches()]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError('Failed to load initial data. Please refresh the page.');
      }
    };
    
    loadInitialData();
    
    // Cleanup WebSocket on unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // Handle pagination, search, and filter changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchMatches();
      } catch (error) {
        console.error('Error fetching matches:', error);
        setError('Failed to fetch matches. Please try again.');
      }
    };
    
    // Debounce the fetch to avoid too many requests
    const debounceTimer = setTimeout(fetchData, 300);
    return () => clearTimeout(debounceTimer);
  }, [pagination.page, searchTerm, filters, sortConfig]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await bloodMatchingService.getMatchStats();
      if (response) {
        setStats({
          total: response.total || 0,
          pending: response.pending || 0,
          accepted: response.accepted || 0,
          completed: response.completed || 0
        });
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      toast.error('Failed to load match statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        search: searchTerm,
        status: filters.status,
        blood_group: filters.blood_group,
        urgency: filters.urgency,
        page: pagination.page,
        per_page: pagination.per_page,
        sort_by: sortConfig.key,
        sort_order: sortConfig.direction
      };

      const response = await bloodMatchingService.getMatches(params);

      if (!response || !response.matches) {
        throw new Error('Invalid response format from server');
      }

      // The API returns data in the format { matches: [...], pagination: { total, page, pages, per_page } }
      if (!response || !response.matches) {
        throw new Error('Invalid response from server');
      }

      setMatches(response.matches);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
        pages: response.pages || 1
      }));
      setError(null); // Clear any existing errors

    } catch (err) {
      console.error('Error fetching matches:', err);
      let errorMessage = 'Failed to fetch matches. Please check your connection and try again.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        // Handle logout/redirect if needed
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to access this resource.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setMatches([]);
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

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      status: '',
      blood_group: '',
      urgency: ''
    });
    setSortConfig({
      key: 'match_score',
      direction: 'desc'
    });
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
    if (!selectedMatch) return;

    setActionLoading(true);

    try {
      // Call the API to update the match status
      await bloodMatchingService.updateMatchStatus(
        selectedMatch.id,
        newStatus,
        statusNotes
      );

      // Update the local state to reflect the change
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

      // Refresh stats
      fetchStats();

      // Show success message
      console.log(`Match ${selectedMatch.id} status updated to ${newStatus}`);

      // Close the modal and reset state
      setShowStatusModal(false);
      setSelectedMatch(null);
      setNewStatus('');
      setStatusNotes('');

    } catch (err) {
      console.error('Error updating match status:', err);
      setError(`Failed to update match status: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
      setNewStatus('');
      setStatusNotes('');
      setShowStatusModal(false);
      setSelectedMatch(null);
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

  const handleExport = async () => {
    try {
      // Show loading state
      const exportButton = document.querySelector('.btn-secondary');
      const originalContent = exportButton?.innerHTML;

      if (exportButton) {
        exportButton.disabled = true;
        exportButton.innerHTML = '<Loader className="animate-spin h-4 w-4 mr-2" /> Exporting...';
      }

      const response = await bloodMatchingService.exportMatches({
        search: searchTerm,
        status: filters.status,
        blood_group: filters.blood_group,
        urgency: filters.urgency
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `blood-matches-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Reset button state
      if (exportButton) {
        setTimeout(() => {
          exportButton.disabled = false;
          exportButton.innerHTML = originalContent;
        }, 500);
      }

    } catch (err) {
      console.error('Error exporting matches:', err);
      alert(`Failed to export matches: ${err.response?.data?.message || err.message || 'Please try again'}`);

      // Reset button on error
      const exportButton = document.querySelector('.btn-secondary');
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.innerHTML = '<Download className="h-4 w-4 mr-2" /> Export';
      }
    }
  };

  // Show loading state
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

  // Show error state
  if (error && !loading && matches.length === 0) {
    return (
      <div className="blood-matching-error">
        <div className="error-content">
          <AlertCircle size={32} />
          <div className="error-message">{error}</div>
          <button className="retry-button" onClick={fetchMatches}>
            <RefreshCw size={16} />
            Retry
          </button>
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
            <button className="btn-secondary" onClick={handleExport}>
              <Download size={16} />
              Export
            </button>
            <button className="btn-primary" onClick={() => { fetchStats(); fetchMatches(); }}>
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
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Matches</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {stats.pending}
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
              {stats.accepted}
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
              {stats.completed}
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

          <button className="clear-filters" onClick={resetFilters}>
            <RefreshCw size={16} />
            Reset
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
                <th onClick={() => requestSort('donor_name')}>
                  Donor {renderSortIndicator('donor_name')}
                </th>
                <th onClick={() => requestSort('hospital_name')}>
                  Hospital {renderSortIndicator('hospital_name')}
                </th>
                <th onClick={() => requestSort('patient_name')}>
                  Patient {renderSortIndicator('patient_name')}
                </th>
                <th onClick={() => requestSort('blood_group')}>
                  Blood Group {renderSortIndicator('blood_group')}
                </th>
                <th onClick={() => requestSort('match_score')}>
                  Match Score {renderSortIndicator('match_score')}
                </th>
                <th onClick={() => requestSort('status')}>
                  Status {renderSortIndicator('status')}
                </th>
                <th onClick={() => requestSort('urgency')}>
                  Urgency {renderSortIndicator('urgency')}
                </th>
                <th onClick={() => requestSort('matched_at')}>
                  Matched Date {renderSortIndicator('matched_at')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMatches().map((match) => (
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
                        title="View full details of this match"
                      >
                        <Eye className="icon" size={18} />
                      </button>
                      {match.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            aria-label="Accept Match"
                            className="action-btn accept"
                            onClick={() => handleStatusChange(match, 'accepted')}
                            title="Accept this match"
                          >
                            <Check className="icon" size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label="Decline Match"
                            className="action-btn decline"
                            onClick={() => handleStatusChange(match, 'declined')}
                            title="Decline this match"
                          >
                            <X className="icon" size={18} />
                          </button>
                        </>
                      )}
                      {match.status === 'accepted' && (
                        <button
                          type="button"
                          aria-label="Mark as Completed"
                          className="action-btn complete"
                          onClick={() => handleStatusChange(match, 'completed')}
                          title="Mark this match as completed"
                        >
                          <CheckSquare className="icon" size={18} />
                        </button>
                      )}
                      {match.status !== 'pending' && match.status !== 'accepted' && match.status !== 'completed' && (
                        <button
                          type="button"
                          aria-label="Delete Match"
                          className="action-btn delete"
                          onClick={() => handleStatusChange(match, 'cancelled')}
                          title="Cancel this match"
                        >
                          <XSquare className="icon" size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {matches.length === 0 && !loading && (
            <div className="no-matches">
              <div className="no-matches-icon">
                <Heart size={48} />
              </div>
              <h3>No matches found</h3>
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