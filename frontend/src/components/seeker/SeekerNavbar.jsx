import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import './SeekerNavbar.css';
import seekerService from '../../services/seekerService';

const SeekerNavbar = ({ onLogout }) => {
  const [open, setOpen] = useState(false);
  const [notif, setNotif] = useState(0);
  const [hospitalName, setHospitalName] = useState('');
  const [query, setQuery] = useState('');
  const nav = useNavigate();

  const [userLabel, setUserLabel] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await seekerService.getHospital();
        const name = data?.name || data?.hospital?.name || '';
        setHospitalName(name);
      } catch {}
      const email = typeof window !== 'undefined' ? localStorage.getItem('seeker_user_email') : '';
      const phone = typeof window !== 'undefined' ? localStorage.getItem('seeker_user_phone') : '';
      const label = email || phone || 'Staff User';
      setUserLabel(`${label} - Staff`);
      // If you wire notifications later, update setNotif(count)
    })();
  }, []);

  return (
    <div className="seekernav">
      <div className="seekernav-left">
        <div className="brand">🏥 Smart Blood Connect <span>{hospitalName ? `| ${hospitalName}` : ''}</span></div>
      </div>
      <div className="seekernav-right" ref={ref}>
        <button className="icon-btn" title="Notifications" onClick={() => { window.location.href = '/seeker/notifications'; }}>
          <span className="bell">🔔</span>
          {notif > 0 && <span className="badge">{notif}</span>}
        </button>
        <div className="profile">
          <button className="avatar" onClick={()=>setOpen(v=>!v)} title="Profile">👤</button>
          {open && (
            <div className="menu">
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 700 }}>{hospitalName || 'Hospital'}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{userLabel}</div>
              </div>
              <button onClick={()=>{ setOpen(false); window.location.href = '/seeker/hospital'; }}>🧍 View Profile</button>
              <button onClick={()=>{ setOpen(false); window.location.href = '/seeker/settings'; }}>⚙️ Settings</button>
              <button onClick={()=>{ setOpen(false); window.location.href = '/contact'; }}>❓ Help & Support</button>
              <div className="divider" />
              <button className="danger" onClick={onLogout}>🚪 Logout</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeekerNavbar;
