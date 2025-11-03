import React, { useState, useEffect, useRef } from "react";
import { registerDonor, verifyOtp, updateDonorProfile, sendContactOtp, verifyEmailOtp, checkAvailability } from "../../services/api";
import { useNavigate, Link } from "react-router-dom";
import Nav from "../../components/Nav";
import '../../styles/donor-auth.css'

export default function Register() {
  // Max DOB allowed = today - 18 years
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  const maxDobStr = eighteenYearsAgo.toISOString().split("T")[0];
  // Step state: 0 = basic details, 1 = additional details, 2 = phone OTP
  const [step, setStep] = useState(0);

  // Split name into first/last for UI; will combine on submit for backend
  const [basic, setBasic] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [additional, setAdditional] = useState({ blood_group: "", date_of_birth: "", city: "", district: "", pincode: "" });

  // OTP flow
  const [otpSent, setOtpSent] = useState(false);
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState("");
  const [phoneOtpKey, setPhoneOtpKey] = useState("");

  // Contact verification (email + phone)
  const [emailCode, setEmailCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    blood_group: "",
    date_of_birth: "",
    city: "",
    district: "",
    pincode: "",
  });
  const nav = useNavigate();
  // Date picker ref and real-time DOB validation
  const dobInputRef = useRef(null);
  const is18OrOlder = (dobStr) => {
    if (!dobStr) return false;
    const dob = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 18;
  };
  const handleDobChange = (value) => {
    setAdditional((prev) => ({ ...prev, date_of_birth: value }));
    if (!value) {
      setFieldErrors((f) => ({ ...f, date_of_birth: 'Date of birth is required' }));
      return;
    }
    const ok = is18OrOlder(value);
    setFieldErrors((f) => ({ ...f, date_of_birth: ok ? '' : 'You must be at least 18 years old to register as a donor.' }));
  };


  // Enable smooth scroll on window for this page
  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    // Save original scroll behavior
    const originalHtmlScroll = htmlElement.style.scrollBehavior;
    const originalBodyScroll = bodyElement.style.scrollBehavior;

    // Apply smooth scroll
    htmlElement.style.scrollBehavior = 'smooth';
    bodyElement.style.scrollBehavior = 'smooth';

    // Cleanup: restore original behavior when component unmounts
    return () => {
      htmlElement.style.scrollBehavior = originalHtmlScroll;
      bodyElement.style.scrollBehavior = originalBodyScroll;
    };
  }, []);

  // Live availability check (debounced) for email & phone
  useEffect(() => {
    const h = setTimeout(async () => {
      const email = (basic.email || '').trim();
      const phone = (basic.phone || '').trim();
      if (!email && !phone) return;
      try {
        // Validate simple formats before hitting API
        const looksEmail = !email || /.+@.+\..+/.test(email);
        const digits = phone.replace(/\D/g, '');
        const looksPhone = !phone || digits.length === 10;
        // If format invalid, show format error and stop
        if (email && !looksEmail) {
          setFieldErrors((f) => ({ ...f, email: 'Enter a valid email address' }));
          return;
        }
        if (phone && !looksPhone) {
          setFieldErrors((f) => ({ ...f, phone: 'Enter a valid 10-digit mobile number' }));
          return;
        }

        // Formats look fine; check availability
        const res = await checkAvailability({ email: email || undefined, phone: digits || undefined });
        const { email_exists, phone_exists } = res.data || {};

        // Clear format errors and set exists errors precisely
        setFieldErrors((f) => ({
          ...f,
          email: email ? (email_exists ? 'Email already exists' : '') : '',
          phone: phone ? (phone_exists ? 'Phone number already exists' : '') : '',
        }));
      } catch (_) { /* ignore transient errors */ }
    }, 400);
    return () => clearTimeout(h);
  }, [basic.email, basic.phone]);

  async function handleNextFromBasic(e) {
    e.preventDefault();
    setError("");
    const errs = {};
    if (!basic.first_name.trim()) errs.first_name = 'First name is required';
    if (!basic.last_name.trim()) errs.last_name = 'Last name is required';
    const phoneDigits = (basic.phone || '').replace(/\D/g, '');
    if (!phoneDigits) errs.phone = 'Phone number is required';
    else if (phoneDigits.length !== 10) errs.phone = 'Enter a valid 10-digit mobile number';
    if (!basic.password || basic.password.length < 6) errs.password = 'Password must be at least 6 characters';

    if (basic.email && !/.+@.+\..+/.test(basic.email)) {
      errs.email = 'Enter a valid email address';
    }

    // Respect live availability flags
    if (!errs.email && fieldErrors.email && /exists/.test(fieldErrors.email)) errs.email = fieldErrors.email;
    if (!errs.phone && fieldErrors.phone && /exists/.test(fieldErrors.phone)) errs.phone = fieldErrors.phone;

    setFieldErrors((f)=>({ ...f, ...errs }));
    if (Object.keys(errs).length) return;

    setBasic({ ...basic, phone: phoneDigits });
    setStep(1);
  }

  async function submitRegistration(e){
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Validate step 1 fields
      const errs = {};
      if (!additional.blood_group) errs.blood_group = 'Blood group is required';
      if (!additional.date_of_birth) errs.date_of_birth = 'Date of birth is required';
      if (!additional.city || !additional.city.trim()) errs.city = 'City is required';
      if (!additional.district) errs.district = 'District is required';
      if (!/^[1-9][0-9]{5}$/.test(additional.pincode || '')) errs.pincode = 'Enter a valid 6-digit PIN code';

      // Validate DOB present and age >= 18
      if (!additional.date_of_birth) {
        setFieldErrors((f)=>({ ...f, ...errs }));
        setError("Please select your date of birth");
        setLoading(false);
        return;
      }
      const dob = new Date(additional.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const mo = today.getMonth() - dob.getMonth();
      if (mo < 0 || (mo === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        setFieldErrors((f)=>({ ...f, date_of_birth: 'You must be at least 18 years old to register as a donor.' }));
        setError("You must be at least 18 years old to register as a donor.");
        setLoading(false);
        return;
      }

      if (Object.keys(errs).length) {
        setFieldErrors((f)=>({ ...f, ...errs }));
        setError("Please fix the highlighted fields");
        setLoading(false);
        return;
      }

      const payload = {
        name: `${basic.first_name} ${basic.last_name}`.trim(),
        email: basic.email || undefined,
        phone: basic.phone.replace(/\D/g, ""), // send only 10 digits; backend will normalize to +91
        password: basic.password,
        blood_group: additional.blood_group,
        date_of_birth: additional.date_of_birth,
        city: additional.city,
        district: additional.district,
        pincode: additional.pincode,
      };
  const res = await registerDonor(payload);
  setUserId(res.data.user_id);
  if (res.data?.otp_key) setPhoneOtpKey(res.data.otp_key);
      setOtpSent(true);
      setStep(2);
    } catch(err){
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function confirmOtp(e){
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!phoneOtpKey) {
        setError("Missing OTP session. Please resend SMS code.");
        setLoading(false);
        return;
      }
      const res = await verifyOtp({ user_id: userId, otp, otp_key: phoneOtpKey });
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);

      // After successful verification, update additional profile fields (non-blocking if backend supports)
      const extra = { ...additional };
      Object.keys(extra).forEach((k) => { if (!extra[k]) delete extra[k]; });
      if (Object.keys(extra).length) {
        try { await updateDonorProfile(extra); } catch (_) {}
      }

      // Redirect to donor login after successful verification
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      nav("/donor/login");
    } catch(err){
      setError(err.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  // Send/resend OTP to phone via API
  async function sendPhoneOtp() {
    if (!userId) return;
    setError("");
    setPhoneSending(true);
    try {
      const r = await sendContactOtp({ user_id: userId, channel: "phone" });
      if (r?.data?.otp_key) setPhoneOtpKey(r.data.otp_key);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to send SMS OTP");
    } finally {
      setPhoneSending(false);
    }
  }

  // Send OTP to email if provided
  const [emailOtpKey, setEmailOtpKey] = useState("");
  async function sendEmailOtp() {
    if (!userId || !basic.email) return;
    setError("");
    setEmailSending(true);
    try {
      const r = await sendContactOtp({ user_id: userId, channel: "email" });
      if (r?.data?.otp_key) setEmailOtpKey(r.data.otp_key);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to send Email OTP");
    } finally {
      setEmailSending(false);
    }
  }

  // Verify email code
  async function confirmEmailCode(e) {
    e?.preventDefault?.();
    if (!userId || emailVerified) return;
    setError("");
    setLoading(true);
    try {
      if (!emailOtpKey) {
        setError("Please send the Email code first.");
        setLoading(false);
        return;
      }
      await verifyEmailOtp({ user_id: userId, otp: emailCode, otp_key: emailOtpKey });
      setEmailVerified(true);
    } catch (err) {
      setError(err?.response?.data?.error || "Email OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  function resetAllAndStartOver(e) {
    e?.preventDefault?.();
    // Clear all local state and go back to the first step
    setStep(0);
    setBasic({ first_name: "", last_name: "", email: "", phone: "", password: "" });
    setAdditional({ blood_group: "", date_of_birth: "", city: "", district: "", pincode: "" });
    setOtpSent(false);
    setUserId(null);
    setOtp("");
    setEmailCode("");
    setEmailVerified(false);
    setPhoneSending(false);
    setEmailSending(false);
    setLoading(false);
    setError("");
    // Optionally navigate to ensure URL is clean
    try { nav("/donor/register", { replace: true }); } catch (_) {}
  }


  if(otpSent || step === 2) {
    return (
      <>
        <Nav />
        <div className="donor-auth-container">
          <div className="donor-auth-wrapper">
            {/* Left Side - Branding */}
            <div className="donor-auth-brand">
              <div className="donor-auth-brand-content">
                <div className="donor-auth-icon">✓</div>
                <h1>Verify Your Phone</h1>
                <p>We've sent a verification code to your phone</p>
                <div className="donor-auth-benefits">
                  <div className="benefit-item">
                    <span className="benefit-icon">📱</span>
                    <span>Check your SMS for OTP</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">⏱️</span>
                    <span>Code expires in 10 minutes</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">🔐</span>
                    <span>Your account is secure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - OTP Form */}
            <div className="donor-auth-form-wrapper">
              <div className="donor-auth-card">
                <div className="donor-auth-header">
                  <h2>Enter Verification Code</h2>
                  <p>Please enter the 6-digit code sent to your phone number</p>
                </div>

                {error && (
                  <div className="donor-auth-error">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Verify controls for Phone & Email */}
                <div className="donor-form-row" style={{display:'flex', gap:'10px', marginBottom: '12px'}}>
                  <button type="button" className="donor-btn-secondary" onClick={sendPhoneOtp} disabled={phoneSending || !userId}>
                    {phoneSending ? 'Sending SMS...' : 'Send/Resend SMS Code'}
                  </button>
                  {basic.email ? (
                    <button type="button" className="donor-btn-secondary" onClick={sendEmailOtp} disabled={emailSending || !userId || emailVerified}>
                      {emailVerified ? 'Email Verified \u2713' : (emailSending ? 'Sending Email...' : 'Send Email Code')}
                    </button>
                  ) : null}
                </div>

                {basic.email && !emailVerified && (
                  <form onSubmit={confirmEmailCode} className="donor-auth-form" style={{marginTop:'4px'}}>
                    <div className="donor-form-group">
                      <label htmlFor="donor-email-otp">Email Verification Code</label>
                      <div className="donor-input-wrapper no-icon">
                        <input
                          id="donor-email-otp"
                          name="email_otp"
                          placeholder="000000"
                          value={emailCode}
                          onChange={e=>setEmailCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
                          autoComplete="one-time-code"
                          type="text"
                          inputMode="numeric"
                          maxLength="6"
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="donor-btn-secondary" disabled={loading || emailCode.length !== 6}>
                      {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                  </form>
                )}


                <form onSubmit={confirmOtp} className="donor-auth-form">
                  <div className="donor-form-group">
                    <label htmlFor="donor-otp">Verification Code</label>
                    <div className="donor-input-wrapper no-icon">
                                            <input
                        id="donor-otp"
                        name="otp"
                        placeholder="000000"
                        value={otp}
                        onChange={e=>setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        autoComplete="one-time-code"
                        type="text"
                        inputMode="numeric"
                        maxLength="6"
                        required
                      />
                    </div>
                  </div>

                  <button
                    id="donor-verify-otp"
                    type="submit"
                    className="donor-btn-primary"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? "Verifying..." : "Verify & Finish"}
                  </button>
                </form>

                <p className="donor-auth-footer">
                  Didn't receive the code? <a href="/donor/register" className="donor-link" onClick={resetAllAndStartOver}>Start over</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="donor-auth-container">
        <div className="donor-auth-wrapper">
          {/* Left Side - Branding */}
          <div className="donor-auth-brand">
            <div className="donor-auth-brand-content">
              <div className="donor-auth-icon">🩸</div>
              <h1>Join SmartBlood</h1>
              <p>Become a Life-Saving Donor</p>
              <div className="donor-auth-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">❤️</span>
                  <span>Save lives in your community</span>
                </div>
                <div className="benefit-item">
                      {fieldErrors.first_name ? (
                        <div className="donor-field-error">{fieldErrors.first_name}</div>
                      ) : null}

                  <span className="benefit-icon">📊</span>
                  <span>Track your donation history</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">🏆</span>
                  <span>Earn recognition badges</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Register Form (2 steps) */}
          <div className="donor-auth-form-wrapper">
            <div className="donor-auth-card">
              <div className="donor-auth-header">
                <h2>{step === 0 ? "Create Your Account" : "Additional Details"}</h2>
                <p>{step === 0 ? "Start with your basic information" : "Tell us more to personalize your experience"}</p>
              </div>

              {error && (
                <div className="donor-auth-error">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {step === 0 && (
                <form onSubmit={handleNextFromBasic} className="donor-auth-form">
                  <div className="donor-form-row">
                    <div className="donor-form-group">
                      <label htmlFor="donor-first-name">First Name</label>
                      <div className="donor-input-wrapper no-icon">
                        <input
                          id="donor-first-name"
                          name="first_name"
                          placeholder="First name"
                          value={basic.first_name}
                          onChange={(e)=>setBasic({...basic, first_name: e.target.value})}
                          autoComplete="given-name"
                          type="text"
                          required
                        />
                                              </div>
                      {fieldErrors.first_name ? (
                        <div className="donor-field-error">{fieldErrors.first_name}</div>
                      ) : null}

                    </div>

                    <div className="donor-form-group">
                      <label htmlFor="donor-last-name">Last Name</label>
                      <div className="donor-input-wrapper no-icon">
                        <input
                          id="donor-last-name"
                          name="last_name"
                          placeholder="Last name"
                          value={basic.last_name}
                          onChange={(e)=>setBasic({...basic, last_name: e.target.value})}
                          autoComplete="family-name"
                          type="text"
                          required
                        />
                                              </div>
                      {fieldErrors.last_name ? (
                        <div className="donor-field-error">{fieldErrors.last_name}</div>
                      ) : null}

                    </div>
                  </div>

                  <div className="donor-form-row">

                    <div className="donor-form-group">
                      <label htmlFor="donor-register-email">Email (optional)</label>
                      <div className="donor-input-wrapper no-icon">
                        <input
                          id="donor-register-email"
                          name="email"
                          placeholder="your@email.com"
                          value={basic.email}
                          onChange={(e)=>setBasic({...basic, email: e.target.value})}
                          autoComplete="email"
                          type="email"
                        />
                      {fieldErrors.email ? (
                        <div className="donor-field-error">{fieldErrors.email}</div>
                      ) : null}

                                              </div>
                      {/* Optional email OTP could go here when backend endpoint is available */}
                    </div>

                    <div className="donor-form-group">
                      <label htmlFor="donor-register-phone">Phone Number (India)</label>
                      <div className="donor-input-wrapper phone-prefix">
                        <span className="phone-prefix-badge">+91</span>
                        <input
                          id="donor-register-phone"
                          name="phone"
                          placeholder="10-digit mobile number"
                          value={basic.phone}
                          onChange={(e)=>setBasic({...basic, phone: e.target.value.replace(/\D/g, '').slice(0,10)})}
                          autoComplete="tel"
                          type="tel"
                          inputMode="numeric"
                          maxLength="10"
                          required
                        />
                      </div>
                      {fieldErrors.phone ? (
                        <div className="donor-field-error">{fieldErrors.phone}</div>
                      ) : null}
                    </div>

                  </div>

                  <div className="donor-form-group">
                    <label htmlFor="donor-register-password">Password</label>
                    <div className="donor-input-wrapper password-wrapper no-icon">
                      <input
                        id="donor-register-password"
                        name="password"
                        type="password"
                        placeholder="Create a strong password"
                        value={basic.password}
                        onChange={(e)=>setBasic({...basic, password: e.target.value})}
                        autoComplete="new-password"
                        required
                      />
                                          </div>
                      {fieldErrors.password ? (
                        <div className="donor-field-error">{fieldErrors.password}</div>
                      ) : null}

                  </div>

                  <button type="submit" className="donor-btn-primary">

                    Next
                  </button>
                </form>
              )}

              {step === 1 && (
                <form onSubmit={submitRegistration} className="donor-auth-form">
                  <div className="donor-form-group">
                    <label htmlFor="donor-register-blood-group">Blood Group</label>
                    <div className="donor-input-wrapper no-icon">
                      <select
                        id="donor-register-blood-group"
                        name="blood_group"
                        value={additional.blood_group}
                        onChange={e=>setAdditional({...additional,blood_group:e.target.value})}
                        required
                      >
                        <option value="">Select your blood group</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                                          </div>
                      {fieldErrors.blood_group ? (
                        <div className="donor-field-error">{fieldErrors.blood_group}</div>
                      ) : null}

                  </div>

                  <div className="donor-form-row">
                    <div className="donor-form-group">
                      <label htmlFor="donor-dob">Date of Birth</label>
                      <div className="donor-input-wrapper no-icon has-right-icon">
                        <input
                          id="donor-dob"
                          name="date_of_birth"
                          type="date"
                          max={maxDobStr}
                          value={additional.date_of_birth}
                          onChange={(e)=>handleDobChange(e.target.value)}
                          ref={dobInputRef}
                          required
                        />
                        <button type="button" className="date-picker-icon-btn" aria-label="Open date picker" onClick={() => { if (dobInputRef?.current?.showPicker) { dobInputRef.current.showPicker(); } else { dobInputRef?.current?.focus(); } }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 1 1 2 0v1zm13 7H4v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9zM5 7h14V6a1 1 0 0 0-1-1h-1v1a1 1 0 1 1-2 0V5H8v1a1 1 0 1 1-2 0V5H5a1 1 0 0 0-1 1v1z"></path>
                          </svg>
                        </button>
                      </div>
                      {fieldErrors.date_of_birth ? (
                        <div className="donor-field-error">{fieldErrors.date_of_birth}</div>
                      ) : null}

                    </div>


                    <div className="donor-form-group">
                      <label htmlFor="donor-city">City</label>
                      <div className="donor-input-wrapper no-icon">
                        <input
                          id="donor-city"
                          name="city"
                          placeholder="City"
                          value={additional.city}
                          onChange={(e)=>setAdditional({...additional, city: e.target.value})}
                          type="text"
                          required
                        />
                                              </div>
                      {fieldErrors.city ? (
                        <div className="donor-field-error">{fieldErrors.city}</div>
                      ) : null}

                    </div>
                  </div>

                  <div className="donor-form-row">
                    <div className="donor-form-group">
                      <label htmlFor="donor-district">District (Kerala)</label>
                      <div className="donor-input-wrapper no-icon">
                        <select
                          id="donor-district"
                          name="district"
                          value={additional.district}
                          onChange={(e)=>setAdditional({...additional, district: e.target.value})}
                          required
                        >
                          <option value="">Select your district</option>
                          <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                          <option value="Kollam">Kollam</option>
                          <option value="Pathanamthitta">Pathanamthitta</option>
                          <option value="Alappuzha">Alappuzha</option>
                          <option value="Kottayam">Kottayam</option>
                          <option value="Idukki">Idukki</option>
                          <option value="Ernakulam">Ernakulam</option>
                          <option value="Thrissur">Thrissur</option>
                          <option value="Palakkad">Palakkad</option>
                          <option value="Malappuram">Malappuram</option>
                          <option value="Kozhikode">Kozhikode</option>
                          <option value="Wayanad">Wayanad</option>
                          <option value="Kannur">Kannur</option>
                          <option value="Kasaragod">Kasaragod</option>
                        </select>
                                              </div>
                      {fieldErrors.district ? (
                        <div className="donor-field-error">{fieldErrors.district}</div>
                      ) : null}

                    </div>

                    <div className="donor-form-group">
                      <label htmlFor="donor-pincode">Pincode</label>
                      <div className="donor-input-wrapper no-icon">
                        <input
                          id="donor-pincode"
                          name="pincode"
                          placeholder="e.g. 600001"
                          value={additional.pincode}
                          onChange={(e)=>setAdditional({...additional, pincode: e.target.value.replace(/\D/g,'').slice(0,6)})}
                          type="text"
                          inputMode="numeric"
                          pattern="^[1-9][0-9]{5}$"
                          title="Enter a valid 6-digit PIN code"
                          maxLength="6"
                          required
                        />
                                              </div>
                      {fieldErrors.pincode ? (
                        <div className="donor-field-error">{fieldErrors.pincode}</div>
                      ) : null}

                    </div>
                  </div>

                  <div className="donor-form-row">
                    <button type="button" className="donor-btn-secondary" onClick={()=>setStep(0)}>Back</button>
                    <button type="submit" className="donor-btn-primary" disabled={loading}>
                      {loading ? "Creating Account..." : "Create Account"}
                    </button>
                  </div>
                </form>
              )}

              <div className="donor-auth-divider">
                <span>Already have an account?</span>
              </div>

              <Link to="/donor/login" className="donor-btn-secondary">
                Sign In
              </Link>

              <p className="donor-auth-footer">
                By registering, you agree to our <Link to="/policies">Terms & Conditions</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
