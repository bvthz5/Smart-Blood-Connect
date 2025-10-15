import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import AdminLogin from '../components/auth/AdminLogin';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import './Demo.css';

const Demo = () => {
  const [currentView, setCurrentView] = useState('login');
  const { theme, themes, changeTheme, currentTheme } = useTheme();

  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>BloodBank Pro - Demo</h1>
        <p>Professional Blood Bank Management System</p>
        
        <div className="demo-controls">
          <div className="view-controls">
            <button 
              className={`demo-btn ${currentView === 'login' ? 'active' : ''}`}
              onClick={() => setCurrentView('login')}
            >
              Login Page
            </button>
            <button 
              className={`demo-btn ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              Dashboard
            </button>
          </div>
          
          <div className="theme-controls">
            <span>Theme:</span>
            {themes.map(themeName => {
              const themeNames = {
                light: 'Light',
                dark: 'Dark',
                blue: 'Professional Blue',
                red: 'Medical Red'
              };
              return (
                <button
                  key={themeName}
                  className={`theme-btn ${currentTheme === themeName ? 'active' : ''}`}
                  onClick={() => changeTheme(themeName)}
                >
                  {themeNames[themeName] || themeName}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="demo-content">
        {currentView === 'login' ? (
          <div className="demo-view">
            <AdminLogin />
          </div>
        ) : (
          <div className="demo-view">
            <AdminDashboard />
          </div>
        )}
      </div>

      <div className="demo-footer">
        <div className="features">
          <h3>Features</h3>
          <ul>
            <li>✅ Multiple Professional Themes (Light, Dark, Blue, Red)</li>
            <li>✅ Responsive Design (Mobile, Tablet, Desktop)</li>
            <li>✅ Professional Login with Theme Switching</li>
            <li>✅ Collapsible Sidebar with Smooth Animations</li>
            <li>✅ Sticky Navbar with Search & Notifications</li>
            <li>✅ Interactive Dashboard with Real-time Data</li>
            <li>✅ Data Visualization Charts & Graphs</li>
            <li>✅ Sortable Data Tables with Pagination</li>
            <li>✅ Accessibility Support (High Contrast, Reduced Motion)</li>
            <li>✅ Professional Loading States & Error Handling</li>
          </ul>
        </div>
        
        <div className="tech-stack">
          <h3>Tech Stack</h3>
          <ul>
            <li>⚛️ React 18 with Hooks</li>
            <li>🎨 CSS Custom Properties for Theming</li>
            <li>📱 Responsive CSS Grid & Flexbox</li>
            <li>🎭 Smooth Animations & Transitions</li>
            <li>♿ Accessibility First Design</li>
            <li>🔧 Modern JavaScript (ES6+)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Demo;
