import React from 'react';
import './KpiCards.css';

const KpiCards = ({ stats = {} }) => {
  const items = [
    { key: 'activeRequests', label: 'Active Requests', value: stats.activeRequests ?? 0, trend: '+8%', accent: 'red' },
    { key: 'availableDonors', label: 'Available Donors', value: stats.availableDonors ?? 0, trend: '+3%', accent: 'green' },
    { key: 'fulfilledThisWeek', label: 'Fulfilled (7d)', value: stats.fulfilledThisWeek ?? 0, trend: '+12%', accent: 'blue' },
    { key: 'criticalShortages', label: 'Critical Shortages', value: stats.criticalShortages ?? 0, trend: '-2%', accent: 'amber' }
  ];

  return (
    <div className="kpi-grid">
      {items.map((it) => (
        <div key={it.key} className={`kpi-card accent-${it.accent}`}>
          <div className="kpi-top">
            <div className="kpi-label">{it.label}</div>
            <div className="kpi-trend">{it.trend}</div>
          </div>
          <div className="kpi-value">{it.value}</div>
          <div className="kpi-bar" />
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
