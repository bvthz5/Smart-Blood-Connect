import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import Sidebar from '../../components/admin/Sidebar';
import Navbar from '../../components/admin/Navbar';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.login(email, password);
      localStorage.setItem('admin_access_token', data.access_token || data.token || '');
      localStorage.setItem('user_type', 'admin');
      navigate('/admin/pro/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-admin-layout">
      <Sidebar collapsed={true} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="pro-admin-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} sidebarCollapsed={true} />
        <div className="auth-wrapper">
          <div className="auth-card">
            <div className="brand">
              <div className="logo">💉</div>
              <div className="brand-text">
                <h1>SmartBlood</h1>
                <p>Admin Access</p>
              </div>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hospital.org"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <div className="auth-links">
                <button type="button" className="link" onClick={() => navigate('/admin/forgot-password')}>Forgot password?</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
