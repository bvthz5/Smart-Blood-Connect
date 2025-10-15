import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { adminResetPassword } from '../../services/api';

const AdminResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await adminResetPassword(token, newPassword);
      setSuccess('Password updated successfully. Redirecting to login...');
      
      // Clear any existing admin tokens before redirecting to login
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      
      setTimeout(() => navigate('/admin/login', { replace: true }), 1200);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to reset password';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(closest-side, #ffffff 0%, #f7f7f9 40%, #eef1f5 100%)', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', padding: '28px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#B71C1C' }}>SmartBlood Admin</div>
          <div style={{ color: '#374151', fontSize: '18px', fontWeight: 600, marginTop: '6px' }}>Reset Password</div>
          <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>Set a new password for your admin account</div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>
        )}
        {success && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>{success}</div>
        )}

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: '#374151', fontSize: '13px', marginBottom: '6px' }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
              disabled={submitting}
              required
              minLength={6}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#374151', fontSize: '13px', marginBottom: '6px' }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
              disabled={submitting}
              required
              minLength={6}
            />
          </div>

          <button type="submit" disabled={submitting || !token} style={{ width: '100%', background: '#B71C1C', color: '#fff', padding: '10px 12px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Updating...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <Link to="/admin/login" style={{ color: '#B71C1C', fontSize: '13px', textDecoration: 'none' }}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminResetPassword;
