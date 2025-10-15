import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './MetricCard.css';

const MetricCard = ({ title, value, icon: Icon, trend, type = 'primary' }) => {
  const isPositive = trend && trend.startsWith('+');
  const isNegative = trend && trend.startsWith('-');

  return (
    <div className={`metric-card metric-${type}`}>
      <div className="metric-glow"></div>
      
      <div className="metric-header">
        <div className="metric-icon">
          <Icon size={24} />
        </div>
        <div className="metric-trend">
          {trend && (
            <div className={`trend-indicator ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{trend}</span>
            </div>
          )}
        </div>
      </div>

      <div className="metric-content">
        <div className="metric-value">
          {value?.toLocaleString() || '0'}
        </div>
        <div className="metric-title">
          {title}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;