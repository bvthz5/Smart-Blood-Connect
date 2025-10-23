import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./donor-notifications.css";

const DonorNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "request",
      title: "New Donation Request",
      message: "Amrita Institute needs O+ blood urgently. You're a match!",
      time: "2 hours ago",
      is_read: false,
      icon: "🩸"
    },
    {
      id: 2,
      type: "badge",
      title: "Achievement Unlocked!",
      message: "You've earned the 'Life Saver' badge for 5 donations.",
      time: "1 day ago",
      is_read: false,
      icon: "🏆"
    },
    {
      id: 3,
      type: "certificate",
      title: "Certificate Available",
      message: "Your donation certificate from Medical Trust Hospital is ready to download.",
      time: "2 days ago",
      is_read: true,
      icon: "📜"
    },
    {
      id: 4,
      type: "insight",
      title: "AI Insight Update",
      message: "High demand for O+ blood in Ernakulam district next week.",
      time: "3 days ago",
      is_read: true,
      icon: "🤖"
    }
  ]);

  function markAsRead(id) {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    ));
  }

  function deleteNotification(id) {
    setNotifications(notifications.filter(n => n.id !== id));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="donor-notifications">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/donor/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>🔔 Notifications</h1>
          <p>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
      </header>

      <div className="notifications-container">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Notifications</h3>
            <p>You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notif, index) => (
              <div 
                key={notif.id} 
                className={`notification-card ${!notif.is_read ? 'unread' : ''}`}
                style={{"--index": index}}
              >
                <div className="notif-icon">{notif.icon}</div>
                <div className="notif-content">
                  <div className="notif-header">
                    <h4>{notif.title}</h4>
                    <span className="notif-time">{notif.time}</span>
                  </div>
                  <p className="notif-message">{notif.message}</p>
                </div>
                <div className="notif-actions">
                  {!notif.is_read && (
                    <button 
                      className="btn-mark-read"
                      onClick={() => markAsRead(notif.id)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button 
                    className="btn-delete"
                    onClick={() => deleteNotification(notif.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorNotifications;
