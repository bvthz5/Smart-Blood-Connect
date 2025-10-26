import React, { useEffect, useState } from 'react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import seekerService from '../../services/seekerService';
import './HospitalProfile.css';

const HospitalProfile = () => {
  const [profile, setProfile] = useState({ name: '', address: '', staff_name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await seekerService.getHospital();
        setProfile({
          name: data?.name || '',
          address: data?.address || '',
          staff_name: data?.staff_name || '',
          phone: data?.phone || '',
          email: data?.email || ''
        });
      } catch (_) { /* no-op */ }
    })();
  }, []);

  const onLogout = () => { localStorage.removeItem('seeker_token'); localStorage.removeItem('token'); localStorage.removeItem('seeker_refresh_token'); window.location.href = '/seeker/login'; };

  const save = async () => {
    setSaving(true);
    try {
      await seekerService.updateHospital({ staff_name: profile.staff_name, phone: profile.phone, email: profile.email });
    } finally { setSaving(false); }
  };

  return (
    <SeekerLayout navbar={<SeekerNavbar onLogout={onLogout} />} sidebar={<SeekerSidebar />}>
      <div className="page-wrap">
        <div className="grid-2">
          <div className="card section">
            <h3>Hospital Details</h3>
            <div className="readonly">
              <label><span>Name</span><input value={profile.name} readOnly /></label>
              <label><span>Address</span><textarea value={profile.address} readOnly rows={4} /></label>
            </div>
          </div>
          <div className="card section">
            <h3>Staff Profile</h3>
            <div className="form-grid">
              <label><span>Name</span><input value={profile.staff_name} onChange={(e)=>setProfile(p=>({...p,staff_name:e.target.value}))} /></label>
              <label><span>Phone</span><input value={profile.phone} onChange={(e)=>setProfile(p=>({...p,phone:e.target.value}))} /></label>
              <label><span>Email</span><input value={profile.email} onChange={(e)=>setProfile(p=>({...p,email:e.target.value}))} /></label>
            </div>
            <div className="actions">
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save Changes'}</button>
            </div>
          </div>
        </div>
      </div>
    </SeekerLayout>
  );
};

export default HospitalProfile;
