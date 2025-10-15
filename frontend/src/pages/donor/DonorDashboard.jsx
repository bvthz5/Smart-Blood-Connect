import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDonorProfile, setAvailability, getDonorMatches, respondToMatch } from "../../services/api";
import { encodeId } from "../../services/donorService";

export default function DonorDashboard(){
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);

  async function load(){
    try {
      const p = await getDonorProfile();
      setProfile(p.data);
      const m = await getDonorMatches();
      setMatches(m.data);
    } catch(err){
      console.error(err);
      alert("Failed to load dashboard");
    }
  }
  useEffect(()=>{ load(); }, []);

  async function toggle(status){
    try {
      await setAvailability(status);
      load();
    } catch(e){ alert("Failed update"); }
  }

  async function respond(matchId, action){
    try {
      await respondToMatch(matchId, action);
      load();
    } catch(e){ alert("Failed"); }
  }

  if(!profile) return <div>Loading...</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="col-span-1 bg-white p-4 rounded shadow">
        <h3 className="font-semibold">Profile</h3>
        <p>Name: {profile.name}</p>
        <p>Phone: {profile.phone}</p>
        <p>Blood: {profile.blood_group}</p>
        <p>Availability: {profile.availability_status}</p>
        <div className="mt-3 space-y-2">
          <div>
            <Link 
              to={`/donor/edit-profile/${encodeId(profile.donor_id || profile.id)}`}
              className="block w-full text-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Edit Profile
            </Link>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>toggle("available")} className="flex-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">Set Available</button>
            <button onClick={()=>toggle("unavailable")} className="flex-1 px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 transition-colors">Set Unavailable</button>
          </div>
        </div>
      </div>

      <div className="col-span-2 bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-3">Matches</h3>
        {matches.length===0 && <div>No matches</div>}
        <ul className="space-y-2">
          {matches.map(m => (
            <li key={m.match_id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div>Request: {m.request_id}</div>
                <div>Score: {m.score}</div>
                <div>Response: {m.response||"pending"}</div>
              </div>
              <div className="space-x-2">
                <button onClick={()=>respond(m.match_id, "accept")} className="px-3 py-1 bg-blue-600 text-white rounded">Accept</button>
                <button onClick={()=>respond(m.match_id, "reject")} className="px-3 py-1 bg-red-400 rounded">Reject</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
