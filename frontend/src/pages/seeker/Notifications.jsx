import React, { useEffect, useState } from 'react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import './Notifications.css';

const Notifications = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Placeholder: read any queued toast/alerts from storage; backend API can replace this later
    const stored = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('seeker_notifications') || '[]') : [];
    setItems(stored);
  }, []);

  const onLogout = () => { localStorage.removeItem('seeker_token'); localStorage.removeItem('token'); localStorage.removeItem('seeker_refresh_token'); window.location.href = '/seeker/login'; };

  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="page-wrap">
        <div className="card notif-card">
          <div className="notif-header">Notifications</div>
          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              items.map((n, idx) => (
                <div key={idx} className="notif-item">
                  <div className={`dot ${n.type || 'info'}`} />
                  <div className="notif-body">
                    <div className="notif-title">{n.title || 'Notification'}</div>
                    {n.time && <div className="notif-meta">{n.time}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SeekerLayout>
  );
};

export default Notifications;

