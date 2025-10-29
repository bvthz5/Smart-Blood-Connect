import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { optimizedNavigate } from '../../utils/navigationOptimizer';
import {
  LayoutDashboard,
  Users,
  Building2,
  Droplets,
  ClipboardList,
  Calendar,
  BarChart3,
  Settings
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggle, isOpen, onClose }) => {
  const [activeItem, setActiveItem] = useState('dashboard');
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Menu items configuration
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
      label: 'Blood Matching',
      icon: Droplets,
      path: '/admin/inventory',
      badge: 'Low'
    },
    {
      id: 'requests',
      label: 'Donation Requests',
      icon: ClipboardList,
      path: '/admin/requests',
      badge: 5
    },
    {
      id: 'drives',
      label: 'Donation History',
      icon: Calendar,
      path: '/admin/donation-history',
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

  // Set active item based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const activeMenuItem = menuItems.find(item => 
      currentPath.startsWith(item.path)
    );
    if (activeMenuItem) {
      setActiveItem(activeMenuItem.id);
    }
  }, [location.pathname]);

  // Handle menu item click - optimized to prevent reflows
  const handleMenuItemClick = useCallback((item) => {
    setActiveItem(item.id);
    optimizedNavigate(navigate, item.path);
    if (isOpen) {
      onClose();
    }
  }, [navigate, isOpen, onClose]);


  // Sidebar item component - optimized with React.memo
  const SidebarItem = React.memo(({ item }) => {
    const Icon = item.icon;
    const isActive = activeItem === item.id;
    
    return (
      <li className="sidebar-item">
        <button
          className={`sidebar-link ${isActive ? 'active' : ''}`}
          onClick={() => handleMenuItemClick(item)}
          title={collapsed ? item.label : ''}
        >
          <div className="sidebar-icon">
            <Icon size={20} />
          </div>
          {!collapsed && (
            <>
              <span className="sidebar-label">{item.label}</span>
              {item.badge && (
                <span className={`sidebar-badge ${typeof item.badge === 'number' ? 'count' : 'text'}`}>
                  {item.badge}
                </span>
              )}
            </>
          )}
        </button>
      </li>
    );
  });

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${isOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">💉</div>
            {!collapsed && (
              <div className="logo-text">
                <span className="logo-brand">SmartBlood</span>
                <span className="logo-subtitle">Admin Panel</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {menuItems.map((item) => (
              <SidebarItem key={item.id} item={item} />
            ))}
          </ul>
        </nav>

      </aside>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="mobile-sidebar-overlay" onClick={onClose}>
          <aside 
            className="mobile-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-sidebar-header">
              <div className="mobile-sidebar-logo">
                <div className="logo-icon">💉</div>
                <div className="logo-text">
                  <span className="logo-brand">SmartBlood</span>
                  <span className="logo-subtitle">Admin Panel</span>
                </div>
              </div>
              <button className="mobile-sidebar-close" onClick={onClose}>
                ×
              </button>
            </div>

            <nav className="mobile-sidebar-nav">
              <ul className="mobile-sidebar-menu">
                {menuItems.map((item) => (
                  <SidebarItem key={item.id} item={item} />
                ))}
              </ul>
            </nav>

          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
