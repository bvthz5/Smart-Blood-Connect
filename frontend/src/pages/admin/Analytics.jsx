import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import Navbar from '../../components/admin/Navbar';
import { TrendsChart, BloodGroupDonut } from '../../components/admin/Charts';
import donationRequestsService from '../../services/donationRequestsService';
import './Analytics.css';

const Analytics = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trend, setTrend] = useState({ labels: [], data: [] });
  const [mix, setMix] = useState({ labels: [], data: [] });

  useEffect(() => {
    (async () => {
      try {
        const stats = await donationRequestsService.getRequestStats();
        setTrend({ labels: stats?.trend?.labels || [], data: stats?.trend?.data || [] });
        setMix({ labels: stats?.blood_mix?.labels || [], data: stats?.blood_mix?.data || [] });
      } catch (_) {}
    })();
  }, []);

  return (
    <div className="pro-admin-layout">
      <Sidebar collapsed={false} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="pro-admin-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} />
        <div className="page-wrap">
          <div className="filters">
            <select><option>Last 7 days</option><option>Last 30 days</option><option>Quarter</option></select>
            <select><option>All districts</option></select>
          </div>
          <div className="grid-2">
            <TrendsChart labels={trend.labels} data={trend.data} />
            <BloodGroupDonut labels={mix.labels} data={mix.data} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
