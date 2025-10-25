import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDonorProfile, updateDonorProfile } from "../../services/api";
import "./donor-profile.css";

// Generate default avatar with initials
const generateDefaultAvatar = (firstName, lastName) => {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'D';
  const colors = [
    '#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D',
    '#059669', '#0891B2', '#0284C7', '#2563EB', '#4F46E5',
    '#7C3AED', '#9333EA', '#C026D3', '#DB2777'
  ];
  const colorIndex = (firstName?.charCodeAt(0) || 0) % colors.length;
  const bgColor = colors[colorIndex];
  
  const svg = `
    <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
      <rect width="150" height="150" fill="${bgColor}"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".35em" 
            font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white">
        ${initials}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const DonorProfile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("personal");
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    profile_pic_url: "",
    address: "",
    city: "",
    district: "",
    state: "Kerala",
    pincode: "",
    blood_group: "",
    last_donation_date: "",
    reliability_score: 0,
    is_available: false,
    donation_count: 0,
    preferred_districts: [],
    notification_mode: "both",
    notification_timing: "immediate",
    show_on_leaderboard: true,
    location_lat: null,
    location_lng: null
  });
  
  const [aiInsights, setAiInsights] = useState({
    match_success_rate: 0,
    ai_reliability_index: 0,
    avg_response_time: 0,
    demand_forecast_area: ""
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await getDonorProfile();
      const data = res?.data || res || {};
      setProfile({
        first_name: data.first_name || data.name?.split(' ')[0] || "",
        last_name: data.last_name || data.name?.split(' ').slice(1).join(' ') || "",
        email: data.email || "",
        phone: data.phone || "",
        date_of_birth: data.date_of_birth || "",
        gender: data.gender || "",
        profile_pic_url: data.profile_pic_url || "",
        address: data.address || "",
        city: data.city || "",
        district: data.district || "",
        state: data.state || "Kerala",
        pincode: data.pincode || "",
        blood_group: data.blood_group || "",
        last_donation_date: data.last_donation_date || "",
        reliability_score: data.reliability_score || 0,
        is_available: data.is_available || false,
        donation_count: data.donation_count || 0,
        preferred_districts: data.preferred_districts || [],
        notification_mode: data.notification_mode || "both",
        notification_timing: data.notification_timing || "immediate",
        show_on_leaderboard: data.show_on_leaderboard !== false,
        location_lat: data.location_lat,
        location_lng: data.location_lng
      });
      
      // Mock AI insights - replace with actual API call
      setAiInsights({
        match_success_rate: 85,
        ai_reliability_index: 92,
        avg_response_time: 12,
        demand_forecast_area: data.district || "Not Available"
      });
    } catch (error) {
      showToast("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      await updateDonorProfile(profile);
      showToast("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      showToast("Failed to update profile");
    }
  }

  function handleCancel() {
    loadProfile();
    setIsEditing(false);
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  function handleInputChange(field, value) {
    setProfile({ ...profile, [field]: value });
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
        setProfile({ ...profile, profile_pic_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  }

  function getCurrentLocation() {
    if (navigator.geolocation) {
      showToast("Fetching your location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setProfile({
            ...profile,
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude
          });
          showToast("Location updated!");
        },
        () => showToast("Failed to get location")
      );
    } else {
      showToast("Geolocation not supported");
    }
  }

  if (loading) {
    return (
      <div className="donor-profile loading">
        <div className="loading-spinner">
          <div className="pulse-ring"></div>
          <div className="blood-drop">🩸</div>
        </div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="donor-profile">
      {/* Header */}
      <header className="profile-header">
        <button className="back-btn" onClick={() => navigate('/donor/dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>🩸 Donor Profile</h1>
        <div className="header-actions">
          {!isEditing ? (
            <button className="btn-edit" onClick={() => setIsEditing(true)}>
              ✏️ Edit Profile
            </button>
          ) : (
            <>
              <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
              <button className="btn-save" onClick={handleSave}>💾 Save Changes</button>
            </>
          )}
        </div>
      </header>

      <div className="profile-container">
        {/* Left Sidebar - Profile Card */}
        <aside className="profile-sidebar">
          <div className="profile-card">
            <div className="profile-pic-wrapper">
              <img 
                src={profilePicPreview || profile.profile_pic_url || generateDefaultAvatar(profile.first_name, profile.last_name)} 
                alt="Profile" 
                className="profile-pic"
                onError={(e) => {
                  // Fallback to generated avatar if image fails to load
                  e.target.src = generateDefaultAvatar(profile.first_name, profile.last_name);
                }}
              />
              {isEditing && (
                <label htmlFor="profile-pic-upload" className="upload-btn">
                  📷 Change Photo
                  <input 
                    id="profile-pic-upload"
                    name="profile_picture"
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    hidden 
                  />
                </label>
              )}
            </div>
            
            <h2 className="profile-name">{profile.first_name} {profile.last_name}</h2>
            <p className="profile-email">{profile.email}</p>
            
            <div className="blood-badge">{profile.blood_group || "Not Set"}</div>
            
            <div className="availability-toggle-card">
              <label htmlFor="availability-toggle" className="switch">
                <input 
                  id="availability-toggle"
                  name="is_available"
                  type="checkbox" 
                  checked={profile.is_available}
                  onChange={(e) => handleInputChange('is_available', e.target.checked)}
                  disabled={!isEditing}
                />
                <span className="slider"></span>
              </label>
              <span className={`status-text ${profile.is_available ? 'available' : 'offline'}`}>
                {profile.is_available ? '🟢 Available' : '⚪ Offline'}
              </span>
            </div>

            <div className="quick-stats">
              <div className="stat-item">
                <span className="stat-icon">💉</span>
                <div>
                  <div className="stat-value">{profile.donation_count}</div>
                  <div className="stat-label">Donations</div>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">⭐</span>
                <div>
                  <div className="stat-value">{profile.reliability_score}%</div>
                  <div className="stat-label">Reliability</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content - Tabs */}
        <main className="profile-main">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              👤 Personal Info
            </button>
            <button 
              className={`tab ${activeTab === 'donation' ? 'active' : ''}`}
              onClick={() => setActiveTab('donation')}
            >
              💉 Donation Info
            </button>
            <button 
              className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              ⚙️ Preferences
            </button>
            <button 
              className={`tab ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              🧬 AI Insights
            </button>
          </div>

          <div className="tab-content">
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="tab-panel">
                <h3 className="section-title">🧍‍♂️ Personal Information</h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="profile-first-name">👤 First Name</label>
                    <input 
                      id="profile-first-name"
                      name="first_name"
                      type="text" 
                      value={profile.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="profile-last-name">👤 Last Name</label>
                    <input 
                      id="profile-last-name"
                      name="last_name"
                      type="text" 
                      value={profile.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="profile-email">📧 Email</label>
                    <input 
                      id="profile-email"
                      name="email"
                      type="email" 
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing}
                    />
                    {isEditing && <small>⚠️ Changing email requires verification</small>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="profile-phone">📞 Phone</label>
                    <input 
                      id="profile-phone"
                      name="phone"
                      type="tel" 
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!isEditing}
                    />
                    {isEditing && <small>⚠️ Changing phone requires OTP verification</small>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="profile-dob">📅 Date of Birth</label>
                    <input 
                      id="profile-dob"
                      name="date_of_birth"
                      type="date" 
                      value={profile.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="profile-gender">🚻 Gender</label>
                    <select 
                      id="profile-gender"
                      name="gender"
                      value={profile.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      disabled={!isEditing}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <h3 className="section-title mt-6">🏠 Contact & Location Details</h3>
                
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="profile-address">🏠 Address</label>
                    <textarea 
                      id="profile-address"
                      name="address"
                      value={profile.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={!isEditing}
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="profile-city">🏙️ City</label>
                    <input 
                      id="profile-city"
                      name="city"
                      type="text" 
                      value={profile.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="profile-district">🏡 District</label>
                    <input 
                      id="profile-district"
                      name="district"
                      type="text" 
                      value={profile.district}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="profile-state">🌍 State</label>
                    <input 
                      id="profile-state"
                      name="state"
                      type="text" 
                      value={profile.state}
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="profile-pincode">📍 Pin Code</label>
                    <input 
                      id="profile-pincode"
                      name="pincode"
                      type="text" 
                      value={profile.pincode}
                      onChange={(e) => handleInputChange('pincode', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label>📌 Location Coordinates</label>
                    <div className="location-display">
                      {profile.location_lat && profile.location_lng ? (
                        <span>📍 {profile.location_lat.toFixed(4)}, {profile.location_lng.toFixed(4)}</span>
                      ) : (
                        <span className="text-muted">Not set</span>
                      )}
                    </div>
                    {isEditing && (
                      <button className="btn-location" onClick={getCurrentLocation}>
                        📍 Use Current Location
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Donation Information Tab */}
            {activeTab === 'donation' && (
              <div className="tab-panel">
                <h3 className="section-title">💉 Donation Information</h3>
                
                <div className="info-cards">
                  <div className="info-card">
                    <div className="info-icon">🩸</div>
                    <div className="info-content">
                      <label>Blood Group</label>
                      <div className="info-value">{profile.blood_group || "Not Set"}</div>
                      <small>🔒 Admin-verified only</small>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">📅</div>
                    <div className="info-content">
                      <label>Last Donation Date</label>
                      <div className="info-value">
                        {profile.last_donation_date ? 
                          new Date(profile.last_donation_date).toLocaleDateString() : 
                          "Never"
                        }
                      </div>
                      <small>🔒 Admin-verified only</small>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">⭐</div>
                    <div className="info-content">
                      <label>Reliability Score</label>
                      <div className="info-value">{profile.reliability_score}%</div>
                      <small>🔒 Auto-calculated by system</small>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">💉</div>
                    <div className="info-content">
                      <label>Total Donations</label>
                      <div className="info-value">{profile.donation_count}</div>
                      <small>🔒 Auto-calculated from history</small>
                    </div>
                  </div>

                  <div className="info-card clickable">
                    <div className="info-icon">💪</div>
                    <div className="info-content">
                      <label>Availability Status</label>
                      <div className="availability-inline">
                        <label className="switch-inline">
                          <input 
                            type="checkbox" 
                            checked={profile.is_available}
                            onChange={(e) => handleInputChange('is_available', e.target.checked)}
                          />
                          <span className="slider-inline"></span>
                        </label>
                        <span className={profile.is_available ? 'text-success' : 'text-muted'}>
                          {profile.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="tab-panel">
                <h3 className="section-title">🔔 Preferences</h3>
                
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>🗺️ Preferred Districts</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Ernakulam, Kottayam, Thrissur"
                      value={profile.preferred_districts.join(', ')}
                      onChange={(e) => handleInputChange('preferred_districts', e.target.value.split(',').map(d => d.trim()))}
                      disabled={!isEditing}
                    />
                    <small>For cross-district donation opportunities</small>
                  </div>

                  <div className="form-group">
                    <label>📱 Notification Mode</label>
                    <select 
                      value={profile.notification_mode}
                      onChange={(e) => handleInputChange('notification_mode', e.target.value)}
                      disabled={!isEditing}
                    >
                      <option value="email">Email Only</option>
                      <option value="sms">SMS Only</option>
                      <option value="both">Both Email & SMS</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>⏰ Notification Timing</label>
                    <select 
                      value={profile.notification_timing}
                      onChange={(e) => handleInputChange('notification_timing', e.target.value)}
                      disabled={!isEditing}
                    >
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily Summary</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={profile.show_on_leaderboard}
                        onChange={(e) => handleInputChange('show_on_leaderboard', e.target.checked)}
                        disabled={!isEditing}
                      />
                      <span>🧾 Show me on the Leaderboard</span>
                    </label>
                    <small>Your donation count and rank will be visible to others</small>
                  </div>
                </div>
              </div>
            )}

            {/* AI Insights Tab */}
            {activeTab === 'insights' && (
              <div className="tab-panel">
                <h3 className="section-title">🧬 AI Insights (View Only)</h3>
                <p className="section-description">
                  These metrics are automatically calculated by our AI models based on your donation history and behavior.
                </p>
                
                <div className="insights-grid">
                  <div className="insight-card">
                    <div className="insight-icon">⚙️</div>
                    <div className="insight-content">
                      <label>Match Success Rate</label>
                      <div className="insight-value">{aiInsights.match_success_rate}%</div>
                      <div className="insight-bar">
                        <div className="insight-fill" style={{ width: `${aiInsights.match_success_rate}%` }}></div>
                      </div>
                      <small>Percentage of accepted donation requests</small>
                    </div>
                  </div>

                  <div className="insight-card">
                    <div className="insight-icon">🤖</div>
                    <div className="insight-content">
                      <label>AI Reliability Index</label>
                      <div className="insight-value">{aiInsights.ai_reliability_index}%</div>
                      <div className="insight-bar">
                        <div className="insight-fill" style={{ width: `${aiInsights.ai_reliability_index}%` }}></div>
                      </div>
                      <small>ML model prediction score</small>
                    </div>
                  </div>

                  <div className="insight-card">
                    <div className="insight-icon">📊</div>
                    <div className="insight-content">
                      <label>Average Response Time</label>
                      <div className="insight-value">{aiInsights.avg_response_time} min</div>
                      <small>Based on match prediction logs</small>
                    </div>
                  </div>

                  <div className="insight-card">
                    <div className="insight-icon">📍</div>
                    <div className="insight-content">
                      <label>Demand Forecast Area</label>
                      <div className="insight-value">{aiInsights.demand_forecast_area}</div>
                      <small>AI-predicted high-demand region for your blood type</small>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          <div className="toast-content">
            <span>{toast}</span>
            <button onClick={() => setToast("")}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonorProfile;
