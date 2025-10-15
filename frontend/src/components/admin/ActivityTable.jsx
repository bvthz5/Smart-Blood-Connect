import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Filter, MoreHorizontal } from 'lucide-react';
import './ActivityTable.css';

const ActivityTable = ({ 
  data = [], 
  loading = false, 
  onRowClick,
  className = '' 
}) => {
  const [sortField, setSortField] = useState('time');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');

  // Use provided data only; when empty, an empty state will display
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

  // Filter data
  const filteredData = useMemo(() => {
    if (filterStatus === 'all') return sortedData;
    return sortedData.filter(item => item.status === filterStatus);
  }, [sortedData, filterStatus]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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
      urgent: { label: '🚨', className: 'priority-urgent' },
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
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button className="view-all-button">
            View All →
          </button>
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

      {filteredData.length === 0 && (
        <div className="table-empty">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No activities found</div>
          <div className="empty-subtitle">Try adjusting your filters</div>
        </div>
      )}
    </div>
  );
};

export default ActivityTable;
