import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDonorProfile, updateDonorProfile } from "../../services/api";
import { donorService, decodeId } from "../../services/donorService";

export default function EditProfile(){
  const [form, setForm] = useState(null);
  const { encodedId } = useParams();

  useEffect(()=>{ load(); }, [encodedId]);
  async function load(){
    try{
      let res;
      if (encodedId) {
        // If encodedId is provided, fetch profile by ID
        res = await donorService.getProfileById(encodedId);
      } else {
        // Otherwise, fetch current user's profile
        res = await getDonorProfile();
      }
      setForm({ 
        name: res.name, 
        email: res.email, 
        blood_group: res.blood_group,
        phone: res.phone 
      });
    }catch(e){ 
      console.error(e);
      alert("Failed to load profile data");
    }
  }

  async function submit(e){
    e.preventDefault();
    try{
      await updateDonorProfile(form);
      alert("Profile updated");
    }catch(err){ alert("Failed"); }
  }

  if(!form) return <div>Loading...</div>;
  return (
    <div className="max-w-md mx-auto bg-white p-6 shadow rounded">
      <h2 className="text-lg font-semibold mb-3">Edit Profile</h2>
      <form onSubmit={submit}>
        <input 
          id="edit-profile-name"
          name="name"
          type="text"
          className="w-full border p-2 rounded mb-2" 
          placeholder="Name" 
          value={form.name || ''} 
          onChange={e=>setForm({...form, name:e.target.value})} 
        />
        <input 
          id="edit-profile-email"
          name="email"
          type="email"
          className="w-full border p-2 rounded mb-2" 
          placeholder="Email" 
          value={form.email || ''} 
          onChange={e=>setForm({...form, email:e.target.value})} 
        />
        <input 
          id="edit-profile-phone"
          name="phone"
          type="tel"
          className="w-full border p-2 rounded mb-2" 
          placeholder="Phone" 
          value={form.phone || ''} 
          onChange={e=>setForm({...form, phone:e.target.value})} 
        />
        <input 
          id="edit-profile-blood-group"
          name="blood_group"
          type="text"
          className="w-full border p-2 rounded mb-2" 
          placeholder="Blood group" 
          value={form.blood_group || ''} 
          onChange={e=>setForm({...form, blood_group:e.target.value})} 
        />
        <button 
          id="edit-profile-save"
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
      </form>
    </div>
  );
}