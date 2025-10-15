import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import Navbar from '../../components/admin/Navbar';
import hospitalManagementService from '../../services/hospitalManagementService';
import './HospitalProfile.css';

const HospitalProfile = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState({ name: '', district: '', city: '', contact: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stats = await hospitalManagementService.getHospitals({ per_page: 1 });
        const first = stats?.items?.[0] || stats?.results?.[0];
        if (first) setProfile({ name: first.name || '', district: first.district || '', city: first.city || '', contact: first.contact || '' });
      } catch (_) {}
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      // demo save using updateHospital if id available; otherwise no-op
      // await hospitalManagementService.updateHospital(profile.id, profile);
    } finally { setSaving(false); }
  };

  return (
    <div className="pro-admin-layout">
      <Sidebar collapsed={false} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="pro-admin-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} />
        <div className="page-wrap">
          <div className="panel">
            <h2>Hospital Profile</h2>
            <div className="form-grid">
              <label>
                <span>Name</span>
                <input value={profile.name} onChange={(e)=>setProfile(p=>({...p,name:e.target.value}))} />
              </label>
              <label>
                <span>District</span>
                <input value={profile.district} onChange={(e)=>setProfile(p=>({...p,district:e.target.value}))} />
              </label>
              <label>
                <span>City</span>
                <input value={profile.city} onChange={(e)=>setProfile(p=>({...p,city:e.target.value}))} />
              </label>
              <label>
                <span>Contact</span>
                <input value={profile.contact} onChange={(e)=>setProfile(p=>({...p,contact:e.target.value}))} />
              </label>
              <div className="actions">
                <button className="btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalProfile;
