import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import './SeekerSidebar.css';

const SeekerSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('seeker_sidebar_collapsed');
    if (saved) setCollapsed(saved === '1');
  }, []);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('seeker_sidebar_collapsed', next ? '1' : '0');
  };
  return (
    <div className={`seekerside ${collapsed ? 'collapsed' : ''}`}>
      <div className="side-header">
        <button className="collapse" onClick={toggle} title="Toggle sidebar">≡</button>
      </div>
      <nav className="side-nav">
        <NavLink to="/seeker/dashboard" className="link">🏠 <span>Dashboard</span></NavLink>
        <NavLink to="/seeker/requests/create" className="link">➕ <span>Create Request</span></NavLink>
        <NavLink to="/seeker/requests" className="link">📋 <span>All Requests</span></NavLink>
        <NavLink to="/seeker/matches" className="link">🔍 <span>Donor Matches</span></NavLink>
        <NavLink to="/seeker/notifications" className="link">🔔 <span>Notifications</span></NavLink>
        <NavLink to="/seeker/hospital" className="link">🧑‍⚕️ <span>Hospital Staff</span></NavLink>
        <NavLink to="/seeker/settings" className="link">⚙️ <span>Settings</span></NavLink>
      </nav>
      <div className="side-bottom">
        <NavLink to="/contact" className="link">❓ <span>Help & Support</span></NavLink>
        <button className="link" onClick={()=>{ localStorage.removeItem('seeker_token'); localStorage.removeItem('token'); localStorage.removeItem('seeker_refresh_token'); window.location.href='/seeker/login'; }}>🚪 <span>Logout</span></button>
      </div>

    </div>
  );
};

export default SeekerSidebar;
