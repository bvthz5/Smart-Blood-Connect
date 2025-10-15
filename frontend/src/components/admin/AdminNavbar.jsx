import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown,
  Droplets,
  Bell,
  Search
} from 'lucide-react';
import { logout } from '../../store/slices/adminSlice';
import './AdminNavbar.css';

const AdminNavbar = ({ onToggleSidebar, sidebarCollapsed }) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.admin);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    // Use throttled mouse handler for better performance
    let ticking = false;
    const throttledHandleClickOutside = (event) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleClickOutside(event);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    document.addEventListener('mousedown', throttledHandleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', throttledHandleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/admin/login');
  };

  const handleChangePassword = () => {
    // Navigate to change password page
    navigate('/admin/change-password');
    setProfileDropdownOpen(false);
  };

  const handleGoProfile = () => {
    navigate('/admin/profile');
    setProfileDropdownOpen(false);
  };

  const handleEditProfile = () => {
    navigate('/admin/profile?edit=1');
    setProfileDropdownOpen(false);
  };

  const handleGoSettings = () => {
    navigate('/admin/settings');
    setProfileDropdownOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  const mockNotifications = [
    {
      id: 1,
      title: 'New Blood Request',
      message: 'Emergency O+ blood needed at City Hospital',
      time: '5 minutes ago',
      type: 'urgent',
      read: false
    },
    {
      id: 2,
      title: 'Donation Completed',
      message: 'John Doe completed donation at Medical Center',
      time: '1 hour ago',
      type: 'success',
      read: false
    },
    {
      id: 3,
      title: 'System Update',
      message: 'Dashboard has been updated with new features',
      time: '2 hours ago',
      type: 'info',
      read: true
    }
  ];

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <nav className="admin-navbar">
      <div className="navbar-container">
        {/* Left Section */}
        <div className="navbar-left">
          <button 
            className="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>
          
          <div className="navbar-logo">
            <div className="logo-icon">
              <Droplets size={28} />
              <div className="logo-pulse"></div>
            </div>
            <div className="logo-text">
              <span className="logo-main">SmartBlood</span>
              <span className="logo-sub">Admin Portal</span>
            </div>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="navbar-center">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-container">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search donors, hospitals, requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
          <div className="profile-container" ref={dropdownRef}>
            <button 
              className="profile-btn"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              aria-label="Profile menu"
            >
              <div className="profile-avatar">
                <User size={20} />
              </div>
              <div className="profile-info">
                <span className="profile-name">{user?.name || 'Admin User'}</span>
                <span className="profile-role">Administrator</span>
              </div>
              <ChevronDown 
                size={16} 
                className={`profile-chevron ${profileDropdownOpen ? 'open' : ''}`}
              />
            </button>

            {profileDropdownOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-avatar">
                    <User size={24} />
                  </div>
                  <div className="profile-dropdown-info">
                    <h4>{user?.name || 'Admin User'}</h4>
                    <p>{user?.email || 'admin@smartblood.com'}</p>
                  </div>
                </div>
                
                <div className="profile-dropdown-menu">
                  <button 
                    className="dropdown-item"
                    onClick={handleGoProfile}
                  >
                    <User size={18} />
                    <span>Profile</span>
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={handleEditProfile}
                  >
                    <User size={18} />
                    <span>Edit Profile</span>
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={handleGoSettings}
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
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
    </nav>
  );
};

export default AdminNavbar;

