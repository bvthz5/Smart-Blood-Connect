import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import Navbar from '../../components/admin/Navbar';
import KpiCards from '../../components/admin/KpiCards';
import { TrendsChart, BloodGroupDonut } from '../../components/admin/Charts';
import RequestsTable from '../../components/admin/RequestsTable';
import donationRequestsService from '../../services/donationRequestsService';
import hospitalManagementService from '../../services/hospitalManagementService';
import './Dashboard.css';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [trend, setTrend] = useState({ labels: [], data: [] });
  const [donut, setDonut] = useState({ labels: [], data: [] });

  useEffect(() => {
    (async () => {
      try {
        const reqStats = await donationRequestsService.getRequestStats();
        const hospStats = await hospitalManagementService.getHospitalStats();
        setStats({
          activeRequests: reqStats?.active_requests || 0,
          availableDonors: hospStats?.available_donors || 0,
          fulfilledThisWeek: reqStats?.fulfilled_week || 0,
          criticalShortages: reqStats?.critical_shortages || 0,
        });
        setTrend({
          labels: reqStats?.trend?.labels || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
          data: reqStats?.trend?.data || [2,4,6,3,5,7,4]
        });
        setDonut({
          labels: reqStats?.blood_mix?.labels || ['A+','A-','B+','B-','O+','O-','AB+','AB-'],
          data: reqStats?.blood_mix?.data || [12,6,10,4,18,5,3,2]
        });
      } catch (_) { /* no-op */ }
    })();
  }, []);

  return (
    <div className="pro-admin-layout">
      <Sidebar collapsed={false} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="pro-admin-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} />
        <div className="page-wrap">
          <KpiCards stats={stats} />
          <div className="grid-2">
            <TrendsChart labels={trend.labels} data={trend.data} />
            <BloodGroupDonut labels={donut.labels} data={donut.data} />
          </div>
          <RequestsTable />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
