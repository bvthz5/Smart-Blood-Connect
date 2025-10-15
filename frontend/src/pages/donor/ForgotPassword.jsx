import React, { useState } from "react";
import api from "../../services/api";

export default function ForgotPassword(){
  const [ident, setIdent] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [stage, setStage] = useState(0);

  async function sendOtp(e){
    e.preventDefault();
    try{
      const response = await api.post("/api/auth/forgot-password", { email_or_phone: ident });
      // Store user_id from response for later use
      if (response.data.user_id) {
        setUserId(response.data.user_id);
      }
      alert("If account exists, OTP has been sent to your registered phone number.");
      setStage(1);
    }catch(err){ 
      alert(err?.response?.data?.error || "Failed to send OTP. Please try again."); 
    }
  }

  async function reset(e){
    e.preventDefault();
    try{
      // Use the user_id from the forgot-password response
      const payload = { 
        user_id: userId, 
        otp, 
        new_password: newPassword 
      };
      await api.post("/api/auth/reset-password", payload);
      alert("Password reset successfully. Please login with your new password.");
      window.location.href = "/donor/login";
    }catch(err){ 
      alert(err?.response?.data?.error || "Failed to reset password. Please try again."); 
    }
  }

  if(stage===1){
    return (
      <div className="max-w-md mx-auto bg-white p-6 shadow rounded">
        <h2 className="text-lg font-semibold mb-3">Reset Password</h2>
        <form onSubmit={reset}>
          <input 
            id="forgot-otp"
            name="otp"
            className="w-full border p-2 rounded mb-2" 
            placeholder="OTP" 
            value={otp} 
            onChange={e=>setOtp(e.target.value)}
            autoComplete="one-time-code"
            inputMode="numeric"
            type="text"
            maxLength="6"
          />
          <input 
            id="forgot-new-password"
            name="new_password"
            className="w-full border p-2 rounded mb-2" 
            type="password" 
            placeholder="New password" 
            value={newPassword} 
            onChange={e=>setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button 
            id="forgot-reset"
            type="submit"
            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors"
          >
            Reset
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 shadow rounded">
      <h2 className="text-lg font-semibold mb-3">Forgot Password</h2>
      <form onSubmit={sendOtp}>
        <input 
          id="forgot-email-phone"
          name="email_or_phone"
          className="w-full border p-2 rounded mb-2" 
          placeholder="Email or Phone" 
          value={ident} 
          onChange={e=>setIdent(e.target.value)}
          autoComplete="username"
          type="text"
        />
        <button 
          id="forgot-send-otp"
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
        >
          Send OTP
        </button>
      </form>
    </div>
  );
}
