import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    const titles = {
      '/admin/dashboard': 'Dashboard',
      '/admin/donors': 'Donors Management',
      '/admin/hospitals': 'Hospitals Management',
      '/admin/inventory': 'Blood Inventory',
      '/admin/requests': 'Donation Requests',
      '/admin/events': 'Blood Drives & Events',
      '/admin/analytics': 'Analytics & Reports',
      '/admin/settings': 'Settings'
    };
    return titles[path] || 'Dashboard';
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const breadcrumbs = [
      { label: 'Home', path: '/admin/dashboard' }
    ];

    if (path !== '/admin/dashboard') {
      const pathSegments = path.split('/').filter(Boolean);
      let currentPath = '';
      
      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        if (index > 0) { // Skip 'admin'
          const label = segment.charAt(0).toUpperCase() + segment.slice(1);
          breadcrumbs.push({
            label: label.replace('-', ' '),
            path: currentPath
          });
        }
      });
    }

    return breadcrumbs;
  };

  return (
    <div className="dashboard-layout">
      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        isMobile={isMobile}
      />
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar
          title={getPageTitle()}
          breadcrumbs={getBreadcrumbs()}
          onToggleSidebar={toggleSidebar}
          isMobile={isMobile}
        />
        
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
