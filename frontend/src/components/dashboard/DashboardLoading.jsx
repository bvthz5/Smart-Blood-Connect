import React from 'react';
import { Droplets, Heart, Activity, Users, Building2, TrendingUp } from 'lucide-react';
import './DashboardLoading.css';

const DashboardLoading = () => {
  return (
    <div className="dashboard-loading">
      <div className="loading-background">
        <div className="loading-gradient"></div>
        <div className="loading-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="loading-particle"></div>
          ))}
        </div>
      </div>
      
      <div className="loading-content">
        <div className="loading-logo">
          <div className="logo-pulse"></div>
          <Droplets className="logo-icon" size={40} />
        </div>
        
        <h1 className="loading-title">SmartBlood Dashboard</h1>
        <p className="loading-subtitle">Loading your blood management system...</p>
        
        <div className="loading-progress">
          <div className="progress-bar" style={{ width: '75%' }}></div>
        </div>
        
        <div className="loading-features">
          <div className="feature-item">
            <Users size={16} />
            <span>Donor Management</span>
          </div>
          <div className="feature-item">
            <Building2 size={16} />
            <span>Hospital Network</span>
          </div>
          <div className="feature-item">
            <Heart size={16} />
            <span>Blood Requests</span>
          </div>
          <div className="feature-item">
            <Activity size={16} />
            <span>Real-time Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLoading;