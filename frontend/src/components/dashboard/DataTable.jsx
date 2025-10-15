import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import './DataTable.css';

const DataTable = ({ 
  title, 
  subtitle,
  data = [], 
  columns = [],
  actions = [],
  delay = 0,
  loading = false 
}) => {
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { theme } = useTheme();

  // Default columns if none provided
  const defaultColumns = [
    { key: 'message', label: 'Activity', sortable: true },
    { key: 'time', label: 'Time', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'priority', label: 'Priority', sortable: true }
  ];

  const tableColumns = columns.length > 0 ? columns : defaultColumns;

  // Default actions
  const defaultActions = [
    {
      icon: RefreshCw,
      label: 'Refresh',
      onClick: () => console.log('Refresh clicked')
    },
    {
      icon: Download,
      label: 'Export',
      onClick: () => console.log('Export clicked')
    },
    {
      icon: Filter,
      label: 'Filter',
      onClick: () => console.log('Filter clicked')
    }
  ];

  const tableActions = actions.length > 0 ? actions : defaultActions;

  const handleSort = (field) => {
    if (!tableColumns.find(col => col.key === field)?.sortable) return;
    
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const getStatusColor = (status) => {
    const colors = {
      completed: theme.colors.success,
      pending: theme.colors.warning,
      active: theme.colors.info,
      matched: theme.colors.primary,
      alert: theme.colors.error
    };
    return colors[status] || theme.colors.textMuted;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: theme.colors.error,
      normal: theme.colors.textMuted,
      low: theme.colors.success
    };
    return colors[priority] || theme.colors.textMuted;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'pending':
        return '⏳';
      case 'active':
        return '🟢';
      case 'matched':
        return '🔗';
      case 'alert':
        return '⚠️';
      default:
        return '•';
    }
  };

  return (
    <div 
      className="data-table-container"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="table-header">
        <div className="table-title-section">
          <h3 className="table-title">{title}</h3>
          {subtitle && (
            <p className="table-subtitle">{subtitle}</p>
          )}
        </div>
        
        <div className="table-actions">
          {tableActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                className="table-action"
                onClick={action.onClick}
                title={action.label}
                disabled={loading}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="table-content">
        {loading ? (
          <div className="table-loading">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {tableColumns.map((column) => (
                      <th
                        key={column.key}
                        className={`table-header-cell ${column.sortable ? 'sortable' : ''}`}
                        onClick={() => column.sortable && handleSort(column.key)}
                      >
                        <div className="header-content">
                          <span>{column.label}</span>
                          {column.sortable && (
                            <div className="sort-indicators">
                              <ChevronUp 
                                size={14} 
                                className={`sort-arrow ${sortField === column.key && sortDirection === 'asc' ? 'active' : ''}`}
                              />
                              <ChevronDown 
                                size={14} 
                                className={`sort-arrow ${sortField === column.key && sortDirection === 'desc' ? 'active' : ''}`}
                              />
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="table-header-cell actions-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, index) => (
                    <tr key={row.id || index} className="table-row">
                      {tableColumns.map((column) => (
                        <td key={column.key} className="table-cell">
                          {column.key === 'status' ? (
                            <div className="status-cell">
                              <span className="status-icon">{getStatusIcon(row.status)}</span>
                              <span 
                                className="status-text"
                                style={{ color: getStatusColor(row.status) }}
                              >
                                {row.status}
                              </span>
                            </div>
                          ) : column.key === 'priority' ? (
                            <span 
                              className="priority-badge"
                              style={{ 
                                backgroundColor: `${getPriorityColor(row.priority)}20`,
                                color: getPriorityColor(row.priority)
                              }}
                            >
                              {row.priority}
                            </span>
                          ) : (
                            <span className="cell-content">{row[column.key]}</span>
                          )}
                        </td>
                      ))}
                      <td className="table-cell actions-cell">
                        <div className="action-buttons">
                          <button className="action-btn view" title="View">
                            <Eye size={16} />
                          </button>
                          <button className="action-btn edit" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button className="action-btn delete" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="table-pagination">
                <div className="pagination-info">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, data.length)} of {data.length} entries
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DataTable;
