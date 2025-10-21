// src/pages/Home.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
// DISABLE GSAP completely to eliminate performance violations
// import { gsap } from 'gsap'
// import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Nav from '../components/Nav'
import HeroBanner from '../components/HeroBanner'
import SectionReveal from '../components/SectionReveal'
import AlertsBar from '../components/AlertsBar'
import { scheduleTask, scheduleLowPriorityTask } from '../utils/taskScheduler'
import '../styles/home-new.css'
import '../styles/home-enhancements.css'
import '../styles/home-redesign.css'


// DISABLE GSAP completely to eliminate performance violations
// gsap.registerPlugin(ScrollTrigger)

// EmergencyBar is now handled by AlertsBar component

// Hero section is now handled by HeroBanner component

// Component for Statistics
function StatsSection({ language }) {
  const [counts, setCounts] = useState({ donors: 0, units: 0, hospitals: 0, districts: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await import('../services/homepageService')
        const stats = await response.getCachedHomepageStats()
        
        if (stats) {
          setCounts({
            donors: stats.donors_registered || 0,
            units: stats.units_collected || 0,
            hospitals: stats.active_hospitals || 0,
            districts: stats.districts_covered || 0
          })
        }
      } catch (err) {
        console.error('Error fetching stats:', err)
        setError(err)
        // Set to 0 instead of dummy values
        setCounts({
          donors: 0,
          units: 0,
          hospitals: 0,
          districts: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    
    // Refresh stats every 10 minutes - optimized to prevent performance issues
    const refreshInterval = setInterval(() => {
      // Use requestIdleCallback to prevent blocking the main thread
      if (window.requestIdleCallback) {
        requestIdleCallback(fetchStats, { timeout: 1000 });
      } else {
        setTimeout(fetchStats, 0);
      }
    }, 10 * 60 * 1000)
    
    return () => clearInterval(refreshInterval)
  }, [])

  const stats = language === 'en' ? [
    { label: 'Donors Registered', value: loading ? '...' : counts.donors.toLocaleString(), icon: '👥' },
    { label: 'Units Collected', value: loading ? '...' : counts.units.toLocaleString(), icon: '🩸' },
    { label: 'Active Hospitals', value: loading ? '...' : counts.hospitals.toLocaleString(), icon: '🏥' },
    { label: 'Districts Covered', value: loading ? '...' : counts.districts.toLocaleString(), icon: '📍' },
    { label: 'Avg Response Time', value: '< 2 hrs', icon: '⚡' },
    { label: 'Success Rate', value: '94%', icon: '✅' }
  ] : [
    { label: 'രജിസ്റ്റർ ചെയ്ത ദാനികൾ', value: loading ? '...' : counts.donors.toLocaleString(), icon: '👥' },
    { label: 'ശേഖരിച്ച യൂണിറ്റുകൾ', value: loading ? '...' : counts.units.toLocaleString(), icon: '🩸' },
    { label: 'സജീവ ആശുപത്രികൾ', value: loading ? '...' : counts.hospitals.toLocaleString(), icon: '🏥' },
    { label: 'ഉൾപ്പെടുത്തിയ ജില്ലകൾ', value: loading ? '...' : counts.districts.toLocaleString(), icon: '📍' },
    { label: 'ശരാശരി പ്രതികരണ സമയം', value: '< 2 മണിക്കൂർ', icon: '⚡' },
    { label: 'വിജയ നിരക്ക്', value: '94%', icon: '✅' }
  ]

  return (
    <section className="stats-section">
      <div className="container">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-number">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Component for Why Donate Section
function WhyDonateSection({ language }) {
  const sectionRef = useRef(null)
  const cardsRef = useRef([])
  
  const reasons = language === 'en' ? [
    { title: 'Takes Only 1 Hour', description: 'Quick and safe at certified centers.', icon: '⏱️', motivation: 'One hour of your time can save three lives' },
    { title: 'Free Health Check-up', description: 'Complete medical screening before donation.', icon: '🏥', motivation: 'Know your health status for free' },
    { title: 'Save Up to 3 Lives', description: 'One donation helps multiple patients.', icon: '❤️', motivation: 'Be someone\'s hero today' },
    { title: 'Help Kerala Community', description: 'Support your neighbors in need.', icon: '🤝', motivation: 'Together we are stronger' },
    { title: 'Trusted by Hospitals', description: 'Partnered with 245+ medical centers.', icon: '🏆', motivation: 'Certified and reliable network' },
    { title: 'Make a Difference', description: 'Your donation creates a ripple of hope.', icon: '🌟', motivation: 'Small act, huge impact' }
  ] : [
    { title: '1 മണിക്കൂർ മാത്രം', description: 'സർട്ടിഫൈഡ് സെന്ററുകളിൽ വേഗവും സുരക്ഷിതവുമാണ്.', icon: '⏱️', motivation: 'നിങ്ങളുടെ ഒരു മണിക്കൂർ മൂന്ന് ജീവിതങ്ങൾ രക്ഷിക്കും' },
    { title: 'സൗജന്യ ആരോഗ്യ പരിശോധന', description: 'ദാനത്തിന് മുമ്പ് പൂർണ്ണ മെഡിക്കൽ സ്ക്രീനിംഗ്.', icon: '🏥', motivation: 'സൗജന്യമായി നിങ്ങളുടെ ആരോഗ്യ നില അറിയുക' },
    { title: '3 ജീവിതങ്ങൾ രക്ഷിക്കുക', description: 'ഒരു ദാനം ഒന്നിലധികം രോഗികളെ സഹായിക്കുന്നു.', icon: '❤️', motivation: 'ഇന്ന് ആരുടെയെങ്കിലും ഹീറോ ആകൂ' },
    { title: 'കേരള സമൂഹത്തെ സഹായിക്കുക', description: 'ആവശ്യമുള്ള അയൽക്കാരെ പിന്തുണയ്ക്കുക.', icon: '🤝', motivation: 'ഒരുമിച്ച് നമ്മൾ ശക്തരാണ്' },
    { title: 'ആശുപത്രികൾ ആശ്രയിക്കുന്നു', description: '245+ മെഡിക്കൽ സെന്ററുകളുമായി പങ്കാളിത്തം.', icon: '🏆', motivation: 'സർട്ടിഫൈഡും വിശ്വസനീയവുമായ നെറ്റ്‌വർക്ക്' },
    { title: 'വ്യത്യാസം വരുത്തുക', description: 'നിങ്ങളുടെ ദാനം പ്രതീക്ഷയുടെ തിരമാല സൃഷ്ടിക്കുന്നു.', icon: '🌟', motivation: 'ചെറിയ പ്രവൃത്തി, വലിയ സ്വാധീനം' }
  ]

  useEffect(() => {
    // DISABLE GSAP animations to eliminate performance violations
    // if (!sectionRef.current || !cardsRef.current.length) return

    // // Set initial state
    // gsap.set(cardsRef.current, { 
    //   opacity: 0, 
    //   y: 60,
    //   scale: 0.9
    // })

    // // Create scroll trigger animation
    // ScrollTrigger.create({
    //   trigger: sectionRef.current,
    //   start: "top 80%",
    //   onEnter: () => {
    //     gsap.to(cardsRef.current, {
    //       opacity: 1,
    //       y: 0,
    //       scale: 1,
    //       duration: 0.8,
    //       stagger: 0.15,
    //       ease: "power3.out"
    //     })
    //   }
    // })

    // return () => {
    //   ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    // }
  }, [])

  return (
    <section ref={sectionRef} className="why-donate-section">
      <div className="container">
        <h2 className="section-title">
          {language === 'en' ? 'Why Donate?' : 'എന്തുകൊണ്ട് ദാനം ചെയ്യണം?'}
        </h2>
        <div className="reasons-grid">
          {reasons.map((reason, index) => (
            <div 
              key={index} 
              ref={el => cardsRef.current[index] = el}
              className="reason-card"
            >
              <div className="reason-icon">{reason.icon}</div>
              <h3 className="reason-title">{reason.title}</h3>
              <p className="reason-description">{reason.description}</p>
              <p className="reason-motivation">{reason.motivation}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Component for Blood Compatibility Tool
function CompatibilityTool({ language }) {
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('O+')
  const sectionRef = useRef(null)
  const buttonsRef = useRef([])
  const cardsRef = useRef([])
  const itemsRef = useRef([])
  
  const compatibility = {
    'O+': { donors: ['O+', 'O-'], receivers: ['O+', 'A+', 'B+', 'AB+'] },
    'O-': { donors: ['O-'], receivers: ['Everyone'] },
    'A+': { donors: ['A+', 'A-', 'O+', 'O-'], receivers: ['A+', 'AB+'] },
    'A-': { donors: ['A-', 'O-'], receivers: ['A+', 'A-', 'AB+', 'AB-'] },
    'B+': { donors: ['B+', 'B-', 'O+', 'O-'], receivers: ['B+', 'AB+'] },
    'B-': { donors: ['B-', 'O-'], receivers: ['B+', 'B-', 'AB+', 'AB-'] },
    'AB+': { donors: ['Everyone'], receivers: ['AB+'] },
    'AB-': { donors: ['AB-', 'A-', 'B-', 'O-'], receivers: ['AB+', 'AB-'] }
  }

  const bloodGroups = Object.keys(compatibility)

  useEffect(() => {
    // DISABLE GSAP animations to eliminate performance violations
    // if (!sectionRef.current) return

    // // Set initial state
    // gsap.set(buttonsRef.current, { opacity: 0, y: 30 })
    // gsap.set(cardsRef.current, { opacity: 0, y: 40 })

    // // Create scroll trigger animation
    // ScrollTrigger.create({
    //   trigger: sectionRef.current,
    //   start: "top 80%",
    //   onEnter: () => {
    //     gsap.to(buttonsRef.current, {
    //       opacity: 1,
    //       y: 0,
    //       duration: 0.6,
    //       stagger: 0.1,
    //       ease: "power3.out"
    //     })
        
    //     gsap.to(cardsRef.current, {
    //       opacity: 1,
    //       y: 0,
    //       duration: 0.8,
    //       stagger: 0.2,
    //       ease: "power3.out",
    //       delay: 0.3
    //     })
    //   }
    // })

    // return () => {
    //   ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    // }
  }, [])

  useEffect(() => {
    // DISABLE GSAP animations to eliminate performance violations
    // // Animate compatibility items when blood group changes
    // if (itemsRef.current.length > 0) {
    //   gsap.fromTo(itemsRef.current, 
    //     { opacity: 0, scale: 0.8 },
    //     { 
    //       opacity: 1, 
    //       scale: 1, 
    //       duration: 0.5, 
    //       stagger: 0.1,
    //       ease: "back.out(1.7)"
    //     }
    //   )
    // }
  }, [selectedBloodGroup])

  return (
    <section ref={sectionRef} className="compatibility-section">
      <div className="container">
        <h2 className="section-title">
          {language === 'en' ? 'Blood Compatibility Tool' : 'രക്ത സാമ്യത ഉപകരണം'}
        </h2>
        <div className="compatibility-container">
          <div className="blood-group-selector">
            <label>
              {language === 'en' ? 'Select Blood Group:' : 'രക്തഗ്രൂപ്പ് തിരഞ്ഞെടുക്കുക:'}
            </label>
            <div className="blood-group-buttons">
              {bloodGroups.map((group, index) => (
                <button
                  key={group}
                  ref={el => buttonsRef.current[index] = el}
                  className={`blood-group-btn ${selectedBloodGroup === group ? 'active' : ''}`}
                  onClick={() => setSelectedBloodGroup(group)}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
          <div className="compatibility-results">
            <div ref={el => cardsRef.current[0] = el} className="compatibility-card">
              <h3>{language === 'en' ? 'Can Donate To:' : 'ദാനം ചെയ്യാൻ കഴിയുന്നവർ:'}</h3>
              <div className="compatibility-list">
                {compatibility[selectedBloodGroup].receivers.map((group, index) => (
                  <span 
                    key={group} 
                    ref={el => itemsRef.current[index] = el}
                    className="compatibility-item"
                  >
                    {group}
                  </span>
                ))}
              </div>
            </div>
            <div ref={el => cardsRef.current[1] = el} className="compatibility-card">
              <h3>{language === 'en' ? 'Can Receive From:' : 'സ്വീകരിക്കാൻ കഴിയുന്നവർ:'}</h3>
              <div className="compatibility-list">
                {compatibility[selectedBloodGroup].donors.map((group, index) => (
                  <span 
                    key={group} 
                    ref={el => itemsRef.current[index + compatibility[selectedBloodGroup].receivers.length] = el}
                    className="compatibility-item"
                  >
                    {group}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Component for How It Works - Simplified & Real
function HowItWorksSection({ language }) {
  const donorSteps = language === 'en' ? [
    { step: '1', title: 'Sign Up', description: 'Register with your blood group and contact details', icon: '✍️', color: '#4CAF50' },
    { step: '2', title: 'Get Matched', description: 'Receive notifications when your blood type is needed nearby', icon: '🔔', color: '#2196F3' },
    { step: '3', title: 'Donate Blood', description: 'Visit the hospital and complete your donation', icon: '🩸', color: '#E63946' },
    { step: '4', title: 'Save Lives', description: 'Track your impact and donation history', icon: '❤️', color: '#FF9800' }
  ] : [
    { step: '1', title: 'സൈൻ അപ്പ് ചെയ്യുക', description: 'നിങ്ങളുടെ രക്തഗ്രൂപ്പും ബന്ധപ്പെടാനുള്ള വിശദാംശങ്ങളും രജിസ്റ്റർ ചെയ്യുക', icon: '✍️', color: '#4CAF50' },
    { step: '2', title: 'മാച്ച് ചെയ്യപ്പെടുക', description: 'അടുത്തുള്ള സ്ഥലത്ത് നിങ്ങളുടെ രക്തഗ്രൂപ്പ് ആവശ്യമുള്ളപ്പോൾ അറിയിപ്പുകൾ സ്വീകരിക്കുക', icon: '🔔', color: '#2196F3' },
    { step: '3', title: 'രക്തദാനം ചെയ്യുക', description: 'ആശുപത്രി സന്ദർശിച്ച് നിങ്ങളുടെ ദാനം പൂർത്തിയാക്കുക', icon: '🩸', color: '#E63946' },
    { step: '4', title: 'ജീവൻ രക്ഷിക്കുക', description: 'നിങ്ങളുടെ സ്വാധീനവും ദാന ചരിത്രവും ട്രാക്ക് ചെയ്യുക', icon: '❤️', color: '#FF9800' }
  ]

  const hospitalSteps = language === 'en' ? [
    { step: '1', title: 'Login', description: 'Access your hospital dashboard securely', icon: '🔐', color: '#9C27B0' },
    { step: '2', title: 'Post Request', description: 'Enter blood type, quantity, and urgency level', icon: '📝', color: '#E91E63' },
    { step: '3', title: 'Auto-Match', description: 'System finds compatible donors in your area', icon: '⚡', color: '#FF5722' },
    { step: '4', title: 'Coordinate', description: 'Connect with donors and schedule donations', icon: '📞', color: '#00BCD4' }
  ] : [
    { step: '1', title: 'ലോഗിൻ', description: 'നിങ്ങളുടെ ആശുപത്രി ഡാഷ്ബോർഡ് സുരക്ഷിതമായി ആക്സസ് ചെയ്യുക', icon: '🔐', color: '#9C27B0' },
    { step: '2', title: 'അഭ്യർത്ഥന പോസ്റ്റ് ചെയ്യുക', description: 'രക്തഗ്രൂപ്പ്, അളവ്, അടിയന്തിര നില എന്നിവ നൽകുക', icon: '📝', color: '#E91E63' },
    { step: '3', title: 'ഓട്ടോ-മാച്ച്', description: 'സിസ്റ്റം നിങ്ങളുടെ പ്രദേശത്തെ അനുയോജ്യമായ ദാനികളെ കണ്ടെത്തുന്നു', icon: '⚡', color: '#FF5722' },
    { step: '4', title: 'ഏകോപിപ്പിക്കുക', description: 'ദാനികളുമായി ബന്ധപ്പെടുകയും ദാനങ്ങൾ ഷെഡ്യൂൾ ചെയ്യുകയും ചെയ്യുക', icon: '📞', color: '#00BCD4' }
  ]

  return (
    <section className="how-it-works-section-new">
      <div className="container">
        <div className="section-header-centered">
          <h2 className="section-title-modern">
            {language === 'en' ? 'How It Works' : 'ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു'}
          </h2>
          <p className="section-subtitle-modern">
            {language === 'en' 
              ? 'Simple steps to save lives' 
              : 'ജീവൻ രക്ഷിക്കാനുള്ള ലളിതമായ ഘട്ടങ്ങൾ'}
          </p>
        </div>
        
        <div className="workflows-modern">
          {/* Donors Section */}
          <div className="workflow-modern">
            <div className="workflow-header">
              <span className="workflow-badge workflow-badge--donor">
                {language === 'en' ? '👤 For Donors' : '👤 ദാനികൾക്ക്'}
              </span>
            </div>
            <div className="steps-modern">
              {donorSteps.map((step, index) => (
                <div key={index} className="step-modern" style={{ '--step-color': step.color }}>
                  <div className="step-icon-modern">{step.icon}</div>
                  <div className="step-details">
                    <div className="step-number-modern">{step.step}</div>
                    <h4 className="step-title-modern">{step.title}</h4>
                    <p className="step-description-modern">{step.description}</p>
                  </div>
                  {index < donorSteps.length - 1 && <div className="step-connector"></div>}
                </div>
              ))}
            </div>
          </div>

          {/* Hospitals Section */}
          <div className="workflow-modern">
            <div className="workflow-header">
              <span className="workflow-badge workflow-badge--hospital">
                {language === 'en' ? '🏥 For Hospitals' : '🏥 ആശുപത്രികൾക്ക്'}
              </span>
            </div>
            <div className="steps-modern">
              {hospitalSteps.map((step, index) => (
                <div key={index} className="step-modern" style={{ '--step-color': step.color }}>
                  <div className="step-icon-modern">{step.icon}</div>
                  <div className="step-details">
                    <div className="step-number-modern">{step.step}</div>
                    <h4 className="step-title-modern">{step.title}</h4>
                    <p className="step-description-modern">{step.description}</p>
                  </div>
                  {index < hospitalSteps.length - 1 && <div className="step-connector"></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Component for Alerts & Camps - Redesigned with Two Carousels
function AlertsCampsSection({ language }) {
  const [currentUrgent, setCurrentUrgent] = useState(0)
  const [currentCamp, setCurrentCamp] = useState(0)
  
  const urgentRequests = language === 'en' ? [
    { 
      title: 'O- Blood Urgently Needed', 
      hospital: 'Medical College Hospital',
      location: 'Trivandrum',
      bloodType: 'O-',
      units: '3 Units',
      time: 'Within 2 hours',
      contact: '+91-471-2528300'
    },
    { 
      title: 'AB+ Platelets Required', 
      hospital: 'Amrita Hospital',
      location: 'Kochi',
      bloodType: 'AB+',
      units: '2 Units',
      time: 'Immediate',
      contact: '+91-484-2851234'
    },
    { 
      title: 'B+ Blood for Surgery', 
      hospital: 'KIMS Hospital',
      location: 'Trivandrum',
      bloodType: 'B+',
      units: '4 Units',
      time: 'Today 4:00 PM',
      contact: '+91-471-3041400'
    }
  ] : [
    { 
      title: 'O- രക്തം അടിയന്തിരമായി ആവശ്യം', 
      hospital: 'മെഡിക്കൽ കോളേജ് ആശുപത്രി',
      location: 'തിരുവനന്തപുരം',
      bloodType: 'O-',
      units: '3 യൂണിറ്റുകൾ',
      time: '2 മണിക്കൂറിനുള്ളിൽ',
      contact: '+91-471-2528300'
    },
    { 
      title: 'AB+ പ്ലേറ്റ്ലെറ്റുകൾ ആവശ്യം', 
      hospital: 'അമൃത ആശുപത്രി',
      location: 'കൊച്ചി',
      bloodType: 'AB+',
      units: '2 യൂണിറ്റുകൾ',
      time: 'ഉടനടി',
      contact: '+91-484-2851234'
    },
    { 
      title: 'ശസ്ത്രക്രിയയ്ക്ക് B+ രക്തം', 
      hospital: 'KIMS ആശുപത്രി',
      location: 'തിരുവനന്തപുരം',
      bloodType: 'B+',
      units: '4 യൂണിറ്റുകൾ',
      time: 'ഇന്ന് 4:00 PM',
      contact: '+91-471-3041400'
    }
  ]

  const bloodCamps = language === 'en' ? [
    { 
      title: 'Mega Blood Donation Camp', 
      organizer: 'Rajagiri Hospital',
      location: 'Aluva, Ernakulam',
      date: 'Jan 25, 2025',
      time: '9:00 AM - 5:00 PM',
      expected: '200+ Donors',
      contact: '+91-484-2905000'
    },
    { 
      title: 'Community Blood Drive', 
      organizer: 'Rotary Club Kochi',
      location: 'Lakeshore Hospital, Kochi',
      date: 'Jan 28, 2025',
      time: '10:00 AM - 4:00 PM',
      expected: '150+ Donors',
      contact: '+91-484-2701032'
    },
    { 
      title: 'Youth Blood Donation Camp', 
      organizer: 'NSS Kerala',
      location: 'University Campus, Trivandrum',
      date: 'Feb 2, 2025',
      time: '8:00 AM - 2:00 PM',
      expected: '300+ Donors',
      contact: '+91-471-2305501'
    }
  ] : [
    { 
      title: 'മെഗാ രക്തദാന ക്യാമ്പ്', 
      organizer: 'രാജഗിരി ആശുപത്രി',
      location: 'ആലുവ, എറണാകുളം',
      date: 'ജനുവരി 25, 2025',
      time: '9:00 AM - 5:00 PM',
      expected: '200+ ദാനികൾ',
      contact: '+91-484-2905000'
    },
    { 
      title: 'കമ്മ്യൂണിറ്റി ബ്ലഡ് ഡ്രൈവ്', 
      organizer: 'റോട്ടറി ക്ലബ് കൊച്ചി',
      location: 'ലേക്ഷോർ ആശുപത്രി, കൊച്ചി',
      date: 'ജനുവരി 28, 2025',
      time: '10:00 AM - 4:00 PM',
      expected: '150+ ദാനികൾ',
      contact: '+91-484-2701032'
    },
    { 
      title: 'യൂത്ത് ബ്ലഡ് ഡൊണേഷൻ ക്യാമ്പ്', 
      organizer: 'NSS കേരള',
      location: 'യൂണിവേഴ്സിറ്റി കാമ്പസ്, തിരുവനന്തപുരം',
      date: 'ഫെബ്രുവരി 2, 2025',
      time: '8:00 AM - 2:00 PM',
      expected: '300+ ദാനികൾ',
      contact: '+91-471-2305501'
    }
  ]

  useEffect(() => {
    const urgentInterval = setInterval(() => {
      setCurrentUrgent((prev) => (prev + 1) % urgentRequests.length)
    }, 5000)
    return () => clearInterval(urgentInterval)
  }, [urgentRequests.length])

  useEffect(() => {
    const campInterval = setInterval(() => {
      setCurrentCamp((prev) => (prev + 1) % bloodCamps.length)
    }, 7000)
    return () => clearInterval(campInterval)
  }, [bloodCamps.length])

  return (
    <section className="alerts-camps-section-new">
      <div className="container">
        <div className="section-header-centered">
          <h2 className="section-title-modern">
            {language === 'en' ? 'Blood Requests & Donation Camps' : 'രക്ത അഭ്യർത്ഥനകളും ദാന ക്യാമ്പുകളും'}
          </h2>
        </div>

        {/* Two-Column Layout */}
        <div className="alerts-camps-grid">
          {/* Urgent Requests Carousel */}
          <div className="carousel-section urgent-section">
            <div className="carousel-header">
              <h3 className="carousel-title">
                <span className="title-icon">🚨</span>
                {language === 'en' ? 'Urgent Blood Requests' : 'അടിയന്തര രക്ത അഭ്യർത്ഥനകൾ'}
              </h3>
              <span className="live-badge">LIVE</span>
            </div>
            
            <div className="carousel-container">
              <div className="urgent-card">
                <div className="blood-type-badge">{urgentRequests[currentUrgent].bloodType}</div>
                <h4 className="urgent-title">{urgentRequests[currentUrgent].title}</h4>
                <div className="urgent-details">
                  <div className="detail-row">
                    <span className="detail-icon">🏥</span>
                    <span>{urgentRequests[currentUrgent].hospital}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">📍</span>
                    <span>{urgentRequests[currentUrgent].location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">🩸</span>
                    <span>{urgentRequests[currentUrgent].units}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">⏰</span>
                    <span>{urgentRequests[currentUrgent].time}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">📞</span>
                    <a href={`tel:${urgentRequests[currentUrgent].contact}`}>{urgentRequests[currentUrgent].contact}</a>
                  </div>
                </div>
                <button className="respond-btn">
                  {language === 'en' ? '🩸 I Can Donate' : '🩸 എനിക്ക് ദാനം ചെയ്യാം'}
                </button>
              </div>
              
              <div className="carousel-dots">
                {urgentRequests.map((_, index) => (
                  <button
                    key={index}
                    className={`dot ${index === currentUrgent ? 'active' : ''}`}
                    onClick={() => setCurrentUrgent(index)}
                    aria-label={`Request ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Blood Camps Carousel */}
          <div className="carousel-section camps-section">
            <div className="carousel-header">
              <h3 className="carousel-title">
                <span className="title-icon">🏕️</span>
                {language === 'en' ? 'Upcoming Blood Camps' : 'വരാനിരിക്കുന്ന ബ്ലഡ് ക്യാമ്പുകൾ'}
              </h3>
              <span className="upcoming-badge">UPCOMING</span>
            </div>
            
            <div className="carousel-container">
              <div className="camp-card">
                <div className="camp-icon">🎪</div>
                <h4 className="camp-title">{bloodCamps[currentCamp].title}</h4>
                <div className="camp-details">
                  <div className="detail-row">
                    <span className="detail-icon">👥</span>
                    <span>{bloodCamps[currentCamp].organizer}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">📍</span>
                    <span>{bloodCamps[currentCamp].location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">📅</span>
                    <span>{bloodCamps[currentCamp].date}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">🕐</span>
                    <span>{bloodCamps[currentCamp].time}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">🎯</span>
                    <span>{bloodCamps[currentCamp].expected}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">📞</span>
                    <a href={`tel:${bloodCamps[currentCamp].contact}`}>{bloodCamps[currentCamp].contact}</a>
                  </div>
                </div>
                <button className="register-btn">
                  {language === 'en' ? '📝 Register Now' : '📝 ഇപ്പോൾ രജിസ്റ്റർ ചെയ്യുക'}
                </button>
              </div>
              
              <div className="carousel-dots">
                {bloodCamps.map((_, index) => (
                  <button
                    key={index}
                    className={`dot ${index === currentCamp ? 'active' : ''}`}
                    onClick={() => setCurrentCamp(index)}
                    aria-label={`Camp ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Component for Testimonials
function TestimonialsSection({ language }) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Default fallback testimonials
  const defaultTestimonials = language === 'en' ? [
    {
      quote: "SmartBlood helped me donate blood at Rajagiri Hospital and save lives.",
      author: "Ramesh Das",
      role: "Blood Donor",
      location: "Ernakulam",
      donations: "12 donations",
      image: "👨‍⚕️",
      rating: 5
    },
    {
      quote: "Within 2 hours of posting a request, we found 5 compatible donors. This platform is a lifesaver!",
      author: "Dr. Anjali Menon",
      role: "Blood Bank Officer",
      location: "Medical College, Trivandrum",
      impact: "Helped 200+ patients",
      image: "👩‍⚕️",
      rating: 5
    },
    {
      quote: "My mother needed AB- blood urgently. SmartBlood's AI matched us with a donor in our locality within minutes. Forever grateful!",
      author: "Arjun Krishnan",
      role: "Patient's Son",
      location: "Kochi",
      impact: "Life saved",
      image: "🙏",
      rating: 5
    },
    {
      quote: "As a regular donor for 5 years, SmartBlood makes it incredibly easy to contribute. The notifications are timely and the process is seamless.",
      author: "Sreelakshmi Nair",
      role: "Regular Donor",
      location: "Kozhikode",
      donations: "28 donations",
      image: "👩",
      rating: 5
    },
    {
      quote: "The ML-powered matching saved precious time during an emergency. This is the future of blood donation management.",
      author: "Dr. Thomas Jacob",
      role: "Emergency Medicine",
      location: "Amrita Hospital, Kochi",
      impact: "Critical care specialist",
      image: "👨‍⚕️",
      rating: 5
    }
  ] : [
    {
      quote: "സ്മാർട്ട് ബ്ലഡ് രാജഗിരി ആശുപത്രിയിൽ രക്തദാനം ചെയ്യാനും ജീവൻ രക്ഷിക്കാനും എന്നെ സഹായിച്ചു.",
      author: "രമേഷ് ദാസ്",
      role: "രക്ത ദാനി",
      location: "എറണാകുളം",
      donations: "12 ദാനങ്ങൾ",
      image: "👨‍⚕️",
      rating: 5
    },
    {
      quote: "അഭ്യർത്ഥന പോസ്റ്റ് ചെയ്ത് 2 മണിക്കൂറിനുള്ളിൽ 5 അനുയോജ്യമായ ദാനികളെ കണ്ടെത്തി. ഈ പ്ലാറ്റ്ഫോം ജീവൻ രക്ഷകമാണ്!",
      author: "ഡോ. അഞ്ജലി മേനോൻ",
      role: "ബ്ലഡ് ബാങ്ക് ഓഫീസർ",
      location: "മെഡിക്കൽ കോളേജ്, തിരുവനന്തപുരം",
      impact: "200+ രോഗികളെ സഹായിച്ചു",
      image: "👩‍⚕️",
      rating: 5
    },
    {
      quote: "എന്റെ അമ്മയ്ക്ക് AB- രക്തം അടിയന്തിരമായി ആവശ്യമായിരുന്നു. സ്മാർട്ട് ബ്ലഡിന്റെ AI മിനിറ്റുകൾക്കുള്ളിൽ ഞങ്ങളുടെ പ്രദേശത്തെ ദാനിയുമായി ബന്ധിപ്പിച്ചു. എന്നേക്കും നന്ദിയുള്ളവനാണ്!",
      author: "അർജുൻ കൃഷ്ണൻ",
      role: "രോഗിയുടെ മകൻ",
      location: "കൊച്ചി",
      impact: "ജീവൻ രക്ഷിച്ചു",
      image: "🙏",
      rating: 5
    },
    {
      quote: "5 വർഷമായി സ്ഥിരം ദാനിയായി, സ്മാർട്ട് ബ്ലഡ് സംഭാവന നൽകുന്നത് അവിശ്വസനീയമാംവണ്ണം എളുപ്പമാക്കുന്നു. അറിയിപ്പുകൾ സമയബന്ധിതവും പ്രക്രിയ തടസ്സമില്ലാത്തതുമാണ്.",
      author: "ശ്രീലക്ഷ്മി നായർ",
      role: "സ്ഥിരം ദാനി",
      location: "കോഴിക്കോട്",
      donations: "28 ദാനങ്ങൾ",
      image: "👩",
      rating: 5
    },
    {
      quote: "ML-പവർഡ് മാച്ചിംഗ് അടിയന്തിര സമയത്ത് വിലയേറിയ സമയം ലാഭിച്ചു. ഇത് രക്തദാന മാനേജ്മെന്റിന്റെ ഭാവിയാണ്.",
      author: "ഡോ. തോമസ് ജേക്കബ്",
      role: "എമർജൻസി മെഡിസിൻ",
      location: "അമൃത ആശുപത്രി, കൊച്ചി",
      impact: "ക്രിട്ടിക്കൽ കെയർ സ്പെഷ്യലിസ്റ്റ്",
      image: "👨‍⚕️",
      rating: 5
    }
  ]

  // Fetch testimonials from backend
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true)
        
        const response = await import('../services/homepageService')
        const backendTestimonials = await response.getCachedHomepageTestimonials()
        
        if (backendTestimonials && backendTestimonials.length > 0) {
          setTestimonials(backendTestimonials)
        } else {
          setTestimonials(defaultTestimonials)
        }
      } catch (err) {
        console.error('Error fetching testimonials:', err)
        setTestimonials(defaultTestimonials)
      } finally {
        setLoading(false)
      }
    }

    fetchTestimonials()
  }, [language])

  useEffect(() => {
    let timeoutId;
    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        scheduleNext(); // Schedule the next transition
      }, 5000);
    };
    
    scheduleNext();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [testimonials.length])

  return (
    <section className="testimonials-section-new">
      <div className="container">
        <div className="section-header-centered">
          <h2 className="section-title-modern">
            {language === 'en' ? 'Real Stories, Real Impact' : 'യഥാർത്ഥ കഥകൾ, യഥാർത്ഥ സ്വാധീനം'}
          </h2>
          <p className="section-subtitle-modern">
            {language === 'en' ? 'Hear from our community of lifesavers' : 'ജീവൻ രക്ഷകരുടെ ഞങ്ങളുടെ കമ്മ്യൂണിറ്റിയിൽ നിന്ന് കേൾക്കുക'}
          </p>
        </div>
        
        <div className="testimonial-modern-wrapper">
          {loading ? (
            <div className="testimonial-loading">Loading stories...</div>
          ) : (
            <>
              <div className="testimonial-modern-card">
                <div className="quote-mark">"</div>
                <div className="testimonial-content-modern">
                  <p className="testimonial-text-modern">{testimonials[currentTestimonial]?.quote}</p>
                  
                  <div className="testimonial-author-modern">
                    <div className="author-avatar">{testimonials[currentTestimonial]?.image}</div>
                    <div className="author-details-modern">
                      <h4 className="author-name-modern">{testimonials[currentTestimonial]?.author}</h4>
                      <p className="author-role-modern">{testimonials[currentTestimonial]?.role}</p>
                      <p className="author-location-modern">📍 {testimonials[currentTestimonial]?.location}</p>
                    </div>
                    <div className="author-badge-modern">
                      {testimonials[currentTestimonial]?.donations && (
                        <span className="badge-item">🩸 {testimonials[currentTestimonial]?.donations}</span>
                      )}
                      {testimonials[currentTestimonial]?.impact && (
                        <span className="badge-item">✨ {testimonials[currentTestimonial]?.impact}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="testimonial-nav-modern">
                <button 
                  className="nav-btn-modern nav-btn--prev"
                  onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                  aria-label="Previous"
                >
                  ←
                </button>
                <div className="testimonial-indicators">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      className={`indicator ${index === currentTestimonial ? 'active' : ''}`}
                      onClick={() => setCurrentTestimonial(index)}
                      aria-label={`Story ${index + 1}`}
                    />
                  ))}
                </div>
                <button 
                  className="nav-btn-modern nav-btn--next"
                  onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
                  aria-label="Next"
                >
                  →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// Component for Emergency Preparedness - Simplified
function EmergencyPreparednessSection({ language }) {
  const preparednessItems = language === 'en' ? [
    {
      icon: '🚨',
      title: '24/7 Support',
      description: 'Emergency helpline always available'
    },
    {
      icon: '⚡',
      title: 'Quick Response',
      description: 'Average response time under 2 hours'
    },
    {
      icon: '🏥',
      title: '245+ Hospitals',
      description: 'Connected blood banks across Kerala'
    },
    {
      icon: '🔐',
      title: 'Verified Network',
      description: 'All donors and hospitals are verified'
    }
  ] : [
    {
      icon: '🚨',
      title: '24/7 പിന്തുണ',
      description: 'എമർജൻസി ഹെൽപ്പ്ലൈൻ എപ്പോഴും ലഭ്യമാണ്'
    },
    {
      icon: '⚡',
      title: 'ദ്രുത പ്രതികരണം',
      description: 'ശരാശരി പ്രതികരണ സമയം 2 മണിക്കൂറിൽ താഴെ'
    },
    {
      icon: '🏥',
      title: '245+ ആശുപത്രികൾ',
      description: 'കേരളത്തിലുടനീളം ബന്ധിപ്പിച്ച ബ്ലഡ് ബാങ്കുകൾ'
    },
    {
      icon: '🔐',
      title: 'സ്ഥിരീകരിച്ച നെറ്റ്‌വർക്ക്',
      description: 'എല്ലാ ദാനികളും ആശുപത്രികളും സ്ഥിരീകരിച്ചവയാണ്'
    }
  ]

  return (
    <section className="emergency-preparedness-section-new">
      <div className="container">
        <div className="section-header-centered">
          <h2 className="section-title-modern">
            {language === 'en' ? 'Why Choose SmartBlood?' : 'എന്തുകൊണ്ട് സ്മാർട്ട് ബ്ലഡ്?'}
          </h2>
          <p className="section-subtitle-modern">
            {language === 'en' 
              ? 'Fast, reliable, and always there when you need us'
              : 'വേഗമേറിയതും വിശ്വസനീയവും നിങ്ങൾക്ക് ആവശ്യമുള്ളപ്പോൾ എപ്പോഴും ഉണ്ട്'}
          </p>
        </div>
        
        <div className="preparedness-grid-modern">
          {preparednessItems.map((item, index) => (
            <div key={index} className="preparedness-card-modern">
              <div className="card-icon-modern">{item.icon}</div>
              <h3 className="card-title-modern">{item.title}</h3>
              <p className="card-description-modern">{item.description}</p>
            </div>
          ))}
        </div>
        
        <div className="emergency-cta-modern">
          <div className="cta-content-modern">
            <h3 className="cta-title">{language === 'en' ? 'Need Blood Urgently?' : 'അടിയന്തിരമായി രക്തം ആവശ്യമുണ്ടോ?'}</h3>
            <p className="cta-subtitle">{language === 'en' ? 'We\'re here 24/7 to help' : 'സഹായിക്കാൻ ഞങ്ങൾ 24/7 ഇവിടെയുണ്ട്'}</p>
            <div className="cta-buttons-modern">
              <Link to="/seeker/request" className="cta-btn cta-btn--primary">
                🩸 {language === 'en' ? 'Request Blood' : 'രക്തം അഭ്യർത്ഥിക്കുക'}
              </Link>
              <a href="tel:1800XXXBLOOD" className="cta-btn cta-btn--secondary">
                📞 {language === 'en' ? 'Call Hotline' : 'ഹോട്ട്‌ലൈൻ വിളിക്കുക'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Component for About Section
function AboutSection({ language }) {
  const [aboutStats, setAboutStats] = useState({
    livesSaved: 0,
    partnerHospitals: 0,
    support: '24/7'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch about stats from backend
  useEffect(() => {
    const fetchAboutStats = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await import('../services/homepageService')
        const stats = await response.getCachedHomepageStats()
        
        if (stats) {
          setAboutStats({
            livesSaved: stats.lives_saved || 0,
            partnerHospitals: stats.active_hospitals || 0,
            support: '24/7'
          })
        }
      } catch (err) {
        console.error('Error fetching about stats:', err)
        setError(err.message)
        // Set to 0 instead of dummy values
        setAboutStats({
          livesSaved: 0,
          partnerHospitals: 0,
          support: '24/7'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAboutStats()
  }, [])

  return (
    <section id="about" className="about-section">
      <div className="container">
        <div className="about-content">
          <div className="about-text">
            <h2>{language === 'en' ? 'About SmartBlood' : 'സ്മാർട്ട് ബ്ലഡിനെ കുറിച്ച്'}</h2>
            <p>
              {language === 'en' 
                ? "SmartBlood is Kerala's premier blood donation platform, connecting donors, recipients, and hospitals in real-time. Our mission is to ensure no life is lost due to blood unavailability."
                : "സ്മാർട്ട് ബ്ലഡ് കേരളത്തിന്റെ പ്രമുഖ രക്തദാന പ്ലാറ്റ്ഫോമാണ്, ദാനികൾ, സ്വീകർത്താക്കൾ, ആശുപത്രികൾ എന്നിവയെ റിയൽ-ടൈമിൽ ബന്ധിപ്പിക്കുന്നു. രക്തത്തിന്റെ അഭാവം കാരണം ഒരു ജീവിതവും നഷ്ടപ്പെടാതിരിക്കാൻ ഞങ്ങളുടെ ലക്ഷ്യം."}
            </p>
            <Link to="/about" className="btn btn-outline">
              {language === 'en' ? 'Learn More' : 'കൂടുതൽ അറിയുക'}
            </Link>
          </div>
          <div className="about-stats">
            <div className="about-stat">
              <div className="stat-number">
                {loading ? '...' : `${aboutStats.livesSaved.toLocaleString()}+`}
              </div>
              <div className="stat-label">{language === 'en' ? 'Lives Saved' : 'ജീവിതങ്ങൾ രക്ഷിച്ചു'}</div>
            </div>
            <div className="about-stat">
              <div className="stat-number">
                {loading ? '...' : `${aboutStats.partnerHospitals.toLocaleString()}+`}
              </div>
              <div className="stat-label">{language === 'en' ? 'Partner Hospitals' : 'പങ്കാളി ആശുപത്രികൾ'}</div>
            </div>
            <div className="about-stat">
              <div className="stat-number">{aboutStats.support}</div>
              <div className="stat-label">{language === 'en' ? 'Support' : 'പിന്തുണ'}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Main Home Component
export default function Home() {
  const [language, setLanguage] = useState('en')

  // Get language from parent context or localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en'
    setLanguage(savedLanguage)
  }, [])

  // Listen for language changes from navbar
  useEffect(() => {
    const handleLanguageChange = () => {
      const savedLanguage = localStorage.getItem('language') || 'en'
      setLanguage(savedLanguage)
    }

    window.addEventListener('languageChanged', handleLanguageChange)
    return () => window.removeEventListener('languageChanged', handleLanguageChange)
  }, [])

  return (
    <>
      <Nav />
      <main className="home-page">
        <AlertsBar language={language} />
        <div className="full-bleed" style={{ marginTop: '132px' }}>
          <HeroBanner language={language} />
        </div>
      
      <SectionReveal>
        <StatsSection language={language} />
      </SectionReveal>
      
      <SectionReveal>
        <WhyDonateSection language={language} />
      </SectionReveal>
      
      <SectionReveal>
        <CompatibilityTool language={language} />
      </SectionReveal>
      
      <SectionReveal>
        <HowItWorksSection language={language} />
      </SectionReveal>
      
      <SectionReveal>
        <AlertsCampsSection language={language} />
      </SectionReveal>
      
      <SectionReveal>
        <TestimonialsSection language={language} />
      </SectionReveal>
      
      <SectionReveal>
        <EmergencyPreparednessSection language={language} />
      </SectionReveal>
      
      <SectionReveal>
        <AboutSection language={language} />
      </SectionReveal>
      
      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>{language === 'en' ? 'Find Blood' : 'രക്തം കണ്ടെത്തുക'}</h3>
              <ul>
                <li><Link to="/seeker/request">{language === 'en' ? 'Blood Availability' : 'രക്ത ലഭ്യത'}</Link></li>
                <li><Link to="/hospitals">{language === 'en' ? 'Blood Centers' : 'രക്ത കേന്ദ്രങ്ങൾ'}</Link></li>
                <li><Link to="/requests">{language === 'en' ? 'Requests' : 'അഭ്യർത്ഥനകൾ'}</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>{language === 'en' ? 'Donate Blood' : 'രക്തം ദാനം ചെയ്യുക'}</h3>
              <ul>
                <li><Link to="/camps">{language === 'en' ? 'Camps' : 'ക്യാമ്പുകൾ'}</Link></li>
                <li><Link to="/seeker/login">{language === 'en' ? 'Seeker Login' : 'അന്വേഷകൻ ലോഗിൻ'}</Link></li>
                <li><Link to="/how-to-donate">{language === 'en' ? 'How to Donate' : 'എങ്ങനെ ദാനം ചെയ്യാം'}</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>{language === 'en' ? 'Hospital Login' : 'ആശുപത്രി ലോഗിൻ'}</h3>
              <ul>
                <li><Link to="/hospital/register">{language === 'en' ? 'Center Registration' : 'കേന്ദ്ര രജിസ്ട്രേഷൻ'}</Link></li>
                <li><Link to="/admin/login">{language === 'en' ? 'Login' : 'ലോഗിൻ'}</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>{language === 'en' ? 'About Us' : 'ഞങ്ങളെ കുറിച്ച്'}</h3>
              <ul>
                <li><Link to="/faq">{language === 'en' ? 'FAQs' : 'പതിവ് ചോദ്യങ്ങൾ'}</Link></li>
                <li><Link to="/policies">{language === 'en' ? 'Policies' : 'നയങ്ങൾ'}</Link></li>
                <li><Link to="/contact">{language === 'en' ? 'Contact' : 'ബന്ധപ്പെടുക'}</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="social-links">
              <a href="#" aria-label="Facebook" className="social-link facebook">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" aria-label="Twitter" className="social-link twitter">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#" aria-label="Instagram" className="social-link instagram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="#" aria-label="YouTube" className="social-link youtube">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
            <p>&copy; {new Date().getFullYear()} SmartBlood Connect. {language === 'en' ? 'All rights reserved.' : 'എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.'}</p>
          </div>
        </div>
      </footer>
      </main>
    </>
  )
}