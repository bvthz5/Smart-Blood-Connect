import React from 'react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import { DemandByGroup, MonthlyTrend } from '../../components/seeker/Charts';
import './Analytics.css';
 import { redirectToLogin } from '../../utils/authRedirect';
  const onLogout = () => { localStorage.removeItem('seeker_token'); redirectToLogin(); };

const Analytics = () => {
  const onLogout = () => { localStorage.removeItem('seeker_token'); window.location.href = '/seeker/login'; };
  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="page-wrap">
        <div className="filters">
          <select><option>Last 7 days</option><option>Last 30 days</option><option>Quarter</option></select>
          <select><option>All hospitals</option></select>
        </div>
        <div className="grid-2">
          <MonthlyTrend labels={[]} data={[]} />
          <DemandByGroup data={[]} />
        </div>
      </div>
    </SeekerLayout>
  );
};

export default Analytics;
