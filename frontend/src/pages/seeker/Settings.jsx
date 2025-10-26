import React, { useState } from 'react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import './Settings.css';

const Settings = () => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoAssign, setAutoAssign] = useState(false);
  const onLogout = () => { 
    localStorage.removeItem('seeker_token'); 
    localStorage.removeItem('token'); 
    localStorage.removeItem('seeker_refresh_token'); 
    window.location.href = '/seeker/login'; 
  };

  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="page-wrap">
        <div className="card panel">
          <h2>Settings</h2>
          <div className="settings-grid">
            <label className="toggle">
              <input type="checkbox" checked={emailAlerts} onChange={e=>setEmailAlerts(e.target.checked)} />
              <span>Email alerts for request updates</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={autoAssign} onChange={e=>setAutoAssign(e.target.checked)} />
              <span>Auto-assign nearest donor for urgent requests</span>
            </label>
          </div>
        </div>
      </div>
    </SeekerLayout>
  );
};

export default Settings;
