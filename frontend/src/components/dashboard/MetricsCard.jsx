import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './MetricsCard.css';

const MetricsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon, 
  color = 'primary',
  delay = 0 
}) => {
  const { theme } = useTheme();

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp size={16} />;
      case 'negative':
        return <TrendingDown size={16} />;
      default:
        return <Minus size={16} />;
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return theme.colors.success;
      case 'negative':
        return theme.colors.error;
      default:
        return theme.colors.textMuted;
    }
  };

  const getIconColor = () => {
    const colors = {
      primary: theme.colors.primary,
      success: theme.colors.success,
      warning: theme.colors.warning,
      error: theme.colors.error,
      info: theme.colors.info,
      secondary: theme.colors.secondary
    };
    return colors[color] || colors.primary;
  };

  return (
    <div 
      className="metrics-card"
      style={{ 
        animationDelay: `${delay}ms`,
        '--icon-color': getIconColor(),
        '--change-color': getChangeColor()
      }}
    >
      <div className="card-header">
        <div className="card-icon">
          <Icon size={24} />
        </div>
        <div className="card-change">
          {getChangeIcon()}
          <span>{change}%</span>
        </div>
      </div>
      
      <div className="card-content">
        <h3 className="card-value">{value.toLocaleString()}</h3>
        <p className="card-title">{title}</p>
      </div>
      
      <div className="card-decoration"></div>
    </div>
  );
};

export default MetricsCard;
