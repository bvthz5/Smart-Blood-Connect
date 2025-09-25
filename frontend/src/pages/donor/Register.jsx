import React, { useState } from "react";
import { registerDonor, verifyOtp } from "../../api";
import { useNavigate } from "react-router-dom";
import '../../styles/donor-auth.css'

export default function Register() {
  const [form, setForm] = useState({ name:"", phone:"", email:"", password:"", blood_group:"" });
  const [otpSent, setOtpSent] = useState(false);
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState("");
  const nav = useNavigate();

  async function submit(e){
    e.preventDefault();
    try {
      const res = await registerDonor(form);
      setUserId(res.data.user_id);
      setOtpSent(true);
      alert("OTP sent (dev) - check backend logs");
    } catch(err){
      alert(err.response?.data?.error || "Register failed");
    }
  }

  async function confirmOtp(e){
    e.preventDefault();
    try {
      const res = await verifyOtp({ user_id: userId, otp });
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      nav("/donor/dashboard");
    } catch(err){
      alert(err.response?.data?.error || "OTP verify failed");
    }
  }

  if(otpSent) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-animate">
          <h2 className="text-lg font-semibold mb-3">Enter OTP</h2>
          <form onSubmit={confirmOtp}>
            <input className="" placeholder="OTP" value={otp} onChange={e=>setOtp(e.target.value)} />
            <button className="btn btn--primary" style={{marginTop:12}}>Verify</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-animate">
        <h2 className="text-lg font-semibold mb-3">Donor Register</h2>
        <form onSubmit={submit}>
          <div className="form-row"><input className="" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
          <div className="form-row"><input className="" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
          <div className="form-row"><input className="" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
          <div className="form-row"><input className="" placeholder="Blood group (e.g. B+)" value={form.blood_group} onChange={e=>setForm({...form,blood_group:e.target.value})} /></div>
          <div className="form-row"><input type="password" className="" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
          <button className="btn btn--primary">Register</button>
        </form>
      </div>
    </div>
  );
}
