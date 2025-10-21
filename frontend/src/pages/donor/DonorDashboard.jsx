import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDonorProfile, getDonorDashboard, setAvailability, getDonorMatches, respondToMatch } from "../../services/api";
import { encodeId } from "../../services/donorService";
import "./donor-dashboard.css";

export default function DonorDashboard(){
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [matches, setMatches] = useState([]);
  const [toast, setToast] = useState("");
  const nav = useNavigate();

  function initial(name){
    const n = (name || "").trim();
    return n ? n[0].toUpperCase() : "D";
  }

  async function load(){
    // Load profile and metrics first; then matches separately so a failure in matches
    // doesn't prevent the dashboard from rendering
    try {
      const [p, d] = await Promise.all([
        getDonorProfile(),
        getDonorDashboard(),
      ]);
      setProfile(p.data);
      setMetrics(d.data);
    } catch(err){
      console.error(err);
      if (err?.response?.status === 401) return; // interceptor redirects with toast
      const msg = err?.response?.data?.error || "Failed to load donor dashboard.";
      setToast(msg);
      setTimeout(()=> setToast(""), 4000);
      if (err?.response?.status === 403) {
        localStorage.setItem('toast_message', msg);
        nav('/donor/login', { replace: true });
      }
      return; // don't proceed to matches if base load failed
    }

    // Load matches separately and handle errors gracefully
    try {
      const m = await getDonorMatches();
      setMatches(Array.isArray(m.data) ? m.data : []);
    } catch(err){
      console.error(err);
      if (err?.response?.status === 401) return; // interceptor will redirect
      const msg = err?.response?.data?.error || "Failed to load matches.";
      setToast(msg);
      setTimeout(()=> setToast(""), 3000);
      if (err?.response?.status === 403) {
        localStorage.setItem('toast_message', msg);
        nav('/donor/login', { replace: true });
      }
    }
  }
  useEffect(()=>{ load(); }, []);

  async function toggle(status){
    try {
      await setAvailability(status);
      load();
    } catch(e){ setToast("Failed to update availability"); setTimeout(()=> setToast(""), 3000); }
  }

  async function respond(matchId, action){
    try {
      await respondToMatch(matchId, action);
      load();
    } catch(e){ setToast("Action failed"); setTimeout(()=> setToast(""), 3000); }
  }

  if(!profile || !metrics) return <div>Loading...</div>;
  return (
    <div className="donor-dashboard">
      <div className="dashboard-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-xl shadow-sm card header-card">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold avatar">
            {initial(metrics.name || profile.name)}
          </div>
          <div>
            <div className="text-gray-500 text-sm">Welcome back</div>
            <div className="text-xl font-semibold">{metrics.name || profile.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm status-chip ${profile.availability_status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {profile.availability_status === 'available' ? 'Available' : 'Unavailable'}
          </span>
          <button onClick={()=>toggle(profile.availability_status === 'available' ? 'unavailable' : 'available')} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 btn btn-primary">
            {profile.availability_status === 'available' ? 'Set Unavailable' : 'Set Available'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 card kpi-card">
          <div className="text-gray-500 text-sm">Total Donations</div>
          <div className="text-2xl font-bold mt-1">{metrics.total_donations || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 card kpi-card">
          <div className="text-gray-500 text-sm">Last Donated To</div>
          <div className="text-lg font-semibold mt-1">{metrics.last_donated_to || '—'}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 card kpi-card">
          <div className="text-gray-500 text-sm">Last Donation Date</div>
          <div className="text-lg font-semibold mt-1">{metrics.last_donation_date ? new Date(metrics.last_donation_date).toLocaleDateString() : '—'}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 card kpi-card">
          <div className="text-gray-500 text-sm">Eligible To Donate In</div>
          <div className="text-lg font-semibold mt-1">{metrics.eligible_in_days > 0 ? `${metrics.eligible_in_days} days` : 'Now'}</div>
        </div>
      </div>

      {/* Profile & Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 bg-white p-5 rounded-xl shadow-sm card profile-card">
          <h3 className="font-semibold mb-3">Your Profile</h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{profile.name}</span></div>
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{profile.phone}</span></div>
            <div><span className="text-gray-500">Blood Group:</span> <span className="font-medium">{profile.blood_group}</span></div>
            <div><span className="text-gray-500">Reliability Score:</span> <span className="font-medium">{(metrics.reliability_score ?? 0).toFixed(2)}</span></div>
          </div>
          <div className="mt-4">
            <Link
              to={`/donor/edit-profile/${encodeId(profile.donor_id || profile.id)}`}
              className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        <div className="col-span-2 bg-white p-5 rounded-xl shadow-sm card matches-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Your Matches</h3>
            <span className="text-sm text-gray-500">Active: {metrics.active_matches_count || 0}</span>
          </div>
          {matches.length===0 && <div className="text-sm text-gray-500">No matches yet.</div>}
          <ul className="space-y-2">
            {matches.map(m => (
              <li key={m.match_id} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center match-item">
                <div>
                  <div className="font-medium">Request: {m.request_id}</div>
                  <div className="text-sm text-gray-500">Score: {m.score} • Status: {m.response||"pending"}</div>
                </div>
                <div className="space-x-2">
                  <button onClick={()=>respond(m.match_id, "accept")} className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 btn btn-accept">Accept</button>
                  <button onClick={()=>respond(m.match_id, "reject")} className="px-3 py-1 bg-rose-500 text-white rounded-md hover:bg-rose-600 btn btn-reject">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
          <div style={{ background: '#1f2937', color: 'white', padding: '10px 14px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            {toast}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
