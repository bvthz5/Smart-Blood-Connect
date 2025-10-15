import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  Home,
  ChevronRight
} from 'lucide-react';
import './Navbar.css';

const Navbar = ({ title, breadcrumbs, onToggleSidebar, isMobile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  const handleLogout = () => {
    // Implement logout functionality
    navigate('/admin/login');
  };

  const handleChangePassword = () => {
    // Implement change password functionality
    console.log('Change password clicked');
    setProfileOpen(false);
  };

  const mockNotifications = [
    {
      id: 1,
      title: 'Urgent Blood Request',
      message: 'O+ blood needed at City Hospital',
      time: '5 minutes ago',
      type: 'urgent',
      read: false
    },
    {
      id: 2,
      title: 'Donation Completed',
      message: 'John Doe completed donation',
      time: '1 hour ago',
      type: 'success',
      read: false
    },
    {
      id: 3,
      title: 'System Update',
      message: 'Dashboard updated with new features',
      time: '2 hours ago',
      type: 'info',
      read: true
    }
  ];

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Left Section */}
        <div className="navbar-left">
          {isMobile && (
            <button 
              className="mobile-menu-btn"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
            >
              <Menu size={24} />
            </button>
          )}
          
          {/* Breadcrumbs */}
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol className="breadcrumb-list">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="breadcrumb-item">
                  {index > 0 && <ChevronRight size={16} className="breadcrumb-separator" />}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="breadcrumb-current">{crumb.label}</span>
                  ) : (
                    <button
                      className="breadcrumb-link"
                      onClick={() => navigate(crumb.path)}
                    >
                      {index === 0 ? <Home size={16} /> : crumb.label}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Center Section - Search */}
        <div className="navbar-center">
          <form onSubmit={handleSearch} className="search-form">
            <div className={`search-container ${searchFocused ? 'focused' : ''}`}>
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search donors, hospitals, requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="search-input"
              />
            </div>
          </form>
        </div>

        {/* Right Section */}
        <div className="navbar-right">
          {/* Notifications */}
          <div className="notification-container" ref={notificationRef}>
            <button 
              className="notification-btn"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>
            
            {notificationsOpen && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifications</h3>
                  <span className="notification-count">{unreadCount} unread</span>
                </div>
                <div className="notification-list">
                  {mockNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${notification.read ? 'read' : 'unread'} ${notification.type}`}
                    >
                      <div className="notification-content">
                        <h4 className="notification-title">{notification.title}</h4>
                        <p className="notification-message">{notification.message}</p>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                      {!notification.read && <div className="notification-dot"></div>}
                    </div>
                  ))}
                </div>
                <div className="notification-footer">
                  <button className="view-all-btn">View All Notifications</button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="profile-container" ref={profileRef}>
            <button 
              className="profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-label="Profile menu"
            >
              <div className="profile-avatar">
                <User size={20} />
              </div>
              <div className="profile-info">
                <span className="profile-name">Admin User</span>
                <span className="profile-role">Administrator</span>
              </div>
              <ChevronDown 
                size={16} 
                className={`profile-chevron ${profileOpen ? 'open' : ''}`}
              />
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-avatar">
                    <User size={24} />
                  </div>
                  <div className="profile-dropdown-info">
                    <h4>Admin User</h4>
                    <p>admin@bloodbank.com</p>
                  </div>
                </div>
                
                <div className="profile-dropdown-menu">
                  <button 
                    className="dropdown-item"
                    onClick={handleChangePassword}
                  >
                    <Settings size={18} />
                    <span>Change Password</span>
                  </button>
                  
                  <button 
                    className="dropdown-item logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
