import React, { useState } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import Navbar from '../../components/admin/Navbar';
import './Settings.css';

const Settings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoAssign, setAutoAssign] = useState(false);

  return (
    <div className="pro-admin-layout">
      <Sidebar collapsed={false} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="pro-admin-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} />
        <div className="page-wrap">
          <div className="panel">
            <h2>Admin Settings</h2>
            <div className="settings-grid">
              <label className="toggle">
                <input type="checkbox" checked={emailAlerts} onChange={e=>setEmailAlerts(e.target.checked)} />
                <span>Email alerts for critical shortages</span>
              </label>
              <label className="toggle">
                <input type="checkbox" checked={autoAssign} onChange={e=>setAutoAssign(e.target.checked)} />
                <span>Auto-assign donors to urgent requests</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
