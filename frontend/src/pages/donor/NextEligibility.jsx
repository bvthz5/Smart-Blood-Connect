import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./next-eligibility.css";

const NextEligibility = () => {
  const navigate = useNavigate();
  const [eligibilityData, setEligibilityData] = useState({
    last_donation_date: "2024-01-15",
    hospital_name: "Medical Trust Hospital",
    donation_type: "Whole Blood",
    next_eligible_date: "",
    days_remaining: 0,
    is_eligible: false
  });

  const [ai_suggestions, setAiSuggestions] = useState([
    {
      icon: "💧",
      title: "Stay Hydrated",
      description: "Drink at least 3 liters of water daily to maintain optimal blood health."
    },
    {
      icon: "🥗",
      title: "Iron-Rich Diet",
      description: "Include spinach, beans, and lean meat to boost hemoglobin levels."
    },
    {
      icon: "😴",
      title: "Get Adequate Rest",
      description: "Ensure 7-8 hours of quality sleep for body recovery."
    },
    {
      icon: "🚶",
      title: "Light Exercise",
      description: "Engage in moderate physical activity for better circulation."
    }
  ]);

  const [predictions, setPredictions] = useState([
    {
      hospital: "Amrita Institute",
      blood_group: "O+",
      probability: 85,
      estimated_date: "2024-04-20"
    },
    {
      hospital: "Lakeshore Hospital",
      blood_group: "O+",
      probability: 72,
      estimated_date: "2024-04-25"
    }
  ]);

  useEffect(() => {
    calculateEligibility();
  }, []);

  function calculateEligibility() {
    const lastDonation = new Date(eligibilityData.last_donation_date);
    const nextEligible = new Date(lastDonation);
    nextEligible.setDate(nextEligible.getDate() + 96); // 96 days = ~3 months

    const today = new Date();
    const daysRemaining = Math.ceil((nextEligible - today) / (1000 * 60 * 60 * 24));
    const isEligible = daysRemaining <= 0;

    setEligibilityData(prev => ({
      ...prev,
      next_eligible_date: nextEligible.toISOString().split('T')[0],
      days_remaining: Math.abs(daysRemaining),
      is_eligible: isEligible
    }));
  }

  return (
    <div className="next-eligibility">
      {/* Header with Status */}
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/donor/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>📅 Next Eligibility</h1>
        </div>
        
        {/* Status in Header */}
        <div className="header-status">
          {eligibilityData.is_eligible ? (
            <div className="eligible-status">
              <div className="status-icon eligible">✅</div>
              <div className="status-content">
                <h2>You're Eligible to Donate!</h2>
                <p>You can donate blood today. Your contribution can save lives!</p>
              </div>
            </div>
          ) : (
            <div className="waiting-status">
              <div className="countdown-wrapper">
                <div className="countdown-circle">
                  <svg viewBox="0 0 200 200">
                    <circle
                      className="countdown-bg"
                      cx="100"
                      cy="100"
                      r="90"
                    />
                    <circle
                      className="countdown-progress"
                      cx="100"
                      cy="100"
                      r="90"
                      style={{
                        strokeDasharray: `${(1 - eligibilityData.days_remaining / 96) * 565} 565`,
                        transform: 'rotate(-90deg)',
                        transformOrigin: '100px 100px'
                      }}
                    />
                  </svg>
                  <div className="countdown-text">
                    <div className="days-number">{eligibilityData.days_remaining}</div>
                    <div className="days-label">days left</div>
                  </div>
                </div>
              </div>
              <div className="status-content">
                <h2>Almost There!</h2>
                <p>You can donate again on <strong>{new Date(eligibilityData.next_eligible_date).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</strong></p>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="eligibility-container">
        {/* Tips Card */}
        <div className="tips-card">
          <h3>💡 AI Health Suggestions</h3>
          <p className="tips-subtitle">Personalized tips to prepare you for your next donation</p>
          
          <div className="tips-list">
            {ai_suggestions.map((tip, index) => (
              <div key={index} className="tip-card">
                <div className="tip-icon">{tip.icon}</div>
                <div className="tip-content">
                  <h4>{tip.title}</h4>
                  <p>{tip.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="reminder-card">
            <div className="reminder-icon">🔔</div>
            <div className="reminder-content">
              <h4>Set Reminder</h4>
              <p>Get notified when you're eligible to donate again</p>
              <button className="reminder-btn">
                Enable Notifications
              </button>
            </div>
          </div>
        </div>

        {/* Last Donation Info */}
        <div className="info-card">
            <h3>🩸 Last Donation Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-icon">📅</span>
                <div>
                  <div className="info-label">Donation Date</div>
                  <div className="info-value">{new Date(eligibilityData.last_donation_date).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}</div>
                </div>
              </div>

              <div className="info-item">
                <span className="info-icon">🏥</span>
                <div>
                  <div className="info-label">Hospital</div>
                  <div className="info-value">{eligibilityData.hospital_name}</div>
                </div>
              </div>

              <div className="info-item">
                <span className="info-icon">💉</span>
                <div>
                  <div className="info-label">Donation Type</div>
                  <div className="info-value">{eligibilityData.donation_type}</div>
                </div>
              </div>
            </div>
        </div>

        {/* AI Predictive Insights */}
        <div className="predictions-card">
            <h3>🤖 Predictive Match Opportunities</h3>
            <p className="predictions-subtitle">Based on AI analysis, you're likely to match with these requests:</p>
            
            <div className="predictions-list">
              {predictions.map((pred, index) => (
                <div key={index} className="prediction-item">
                  <div className="prediction-header">
                    <div className="prediction-hospital">
                      <span className="hospital-icon">🏥</span>
                      <span>{pred.hospital}</span>
                    </div>
                    <div className="prediction-probability" style={{
                      background: pred.probability > 80 ? 'var(--secondary-green-light)' : 'var(--warning-light)',
                      color: pred.probability > 80 ? 'var(--secondary-green)' : 'var(--warning)'
                    }}>
                      {pred.probability}% Match
                    </div>
                  </div>
                  <div className="prediction-details">
                    <span>🩸 {pred.blood_group}</span>
                    <span>📅 Est. {new Date(pred.estimated_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}</span>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default NextEligibility;
