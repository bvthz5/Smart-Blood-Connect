import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import Sidebar from '../../components/admin/Sidebar';
import Navbar from '../../components/admin/Navbar';
import './ChangePassword.css';

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const canSubmit = newPassword && newPassword === confirm && oldPassword.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setMsg('');
    try {
      await authService.changePassword(oldPassword, newPassword);
      setMsg('Password updated successfully.');
      setOldPassword(''); setNewPassword(''); setConfirm('');
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to update password');
    } finally { setLoading(false); }
  };

  return (
    <div className="pro-admin-layout">
      <Sidebar collapsed={false} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="pro-admin-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} />
        <div className="page-wrap">
          <div className="panel">
            <h2>Change Password</h2>
            <form onSubmit={submit} className="form-grid">
              <label>
                <span>Current Password</span>
                <input type="password" value={oldPassword} onChange={(e)=>setOldPassword(e.target.value)} required />
              </label>
              <label>
                <span>New Password</span>
                <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
              </label>
              <label>
                <span>Confirm New Password</span>
                <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
              </label>
              {msg && <div className="hint">{msg}</div>}
              <div className="actions">
                <button type="button" className="btn-secondary" onClick={()=>navigate(-1)}>Back</button>
                <button className="btn-primary" disabled={!canSubmit || loading}>{loading?'Saving…':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
