import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { optimizedNavigate } from '../../utils/navigationOptimizer';
import {
  Users,
  Building2,
  Heart,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Droplets,
  AlertTriangle,
  TrendingUp,
  Calendar,
  MapPin,
  Shield,
  BarChart3
} from 'lucide-react';
import './AdminSidebar.css';

const AdminSidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({
    donors: true,
    hospitals: true,
    // analytics section removed
  });

  const toggleSection = (section) => {
    // Use requestIdleCallback to prevent blocking the main thread
    if (window.requestIdleCallback) {
      requestIdleCallback(() => {
        setExpandedSections(prev => ({
          ...prev,
          [section]: !prev[section]
        }));
      });
    } else {
      setTimeout(() => {
        setExpandedSections(prev => ({
          ...prev,
          [section]: !prev[section]
        }));
      }, 0);
    }
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Activity,
      path: '/admin/dashboard',
      badge: null
    },
    {
      id: 'donors',
      label: 'Donors',
      icon: Users,
      path: '/admin/donors',
      badge: null,
      children: [
        { label: 'All Donors', path: '/admin/donors', icon: Users },
        { label: 'Active Donors', path: '/admin/donors/active', icon: Heart },
        { label: 'Blood Groups', path: '/admin/donors/blood-groups', icon: Droplets },
        { label: 'Donor Statistics', path: '/admin/donors/stats', icon: BarChart3 }
      ]
    },
    {
      id: 'hospitals',
      label: 'Hospitals',
      icon: Building2,
      path: '/admin/hospitals',
      badge: null,
      children: [
        { label: 'All Hospitals', path: '/admin/hospitals', icon: Building2 },
        { label: 'Hospital Requests', path: '/admin/hospitals/requests', icon: AlertTriangle },
        { label: 'Hospital Locations', path: '/admin/hospitals/locations', icon: MapPin },
        { label: 'Hospital Analytics', path: '/admin/hospitals/analytics', icon: TrendingUp }
      ]
    },
    {
      id: 'requests',
      label: 'Blood Requests',
      icon: Heart,
      path: '/admin/requests',
      badge: 15,
      children: [
        { label: 'All Requests', path: '/admin/requests', icon: Heart },
        { label: 'Urgent Requests', path: '/admin/requests/urgent', icon: AlertTriangle },
        { label: 'Completed Requests', path: '/admin/requests/completed', icon: Shield },
        { label: 'Request Calendar', path: '/admin/requests/calendar', icon: Calendar }
      ]
    },
    // Analytics section removed
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/admin/settings',
      badge: null
    }
  ];

  const handleNavigation = (path) => {
    optimizedNavigate(navigate, path);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderMenuItem = (item, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections[item.id];
    const isItemActive = isActive(item.path);

    return (
      <div key={item.id} className={`menu-item-container level-${level}`}>
        <div
          className={`menu-item ${isItemActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.id);
            } else {
              handleNavigation(item.path);
            }
          }}
        >
          <div className="menu-item-content">
            <div className="menu-item-icon">
              <item.icon size={20} />
            </div>
            {!collapsed && (
              <>
                <span className="menu-item-label">{item.label}</span>
                {item.badge && (
                  <span className="menu-item-badge">{item.badge}</span>
                )}
                {hasChildren && (
                  <div className="menu-item-arrow">
                    {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Render children if expanded and not collapsed */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="menu-children">
            {item.children.map((child) => (
              <div
                key={child.path}
                className={`menu-child ${isActive(child.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(child.path)}
              >
                <div className="menu-child-icon">
                  <child.icon size={16} />
                </div>
                <span className="menu-child-label">{child.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Droplets size={28} />
            <div className="logo-pulse"></div>
          </div>
          {!collapsed && (
            <div className="logo-text">
              <span className="logo-main">SmartBlood</span>
              <span className="logo-sub">Admin</span>
            </div>
          )}
        </div>
        
      </div>

      {/* Sidebar Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-header">
            {!collapsed && <span className="nav-section-title">Main Menu</span>}
          </div>
          <div className="nav-section-content">
            {menuItems.map((item) => renderMenuItem(item))}
          </div>
        </div>
      </nav>

    </aside>
  );
};

export default AdminSidebar;

