// src/components/AlertsBar.jsx
import React, { useState, useEffect, useRef } from 'react'
import { getCachedHomepageAlerts, getRelativeTime } from '../services/homepageService'

export default function AlertsBar({ language }) {
  const [currentMessage, setCurrentMessage] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [emergencyMessages, setEmergencyMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)
  const containerRef = useRef(null)
  
  // Default fallback messages
  const defaultMessages = language === 'en' ? [
    "🚨 Urgent Need: O+ in Trivandrum (2 units). [Click to Help]",
    "🚨 Emergency: A- blood needed in Kochi (1 unit). [Donate Now]",
    "🚨 Critical: B+ platelets required in Kozhikode (3 units). [Urgent]"
  ] : [
    "🚨 അടിയന്തരം: തിരുവനന്തപുരത്ത് O+ രക്തം (2 യൂണിറ്റ്). [സഹായിക്കാൻ ക്ലിക്ക് ചെയ്യുക]",
    "🚨 അടിയന്തരം: കൊച്ചിയിൽ A- രക്തം ആവശ്യം (1 യൂണിറ്റ്). [ഇപ്പോൾ രക്തം ദാനം ചെയ്യുക]",
    "🚨 നിർണായകം: കോഴിക്കോട് B+ പ്ലേറ്റ്ലെറ്റുകൾ ആവശ്യം (3 യൂണിറ്റ്). [അടിയന്തരം]"
  ]

  // Fetch alerts from backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true)
        const alerts = await getCachedHomepageAlerts()
        
        if (alerts && alerts.length > 0) {
          const formattedAlerts = alerts.map(alert => {
            const timeAgo = getRelativeTime(alert.created_at)
            
            if (alert.type === 'alert') {
              return language === 'en' 
                ? `🚨 ${alert.title} (${alert.quantity} units) - ${timeAgo} [Click to Help]`
                : `🚨 ${alert.title} (${alert.quantity} യൂണിറ്റ്) - ${timeAgo} [സഹായിക്കാൻ ക്ലിക്ക് ചെയ്യുക]`
            } else if (alert.type === 'camp') {
              return language === 'en'
                ? `🏥 ${alert.title} - ${timeAgo} [Join Camp]`
                : `🏥 ${alert.title} - ${timeAgo} [ക്യാമ്പിൽ പങ്കെടുക്കുക]`
            }
            return alert.title
          })
          setEmergencyMessages(formattedAlerts)
        } else {
          setEmergencyMessages(defaultMessages)
        }
      } catch (error) {
        console.error('Error fetching alerts:', error)
        setEmergencyMessages(defaultMessages)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    
    // Refresh alerts every 5 minutes - optimized to prevent performance issues
    const refreshInterval = setInterval(() => {
      // Use requestIdleCallback to prevent blocking the main thread
      if (window.requestIdleCallback) {
        requestIdleCallback(fetchAlerts, { timeout: 1000 });
      } else {
        setTimeout(fetchAlerts, 0);
      }
    }, 5 * 60 * 1000)
    
    return () => clearInterval(refreshInterval)
  }, [language])

  useEffect(() => {
    if (!isHovered && emergencyMessages.length > 0 && !loading) {
      let timeoutId;
      const scheduleNext = () => {
        timeoutId = setTimeout(() => {
          setCurrentMessage((prev) => (prev + 1) % emergencyMessages.length);
          scheduleNext(); // Schedule the next transition
        }, 6000); // 6 seconds display time
      };
      
      scheduleNext();
      intervalRef.current = timeoutId;
    } else {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isHovered, emergencyMessages.length, loading])

  const goToPrevious = () => {
    setCurrentMessage((prev) => (prev - 1 + emergencyMessages.length) % emergencyMessages.length)
  }

  const goToNext = () => {
    setCurrentMessage((prev) => (prev + 1) % emergencyMessages.length)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      goToPrevious()
    } else if (event.key === 'ArrowRight') {
      goToNext()
    }
  }

  return (
    <div 
      className="alerts-bar" 
      role="alert" 
      aria-live="polite" 
      style={{ zIndex: 1000 }}
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Emergency blood alerts"
    >
      <div className="alerts-bar__container">
        <button
          className="alerts-bar__nav-btn alerts-bar__nav-btn--prev"
          onClick={goToPrevious}
          aria-label="Previous alert"
          title="Previous alert"
        >
          ◀
        </button>
        
        <div className="alerts-bar__content">
          <span className="alerts-bar__icon" aria-hidden="true">
            {loading ? '⏳' : '🚨'}
          </span>
          <span className="alerts-bar__text">
            {loading ? (language === 'en' ? 'Loading alerts...' : 'അലേർട്ടുകൾ ലോഡ് ചെയ്യുന്നു...') : emergencyMessages[currentMessage]}
          </span>
        </div>

        <div className="alerts-bar__controls">
          <div className="alerts-bar__indicators">
            {emergencyMessages.map((_, index) => (
              <button
                key={index}
                className={`alerts-bar__indicator ${index === currentMessage ? 'active' : ''}`}
                onClick={() => setCurrentMessage(index)}
                aria-label={`Go to alert ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <button
          className="alerts-bar__nav-btn alerts-bar__nav-btn--next"
          onClick={goToNext}
          aria-label="Next alert"
          title="Next alert"
        >
          ▶
        </button>
      </div>
    </div>
  )
}
