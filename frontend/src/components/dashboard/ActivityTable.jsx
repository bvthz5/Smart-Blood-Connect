import React, { useState } from 'react';
import { 
  Heart, 
  User, 
  Building2, 
  Clock, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './ActivityTable.css';

const ActivityTable = ({ title, data, filter, onFilterChange }) => {
  const [sortField, setSortField] = useState('time');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getTypeIcon = (type) => {
    return type === 'donation' ? Heart : User;
  };

  const getStatusIcon = (status) => {
    const icons = {
      completed: '✓',
      pending: '⏳',
      'in-progress': '🔄',
      cancelled: '✗'
    };
    return icons[status] || '?';
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: '#4CAF50',
      pending: '#FF9800',
      'in-progress': '#2196F3',
      cancelled: '#F44336'
    };
    return colors[status] || '#666';
  };

  const filteredData = data.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="activity-table-card">
      <div className="table-header">
        <div className="table-title-section">
          <h3>{title}</h3>
          <p className="table-subtitle">Recent blood donation activities and requests</p>
        </div>
        <div className="table-controls">
          <select 
            className="filter-select"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="activity-table">
          <thead>
            <tr>
              <th 
                className={`sortable ${sortField === 'type' ? 'active' : ''}`}
                onClick={() => handleSort('type')}
              >
                Type
              </th>
              <th 
                className={`sortable ${sortField === 'donor' ? 'active' : ''}`}
                onClick={() => handleSort('donor')}
              >
                Donor
              </th>
              <th 
                className={`sortable ${sortField === 'hospital' ? 'active' : ''}`}
                onClick={() => handleSort('hospital')}
              >
                Hospital
              </th>
              <th>Blood Group</th>
              <th>Units</th>
              <th 
                className={`sortable ${sortField === 'status' ? 'active' : ''}`}
                onClick={() => handleSort('status')}
              >
                Status
              </th>
              <th 
                className={`sortable ${sortField === 'time' ? 'active' : ''}`}
                onClick={() => handleSort('time')}
              >
                Time
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item) => {
              const TypeIcon = getTypeIcon(item.type);
              return (
                <tr key={item.id} className={`table-row priority-${item.priority || 'normal'}`}>
                  <td>
                    <div className="type-cell">
                      <TypeIcon className="type-icon" size={16} />
                      <span className="type-label">{item.type}</span>
                    </div>
                  </td>
                  <td>
                    <div className="donor-cell">
                      <User className="donor-icon" size={16} />
                      <span>{item.donor}</span>
                    </div>
                  </td>
                  <td>
                    <div className="hospital-cell">
                      <Building2 className="hospital-icon" size={16} />
                      <span>{item.hospital}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`blood-group ${item.bloodGroup.toLowerCase()}`}>
                      {item.bloodGroup}
                    </span>
                  </td>
                  <td>
                    <span className="units">{item.units}</span>
                  </td>
                  <td>
                    <div className="status-cell">
                      <span 
                        className="status-icon"
                        style={{ color: getStatusColor(item.status) }}
                      >
                        {getStatusIcon(item.status)}
                      </span>
                      <span 
                        className={`status-label ${item.status}`}
                        style={{ color: getStatusColor(item.status) }}
                      >
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="time">
                      <Clock size={14} />
                      <span>{item.time}</span>
                    </div>
                  </td>
                  <td>
                    <button className="action-btn" title="More actions">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="table-info">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedData.length)} of {sortedData.length} entries
        </div>
        <div className="table-pagination">
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityTable;