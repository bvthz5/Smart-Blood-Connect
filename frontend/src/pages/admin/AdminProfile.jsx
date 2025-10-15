import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/admin/DashboardLayout';
import { getAdminProfile } from '../../services/api';

const AdminProfile = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getAdminProfile();
        const data = res?.admin || res?.data?.admin || null;
        if (mounted) {
          setProfile(data);
          setForm({
            first_name: data?.name?.split(' ')[0] || '',
            last_name: data?.name?.split(' ').slice(1).join(' ') || '',
            phone: data?.phone || ''
          });
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setError('Failed to load profile');
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Enable edit mode if query param edit=1 is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('edit') === '1') {
      setEditMode(true);
    }
  }, [location.search]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    // TODO: implement update endpoint, then call and refresh profile
    // placeholder: just toggle off edit mode
    setEditMode(false);
  };

  return (
    <DashboardLayout>
      <div className="admin-dashboard" style={{ paddingTop: 0 }}>
        <div className="dashboard-welcome" style={{ marginBottom: '1rem' }}>
          <div className="welcome-content">
            <h1 className="welcome-title">Admin Profile</h1>
            <p className="welcome-subtitle">View and manage your account information</p>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-loading"><div className="loading-spinner"/></div>
        ) : error ? (
          <div className="dashboard-error"><div className="error-content">{error}</div></div>
        ) : (
          <div className="profile-page" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
            <div className="card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <div style={{ width:64, height:64, borderRadius:12, background:'var(--gradient-primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:22 }}>
                  {profile?.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:700 }}>{profile?.name || 'Admin User'}</div>
                  <div style={{ fontSize:14, opacity:0.8 }}>{profile?.email}</div>
                </div>
              </div>
              <div style={{ marginTop:'1rem' }}>
                <div style={{ fontSize:14, color:'var(--color-textSecondary)' }}>Role</div>
                <div style={{ fontSize:15, fontWeight:600 }}>{profile?.role || 'admin'}</div>
              </div>
            </div>

            <div className="card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
                <div style={{ fontSize:18, fontWeight:700 }}>Account Information</div>
                <button onClick={() => setEditMode(!editMode)} className="btn" style={{ border:'1px solid var(--color-border)', borderRadius:8, padding:'0.5rem 0.75rem', background:'var(--color-surfaceVariant)' }}>
                  {editMode ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {!editMode ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div>
                    <div style={{ fontSize:12, color:'var(--color-textSecondary)' }}>First Name</div>
                    <div style={{ fontSize:15, fontWeight:600 }}>{form.first_name || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:'var(--color-textSecondary)' }}>Last Name</div>
                    <div style={{ fontSize:15, fontWeight:600 }}>{form.last_name || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:'var(--color-textSecondary)' }}>Phone</div>
                    <div style={{ fontSize:15, fontWeight:600 }}>{form.phone || '-'}</div>
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span style={{ fontSize:12, color:'var(--color-textSecondary)' }}>First Name</span>
                    <input name="first_name" value={form.first_name} onChange={onChange} className="input" style={{ height:40, borderRadius:8, border:'1px solid var(--color-border)', padding:'0 0.75rem', background:'var(--color-background)' }} />
                  </label>
                  <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span style={{ fontSize:12, color:'var(--color-textSecondary)' }}>Last Name</span>
                    <input name="last_name" value={form.last_name} onChange={onChange} className="input" style={{ height:40, borderRadius:8, border:'1px solid var(--color-border)', padding:'0 0.75rem', background:'var(--color-background)' }} />
                  </label>
                  <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span style={{ fontSize:12, color:'var(--color-textSecondary)' }}>Phone</span>
                    <input name="phone" value={form.phone} onChange={onChange} className="input" style={{ height:40, borderRadius:8, border:'1px solid var(--color-border)', padding:'0 0.75rem', background:'var(--color-background)' }} />
                  </label>
                  <div style={{ gridColumn:'1 / -1', display:'flex', gap:'0.75rem' }}>
                    <button type="submit" className="btn" style={{ background:'var(--color-primary)', color:'#fff', border:'none', borderRadius:8, padding:'0.6rem 1rem' }}>Save Changes</button>
                    <button type="button" className="btn" style={{ border:'1px solid var(--color-border)', borderRadius:8, padding:'0.6rem 1rem', background:'var(--color-surfaceVariant)' }} onClick={() => setEditMode(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminProfile;
