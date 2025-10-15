import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

const DashboardError = ({ error, onRetry }) => {
  return (
    <div className="dashboard-error">
      <div className="error-background">
        <div className="error-gradient"></div>
      </div>
      
      <div className="error-content">
        <div className="error-icon">
          <AlertTriangle size={64} />
        </div>
        
        <h1 className="error-title">Unable to Load Dashboard</h1>
        <p className="error-message">
          {error || "An error occurred while loading the dashboard. Please try again."}
        </p>
        
        <div className="error-actions">
          <button 
            className="error-btn error-btn-primary"
            onClick={onRetry}
          >
            <RefreshCw size={20} />
            Retry
          </button>
          <button 
            className="error-btn error-btn-secondary"
            onClick={() => window.location.reload()}
          >
            <Home size={20} />
            Go Home
          </button>
        </div>
        
        <div className="error-help">
          <p>If the problem persists, please contact support.</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardError;