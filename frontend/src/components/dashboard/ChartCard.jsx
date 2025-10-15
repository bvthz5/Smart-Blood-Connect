import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { MoreHorizontal, Download, RefreshCw } from 'lucide-react';
import './ChartCard.css';

const ChartCard = ({ 
  title, 
  subtitle,
  children, 
  actions = [],
  delay = 0,
  loading = false 
}) => {
  const { theme } = useTheme();

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
      icon: MoreHorizontal,
      label: 'More options',
      onClick: () => console.log('More options clicked')
    }
  ];

  const chartActions = actions.length > 0 ? actions : defaultActions;

  return (
    <div 
      className="chart-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="chart-header">
        <div className="chart-title-section">
          <h3 className="chart-title">{title}</h3>
          {subtitle && (
            <p className="chart-subtitle">{subtitle}</p>
          )}
        </div>
        
        <div className="chart-actions">
          {chartActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                className="chart-action"
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
      
      <div className="chart-content">
        {loading ? (
          <div className="chart-loading">
            <div className="loading-spinner"></div>
            <p>Loading chart data...</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ChartCard;