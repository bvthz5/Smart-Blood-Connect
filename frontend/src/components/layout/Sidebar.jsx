import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Droplets,
  Heart,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggle, isMobile }) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin/dashboard',
      badge: null
    },
    {
      id: 'donors',
      label: 'Donors',
      icon: Users,
      path: '/admin/donors',
      badge: null
    },
    {
      id: 'hospitals',
      label: 'Hospitals',
      icon: Building2,
      path: '/admin/hospitals',
      badge: null
    },
    {
      id: 'inventory',
      label: 'Blood Inventory',
      icon: Droplets,
      path: '/admin/inventory',
      badge: 3
    },
    {
      id: 'requests',
      label: 'Donation Requests',
      icon: Heart,
      path: '/admin/requests',
      badge: 12
    },
    {
      id: 'events',
      label: 'Blood Drives',
      icon: Calendar,
      path: '/admin/events',
      badge: null
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/admin/settings',
      badge: null
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onToggle(); // Close sidebar on mobile after navigation
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getTooltipContent = (item) => {
    if (item.badge) {
      return `${item.label} (${item.badge} notifications)`;
    }
    return item.label;
  };

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Droplets size={24} />
            </div>
            {!collapsed && (
              <div className="logo-text">
                <span className="logo-main">BloodBank</span>
                <span className="logo-sub">Pro</span>
              </div>
            )}
          </div>
          
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-header">
              {!collapsed && <span className="nav-section-title">Main Menu</span>}
            </div>
            <div className="nav-items">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <div
                    key={item.id}
                    className={`nav-item ${active ? 'active' : ''}`}
                    onClick={() => handleNavigation(item.path)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="nav-item-content">
                      <div className="nav-item-icon">
                        <Icon size={20} />
                      </div>
                      {!collapsed && (
                        <>
                          <span className="nav-item-label">{item.label}</span>
                          {item.badge && (
                            <span className="nav-item-badge">{item.badge}</span>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Tooltip for collapsed state */}
                    {collapsed && hoveredItem === item.id && (
                      <div className="nav-tooltip">
                        <span>{getTooltipContent(item)}</span>
                        <div className="tooltip-arrow"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="sidebar-stats">
              <div className="stat-item">
                <div className="stat-icon">
                  <Activity size={16} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">1,247</span>
                  <span className="stat-label">Active Donors</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">
                  <AlertTriangle size={16} />
                </div>
                <div className="stat-content">
                  <span className="stat-value">12</span>
                  <span className="stat-label">Urgent Requests</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="sidebar-version">
            {!collapsed && (
              <span className="version-text">v2.1.0</span>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobile && !collapsed && (
        <div className="sidebar-overlay" onClick={onToggle}></div>
      )}
    </>
  );
};

export default Sidebar;
