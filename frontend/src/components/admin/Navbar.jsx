import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Menu,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  
} from 'lucide-react';
import './Navbar.css';
import { getAdminProfile } from '../../services/api';

const Navbar = ({ onToggleSidebar, sidebarCollapsed }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [notifications] = useState([
    {
      id: 1,
      title: 'Critical Blood Shortage',
      message: 'O- blood type is critically low',
      time: '2 minutes ago',
      type: 'urgent',
      unread: true
    },
    {
      id: 2,
      title: 'New Donor Registration',
      message: 'John Smith registered as A+ donor',
      time: '15 minutes ago',
      type: 'info',
      unread: true
    },
    {
      id: 3,
      title: 'Donation Completed',
      message: 'Sarah Johnson completed donation',
      time: '1 hour ago',
      type: 'success',
      unread: false
    }
  ]);
  
  const { theme } = useTheme();
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load admin profile for subtitle and profile name
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getAdminProfile();
        const name = res?.data?.admin?.name || 'Admin';
        if (mounted) setAdminName(name);
      } catch (e) {
        if (mounted) setAdminName('Admin');
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Handle notification click
  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification);
    // Mark as read and navigate if needed
  };

  // Handle profile actions
  const handleProfileAction = (action) => {
    setShowProfileDropdown(false);
    switch (action) {
      case 'profile':
        navigate('/admin/profile');
        break;
      case 'settings':
        navigate('/admin/settings');
        break;
      case 'logout':
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        localStorage.removeItem('user_type');
        window.location.href = '/admin/login';
        break;
      default:
        break;
    }
  };

  // Close dropdowns when clicking outside - Optimized to prevent reflows
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Use requestIdleCallback to prevent blocking the main thread
        if (window.requestIdleCallback) {
          requestIdleCallback(() => {
            setShowProfileDropdown(false);
            setShowNotifications(false);
          });
        } else {
          setTimeout(() => {
            setShowProfileDropdown(false);
            setShowNotifications(false);
          }, 0);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // No navbar-search-toggle; removed per requirement

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {/* Left Section */}
        <div className="navbar-left">
          <button
            className="navbar-menu-toggle"
            onClick={onToggleSidebar}
            title="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          
          <div className="navbar-breadcrumb">
            <h1 className="navbar-title">Dashboard Overview</h1>
            <span className="navbar-subtitle">Welcome back, {adminName}</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="navbar-right">
          {/* Search removed as requested */}

          {/* Notifications */}
          <div className="navbar-notifications" ref={dropdownRef}>
            <button
              className="navbar-notification-toggle"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifications</h3>
                  <span className="notification-count">{unreadCount} unread</span>
                </div>
                <div className="notification-list">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${notification.unread ? 'unread' : ''} ${notification.type}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-content">
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-message">{notification.message}</div>
                        <div className="notification-time">{notification.time}</div>
                      </div>
                      {notification.unread && (
                        <div className="notification-dot"></div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="notification-footer">
                  <button className="view-all-notifications">
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="navbar-profile" ref={dropdownRef}>
            <button
              className="navbar-profile-toggle"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              title="Profile"
            >
              <div className="profile-avatar">
                <User size={16} />
              </div>
              <span className="profile-name">{adminName}</span>
              <ChevronDown size={16} className="profile-arrow" />
            </button>

            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <div className="profile-info">
                    <div className="profile-avatar-large">
                      <User size={24} />
                    </div>
                    <div className="profile-details">
                      <div className="profile-name-large">{adminName}</div>
                      <div className="profile-role">Administrator</div>
                    </div>
                  </div>
                </div>
                <div className="profile-menu">
                  <button
                    className="profile-menu-item"
                    onClick={() => handleProfileAction('profile')}
                  >
                    <User size={16} />
                    <span>My Profile</span>
                  </button>
                  <button
                    className="profile-menu-item"
                    onClick={() => handleProfileAction('settings')}
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <div className="profile-menu-divider"></div>
                  <button
                    className="profile-menu-item logout"
                    onClick={() => handleProfileAction('logout')}
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
