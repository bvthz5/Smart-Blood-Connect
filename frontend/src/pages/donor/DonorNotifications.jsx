import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  getDonorNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from "../../services/api";
import { connectSocket, disconnectSocket, getSocket } from "../../services/socket";
import "./donor-notifications.css";

const DonorNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadNotifications();

    // Connect socket and subscribe to events
    let sock;
    try {
      sock = connectSocket();
    } catch (error) {
      console.warn('[DonorNotifications] Failed to connect socket:', error);
    }
    
    if (sock) {
      const handleNewNotification = (payload) => {
        try {
          // Prepend new notification
          setNotifications((prev) => [{
            id: payload.id || Date.now(),
            type: payload.type || 'request',
            title: payload.title || 'Notification',
            message: payload.message || 'You have a new update.',
            time: payload.created_at ? new Date(payload.created_at).toLocaleString() : new Date().toLocaleString(),
            is_read: false,
            icon: payload.type === 'badge' ? '🏆' : payload.type === 'certificate' ? '📜' : '🩸'
          }, ...prev]);
        } catch (error) {
          console.warn('[DonorNotifications] Error handling new notification:', error);
        }
      };

      const handleRefresh = () => {
        try {
          loadNotifications();
        } catch (error) {
          console.warn('[DonorNotifications] Error handling refresh:', error);
        }
      };

      sock.on('notification:new', handleNewNotification);
      sock.on('notification:refresh', handleRefresh);

      // Store event handlers for cleanup
      sock._handlers = {
        'notification:new': handleNewNotification,
        'notification:refresh': handleRefresh
      };
    }

    return () => {
      const s = getSocket();
      if (s && s._handlers) {
        try { 
          s.off('notification:new', s._handlers['notification:new']); 
          s.off('notification:refresh', s._handlers['notification:refresh']); 
        } catch (_) {}
      } else if (s) {
        try { s.off('notification:new'); s.off('notification:refresh'); } catch (_) {}
      }
      try { disconnectSocket(); } catch (_) {}
    };
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const res = await getDonorNotifications();
      const list = res?.data?.notifications || [];
      // Normalize fields
      const mapped = list.map(n => ({
        id: n.id,
        type: n.type || 'request',
        title: n.title || (n.type === 'request' ? 'New Donation Request' : 'Notification'),
        message: n.message || 'You have a new update.',
        time: n.created_at ? new Date(n.created_at).toLocaleString() : '',
        is_read: !!n.read,
        icon: n.type === 'badge' ? '🏆' : n.type === 'certificate' ? '📜' : '🩸'
      }));
      setNotifications(mapped);
    } catch (e) {
      console.error('Failed to load notifications', e);
      setError('Failed to load notifications. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id) {
    try {
      await markNotificationRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (e) {
      console.warn('Failed to mark as read');
    }
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
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner">
              <div className="pulse-ring"></div>
              <div className="blood-drop">🩸</div>
            </div>
            <p>Loading notifications...</p>
          </div>
        )}
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
            {notifications.length > 0 && unreadCount > 0 && (
              <div className="notif-footer-actions">
                <button 
                  className="btn-mark-all"
                  onClick={async () => { 
                    try { await markAllNotificationsRead(); await loadNotifications(); } catch (_) {}
                  }}
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonorNotifications;
