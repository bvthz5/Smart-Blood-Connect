import React, { useState, useMemo, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './ActivityTable.css';

const ActivityTable = ({ 
  onRowClick,
  className = '' 
}) => {
  const [sortField, setSortField] = useState('time');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    pages: 0,
    has_next: false,
    has_prev: false
  });

  // Use fetched data
  const tableData = data;

  // Helper function to convert time strings to comparable values
  const getTimeValue = (timeStr) => {
    const hours = parseInt(timeStr.match(/\d+/)?.[0] || '0');
    return hours;
  };

  // Sort data
  const sortedData = useMemo(() => {
    return [...tableData].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'time') {
        // Convert time strings to comparable values
        aValue = getTimeValue(a.time);
        bValue = getTimeValue(b.time);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [tableData, sortField, sortDirection]);

  // Fetch data from backend
  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/activity-table?page=${pagination.page}&per_page=${pagination.per_page}&status=${filterStatus}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_access_token')}`
          }
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        setData(result.activities || []);
        setPagination({
          page: result.page,
          per_page: result.per_page,
          total: result.total,
          pages: result.pages,
          has_next: result.has_next,
          has_prev: result.has_prev
        });
      } else {
        console.error('Failed to fetch activities');
        setData([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when pagination or filter changes
  useEffect(() => {
    fetchActivities();
  }, [pagination.page, filterStatus]);

  // Filter data (client-side for already fetched data)
  const filteredData = useMemo(() => {
    return sortedData;
  }, [sortedData]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 when filter changes
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { label: '✅ Completed', className: 'status-completed' },
      pending: { label: '🕒 Pending', className: 'status-pending' },
      'in-progress': { label: '🔄 In Progress', className: 'status-progress' },
      cancelled: { label: '❌ Cancelled', className: 'status-cancelled' }
    };

    const config = statusConfig[status] || { label: status, className: 'status-default' };
    
    return (
      <span className={`status-badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityIndicator = (priority) => {
    const priorityConfig = {
      high: { label: '🚨', className: 'priority-urgent' },
      urgent: { label: '🚨', className: 'priority-urgent' },
      medium: { label: '⚪', className: 'priority-normal' },
      normal: { label: '⚪', className: 'priority-normal' },
      low: { label: '🔵', className: 'priority-low' }
    };

    const config = priorityConfig[priority] || { label: '⚪', className: 'priority-normal' };
    
    return (
      <span className={`priority-indicator ${config.className}`} title={priority}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`activity-table ${className} loading`}>
        <div className="table-header">
          <div className="table-title skeleton"></div>
          <div className="table-actions">
            <div className="table-action skeleton"></div>
            <div className="table-action skeleton"></div>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {['Donor', 'Hospital', 'Blood Type', 'Units', 'Status', 'Time'].map((header) => (
                  <th key={header} className="table-header-cell">
                    <div className="skeleton"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="table-cell">
                      <div className="skeleton"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={`activity-table ${className}`}>
      <div className="table-header">
        <div className="table-title-section">
          <h3 className="table-title">📋 Recent Activity</h3>
          <p className="table-subtitle">Latest donations and requests</p>
        </div>
        <div className="table-actions">
          <div className="table-filters">
            <select
              value={filterStatus}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th 
                className="table-header-cell sortable"
                onClick={() => handleSort('donor')}
              >
                <div className="header-content">
                  <span>Donor</span>
                  {sortField === 'donor' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="table-header-cell sortable"
                onClick={() => handleSort('hospital')}
              >
                <div className="header-content">
                  <span>Hospital</span>
                  {sortField === 'hospital' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="table-header-cell sortable"
                onClick={() => handleSort('bloodType')}
              >
                <div className="header-content">
                  <span>Blood Type</span>
                  {sortField === 'bloodType' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="table-header-cell sortable"
                onClick={() => handleSort('units')}
              >
                <div className="header-content">
                  <span>Units</span>
                  {sortField === 'units' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="table-header-cell sortable"
                onClick={() => handleSort('status')}
              >
                <div className="header-content">
                  <span>Status</span>
                  {sortField === 'status' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
              <th 
                className="table-header-cell sortable"
                onClick={() => handleSort('time')}
              >
                <div className="header-content">
                  <span>Time</span>
                  {sortField === 'time' && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr 
                key={row.id} 
                className="table-row"
                onClick={() => onRowClick && onRowClick(row)}
              >
                <td className="table-cell">
                  <div className="cell-content">
                    {getPriorityIndicator(row.priority)}
                    <span className="donor-name">{row.donor}</span>
                  </div>
                </td>
                <td className="table-cell">
                  <span className="hospital-name">{row.hospital}</span>
                </td>
                <td className="table-cell">
                  <span className="blood-type">{row.bloodType}</span>
                </td>
                <td className="table-cell">
                  <span className="units-count">{row.units}</span>
                </td>
                <td className="table-cell">
                  {getStatusBadge(row.status)}
                </td>
                <td className="table-cell">
                  <span className="time-ago">{row.time}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && !loading && (
        <div className="table-empty">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No activities found</div>
          <div className="empty-subtitle">Try adjusting your filters</div>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="table-pagination">
          <div className="pagination-info">
            Showing {((pagination.page - 1) * pagination.per_page) + 1} to {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total} activities
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.has_prev}
              className="pagination-btn"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            
            <div className="pagination-pages">
              <span className="page-indicator">
                Page {pagination.page} of {pagination.pages}
              </span>
            </div>
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.has_next}
              className="pagination-btn"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityTable;
