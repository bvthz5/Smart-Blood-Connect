import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/admin/DashboardLayout';
import { adminChangePassword, getAdminSessions, revokeAllAdminSessions, revokeOneAdminSession } from '../../services/api';

const Section = ({ title, children }) => (
  <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1.25rem' }}>
    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: '0.75rem' }}>{title}</div>
    {children}
  </div>
);

const Row = ({ label, description, control }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px dashed var(--color-border)', gap: '1rem' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--color-textSecondary)' }}>{description}</div>}
    </div>
    <div>{control}</div>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span style={{ fontSize: 14 }}>Enable</span>
  </label>
);

const AdminSettings = () => {
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({ current: '', next: '', confirm: '', form: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const v = localStorage.getItem('admin_email_login_alerts');
    return v === 'true';
  });
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState('');

  const loadSessions = async () => {
    try {
      setSessionsError('');
      setSessionsLoading(true);
      const res = await getAdminSessions();
      setSessions(res.data?.sessions || []);
    } catch (e) {
      setSessionsError('Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const submitPassword = async (e) => {
    e.preventDefault();
    const newErrors = { current: '', next: '', confirm: '', form: '' };
    if (!pwd.current) newErrors.current = 'Please enter your current password';
    if (!pwd.next) newErrors.next = 'Please enter a new password';
    if (!pwd.confirm) newErrors.confirm = 'Please confirm your new password';
    if (pwd.next && pwd.confirm && pwd.next !== pwd.confirm) newErrors.confirm = 'Passwords do not match';
    setErrors(newErrors);
    if (newErrors.current || newErrors.next || newErrors.confirm) return;
    try {
      await adminChangePassword(pwd.current, pwd.next);
      alert('Password changed successfully. Please sign in again if prompted.');
      setPwd({ current: '', next: '', confirm: '' });
      setErrors({ current: '', next: '', confirm: '', form: '' });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        window.location.href = '/admin/login';
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to change password';
      setErrors((prev)=>({ ...prev, form: msg }));
    }
  };

  return (
    <DashboardLayout>
      <div className="admin-dashboard" style={{ paddingTop: 0 }}>
        <div className="dashboard-welcome" style={{ marginBottom: '1rem' }}>
          <div className="welcome-content">
            <h1 className="welcome-title">Settings</h1>
            <p className="welcome-subtitle">Manage account security and essential preferences</p>
          </div>
        </div>

        {/* Local max-width container to avoid affecting other pages */}
        <div style={{ maxWidth: '1600px', margin: '0 auto', marginTop: '1rem' }}>
          {/* Wider layout feel by using an asymmetric grid and reduced gutters visually */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '1.5rem' }}>
          {/* Left: Security (wider) */}
          <Section title="Account Security">
            <div style={{ fontSize: 13, color: 'var(--color-textSecondary)', marginBottom: '0.5rem' }}>
              Keep your account protected. Use a strong password and update it regularly.
            </div>
            <form onSubmit={submitPassword} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.9rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-textSecondary)' }}>Current Password</span>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <input type={show.current ? 'text' : 'password'} value={pwd.current} onChange={(e)=>setPwd({...pwd, current: e.target.value})} style={{ flex:1, height: 44, borderRadius: 10, border: errors.current ? '1px solid var(--color-error)' : '1px solid var(--color-border)', padding: '0 0.9rem', background: 'var(--color-background)' }} />
                  <button type="button" onClick={()=>setShow(s=>({...s, current: !s.current}))} style={{ height: 36, padding:'0 10px', border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-surfaceVariant)' }}>{show.current ? 'Hide' : 'Show'}</button>
                </div>
                {errors.current && <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{errors.current}</span>}
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-textSecondary)' }}>New Password</span>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <input type={show.next ? 'text' : 'password'} value={pwd.next} onChange={(e)=>setPwd({...pwd, next: e.target.value})} style={{ flex:1, height: 44, borderRadius: 10, border: errors.next ? '1px solid var(--color-error)' : '1px solid var(--color-border)', padding: '0 0.9rem', background: 'var(--color-background)' }} />
                  <button type="button" onClick={()=>setShow(s=>({...s, next: !s.next}))} style={{ height: 36, padding:'0 10px', border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-surfaceVariant)' }}>{show.next ? 'Hide' : 'Show'}</button>
                </div>
                {errors.next && <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{errors.next}</span>}
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-textSecondary)' }}>Confirm New Password</span>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <input type={show.confirm ? 'text' : 'password'} value={pwd.confirm} onChange={(e)=>setPwd({...pwd, confirm: e.target.value})} style={{ flex:1, height: 44, borderRadius: 10, border: errors.confirm ? '1px solid var(--color-error)' : '1px solid var(--color-border)', padding: '0 0.9rem', background: 'var(--color-background)' }} />
                  <button type="button" onClick={()=>setShow(s=>({...s, confirm: !s.confirm}))} style={{ height: 36, padding:'0 10px', border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-surfaceVariant)' }}>{show.confirm ? 'Hide' : 'Show'}</button>
                </div>
                {errors.confirm && <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{errors.confirm}</span>}
              </label>
              {errors.form && <div style={{ fontSize: 13, color: 'var(--color-error)' }}>{errors.form}</div>}
              <div style={{ display:'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.65rem 1.1rem' }}>Change Password</button>
                <button type="button" className="btn" style={{ border:'1px solid var(--color-border)', borderRadius:10, padding:'0.65rem 1.1rem', background:'var(--color-surfaceVariant)' }}>Cancel</button>
              </div>
            </form>
          </Section>

          {/* Right: Notifications + Sessions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
            <Section title="Notifications">
              <Row
                label="Email Login Alerts"
                description="Get an email when a new session is detected on your account."
                control={<Toggle checked={alertsEnabled} onChange={(e)=>{
                  setAlertsEnabled(e.target.checked);
                  if (typeof window !== 'undefined') localStorage.setItem('admin_email_login_alerts', String(e.target.checked));
                }} />}
              />
            </Section>

            <Section title="Active Sessions">
              <div style={{ fontSize: 13, color: 'var(--color-textSecondary)', marginBottom: '0.5rem' }}>
                You are signed in to the following sessions.
              </div>
              {sessionsError && <div style={{ fontSize: 13, color: 'var(--color-error)', marginBottom: '0.5rem' }}>{sessionsError}</div>}
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {sessionsLoading ? (
                  <div style={{ fontSize: 13 }}>Loading...</div>
                ) : (
                  sessions.map((s) => (
                    <div key={s.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.75rem', border:'1px solid var(--color-border)', borderRadius:10 }}>
                      <div>
                        <div style={{ fontWeight:600 }}>Session #{s.id}</div>
                        <div style={{ fontSize:12, color:'var(--color-textSecondary)' }}>Created: {s.created_at || '-'} • Expires: {s.expires_at || '-'} {s.revoked ? '• Revoked' : ''}</div>
                      </div>
                      {!s.revoked && (
                        <button
                          className="btn"
                          onClick={async ()=>{ try { await revokeOneAdminSession(s.id); await loadSessions(); } catch(_){} }}
                          style={{ border:'1px solid var(--color-border)', borderRadius:8, padding:'0.4rem 0.75rem', background:'var(--color-surfaceVariant)' }}
                        >Revoke</button>
                      )}
                    </div>
                  ))
                )}
                {(!sessionsLoading && sessions.length === 0) && (
                  <div style={{ fontSize: 13, color: 'var(--color-textSecondary)' }}>No sessions found.</div>
                )}
              </div>
              <div style={{ marginTop:'0.75rem', display:'flex', gap: '0.5rem' }}>
                <button
                  className="btn"
                  onClick={async ()=>{ try { await revokeAllAdminSessions(); await loadSessions(); } catch(_){} }}
                  style={{ background:'var(--color-error)', color:'#fff', border:'none', borderRadius:10, padding:'0.6rem 1rem' }}
                >Sign out from all devices</button>
                <button
                  className="btn"
                  onClick={loadSessions}
                  style={{ border:'1px solid var(--color-border)', borderRadius:10, padding:'0.6rem 1rem', background:'var(--color-surfaceVariant)' }}
                >Refresh</button>
              </div>
            </Section>
          </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
