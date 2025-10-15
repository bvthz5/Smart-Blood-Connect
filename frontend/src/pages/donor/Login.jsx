import React, { useState } from "react";
import { login } from "../../services/api";
import { useNavigate } from "react-router-dom";
import '../../styles/donor-auth.css'

export default function Login(){
  const [ident, setIdent] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();

  async function submit(e){
    e.preventDefault();
    try{
      const res = await login({ email_or_phone: ident, password });
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      nav("/donor/dashboard");
    }catch(err){
      alert(err?.response?.data?.error || "Login failed");
    }
  }

  return (
    <div className="auth-card auth-animate">
      <h2 className="text-xl font-semibold mb-3">Donor Login</h2>
      <form onSubmit={submit}>
        <div className="form-row">
          <input 
            id="donor-login-ident"
            name="email_or_phone"
            className="" 
            placeholder="Email or Phone" 
            value={ident} 
            onChange={e=>setIdent(e.target.value)}
            autoComplete="username"
            type="text"
          />
        </div>
        <div className="form-row">
          <input 
            id="donor-login-password"
            name="password"
            type="password" 
            className="" 
            placeholder="Password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
          <a className="text-sm text-blue-600" href="/donor/forgot">Forgot?</a>
        </div>
        <button 
          id="donor-login-submit"
          type="submit"
          className="btn btn--primary"
        >
          Login
        </button>
      </form>
    </div>
  );
}
