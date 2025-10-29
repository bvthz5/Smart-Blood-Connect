// frontend/src/components/seeker/DonorSearchOverlay.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Loader, Users, MapPin, CheckCircle, XCircle, RefreshCw, AlertTriangle, Radio } from 'lucide-react';
import './DonorSearchOverlay.css';

const DonorSearchOverlay = ({ requestId, hospital, onComplete, onClose }) => {
  const [status, setStatus] = useState('running');
  const [foundCount, setFoundCount] = useState(0);
  const [matches, setMatches] = useState([]);
  const [searchMetadata, setSearchMetadata] = useState(null);
  const lastUpdatedRef = useRef(null);
  const [error, setError] = useState(null);
  const [searchDuration, setSearchDuration] = useState(0);
  const [isExpanding, setIsExpanding] = useState(false);
  const pollTimeoutRef = useRef(null);
  const searchStartTime = useRef(Date.now());
  
  const POLL_INTERVAL = 2000; // 2 seconds
  const POLL_TIMEOUT = 60000; // 60 seconds max
  const MAX_SEARCH_TIME = 30000; // 30 seconds before offering options

  useEffect(() => {
    let mounted = true;
    let interval = null;
    let timeoutTimer = null;
    let durationTimer = null;

    // Update search duration every second
    durationTimer = setInterval(() => {
      if (mounted) {
        const elapsed = Math.floor((Date.now() - searchStartTime.current) / 1000);
        setSearchDuration(elapsed);
      }
    }, 1000);

    // Set overall timeout for polling
    timeoutTimer = setTimeout(() => {
      if (mounted && status === 'running') {
        setError('Search timeout - server not responding');
        setStatus('failed');
        if (interval) clearInterval(interval);
      }
    }, POLL_TIMEOUT);

    const poll = async () => {
      try {
        const token = localStorage.getItem('seeker_token') || localStorage.getItem('access_token');
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const qs = lastUpdatedRef.current ? `?since=${encodeURIComponent(lastUpdatedRef.current)}` : '';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s per request timeout
        
        const response = await fetch(`/api/requests/${requestId}/match-status${qs}`, { 
          headers,
          signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!mounted) return;

        // Update search metadata (hospital location, etc.)
        if (data.search_metadata) {
          setSearchMetadata(data.search_metadata);
        }

        // Handle new matches (incremental)
        if (data.matched && data.matched.length > 0) {
          const existingIds = new Set(matches.map(m => m.match_prediction_id));
          const newMatches = data.matched.filter(m => !existingIds.has(m.match_prediction_id));
          
          if (newMatches.length > 0) {
            setMatches(prev => [...prev, ...newMatches].sort((a, b) => (a.rank || 99) - (b.rank || 99)));
            setFoundCount(data.found_count || matches.length + newMatches.length);
            
            // Trigger animation for new donors
            newMatches.forEach(donor => {
              animateIncomingDonor(donor);
            });
            
            // Announce to screen readers
            announceToScreenReader(`Found ${newMatches.length} new donor${newMatches.length > 1 ? 's' : ''}. Total: ${data.found_count}`);
          }
        }

        setStatus(data.status);
        setFoundCount(data.found_count || 0);
        lastUpdatedRef.current = data.updated_at;

        // Stop polling if search is complete
        if (data.status === 'done' || data.status === 'none_found' || data.status === 'failed') {
          if (interval) clearInterval(interval);
          if (timeoutTimer) clearTimeout(timeoutTimer);
          
          // Announce completion
          if (data.status === 'done') {
            announceToScreenReader(`Search complete. Found ${data.found_count} compatible donors.`);
          } else if (data.status === 'none_found') {
            announceToScreenReader('No compatible donors found in the search area.');
          }
          
          // Auto-close overlay after 1.5s if done successfully
          if (data.status === 'done' && data.found_count > 0) {
            setTimeout(() => {
              if (mounted) {
                onComplete && onComplete({ status: data.status, matches, foundCount: data.found_count });
              }
            }, 1500);
          }
        }

      } catch (err) {
        console.error('Poll error:', err);
        if (mounted) {
          if (err.name === 'AbortError') {
            setError('Request timeout - retrying...');
          } else {
            setError(err.message || 'Network error occurred');
          }
          // Don't stop polling on single error, will retry
        }
      }
    };

    // Start polling immediately
    poll();
    interval = setInterval(poll, POLL_INTERVAL);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (durationTimer) clearInterval(durationTimer);
    };
  }, [requestId, onComplete]);

  const animateIncomingDonor = (donor) => {
    // Trigger CSS animation class
    // This would be picked up by the map component
    const event = new CustomEvent('donorFound', { detail: donor });
    window.dispatchEvent(event);
  };

  const announceToScreenReader = (message) => {
    // Create live region for screen reader announcement
    const announcement = document.getElementById('search-announcement');
    if (announcement) {
      announcement.textContent = message;
    }
  };

  const handleRetrySearch = async () => {
    setError(null);
    setStatus('running');
    setMatches([]);
    setFoundCount(0);
    lastUpdatedRef.current = null;
    searchStartTime.current = Date.now();
    setSearchDuration(0);
    
    // Trigger re-enqueueing of matching task
    try {
      const token = localStorage.getItem('seeker_token') || localStorage.getItem('access_token');
      await fetch(`/api/requests/${requestId}/retry-matching`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Retry failed:', err);
      setError('Failed to restart search. Please try again.');
    }
  };

  const handleExpandRadius = async () => {
    setIsExpanding(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('seeker_token') || localStorage.getItem('access_token');
      await fetch(`/api/requests/${requestId}/expand-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ radius_km: 50 }) // Expand to 50km
      });
      
      announceToScreenReader('Expanding search radius to 50 kilometers');
      setStatus('running');
      lastUpdatedRef.current = null;
    } catch (err) {
      console.error('Expand failed:', err);
      setError('Failed to expand search radius.');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleNotifyEmergency = async () => {
    try {
      const token = localStorage.getItem('seeker_token') || localStorage.getItem('access_token');
      await fetch(`/api/requests/${requestId}/notify-emergency`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      announceToScreenReader('Emergency network notified');
      alert('Emergency notification sent to nearby hospitals and blood banks.');
      onClose && onClose();
    } catch (err) {
      console.error('Emergency notify failed:', err);
      setError('Failed to send emergency notification.');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader className="animate-spin" size={48} />;
      case 'done':
        return <CheckCircle size={48} className="text-green-500" />;
      case 'none_found':
        return <XCircle size={48} className="text-orange-500" />;
      case 'failed':
        return <XCircle size={48} className="text-red-500" />;
      default:
        return <Loader className="animate-spin" size={48} />;
    }
  };

  const getStatusText = () => {
    const bloodGroup = searchMetadata?.blood_group || 'blood';
    const radius = searchMetadata?.radius_km || 20;
    
    switch (status) {
      case 'running':
        if (foundCount === 0) {
          return `Locating nearby donors for ${bloodGroup}... Searching within ${radius} km`;
        } else {
          return `${foundCount} donor${foundCount !== 1 ? 's' : ''} found — showing nearest first`;
        }
      case 'done':
        if (foundCount > 0) {
          return `${foundCount} compatible donor${foundCount !== 1 ? 's' : ''} found`;
        } else {
          return `Search complete - ${foundCount} donors available`;
        }
      case 'none_found':
        return `No eligible donors found within ${radius} km`;
      case 'failed':
        return 'Search failed — try again or contact support';
      default:
        return 'Initializing search...';
    }
  };

  const getActionMessage = () => {
    if (status === 'none_found') {
      return 'Increase radius or notify nearby hospitals?';
    }
    if (status === 'done' && foundCount > 0) {
      return `Invites sent to top ${Math.min(foundCount, 10)} donors. You'll be notified when someone accepts.`;
    }
    return null;
  };

  const showExpandOptions = () => {
    return (status === 'none_found' || (status === 'running' && searchDuration > 30 && foundCount === 0));
  };

  return (
    <div className="donor-search-overlay">
      <div className="search-backdrop" onClick={status !== 'running' ? onClose : null}></div>
      
      {/* ARIA Live Region for Screen Readers */}
      <div 
        id="search-announcement" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      ></div>
      
      <div className="search-modal">
        {/* Radar Animation */}
        <div className="radar-container" aria-hidden="true">
          <div className="radar-sweep"></div>
          <div className="hospital-marker">
            <MapPin size={32} className="text-red-600" />
            <div className="pulse-ring"></div>
          </div>
          
          {/* Animated donor dots appearing */}
          {matches.slice(0, 8).map((donor, idx) => (
            <div
              key={donor.match_prediction_id}
              className="donor-dot"
              style={{
                animationDelay: `${idx * 0.3}s`,
                '--angle': `${(idx * 360) / 8}deg`,
                '--distance': '120px'
              }}
            />
          ))}
        </div>

        {/* Status Display */}
        <div className="search-status">
          <div className="status-icon">
            {getStatusIcon()}
          </div>
          
          <h2 className="status-title">{getStatusText()}</h2>
          
          {searchMetadata?.hospital && (
            <p className="hospital-name">
              {searchMetadata.hospital.name} • {searchMetadata.hospital.district}
            </p>
          )}
          
          {/* Search Duration */}
          {status === 'running' && searchDuration > 0 && (
            <p className="search-duration">
              {searchDuration}s elapsed
            </p>
          )}

          {/* Live Counter */}
          <div className="match-counter">
            <Users size={24} />
            <span className="counter-text">
              {status === 'running' ? (
                <>Finding: <strong>{foundCount}</strong> / 10</>
              ) : (
                <>Found: <strong>{foundCount}</strong> donor{foundCount !== 1 ? 's' : ''}</>
              )}
            </span>
          </div>

          {/* Progress Indicator */}
          {status === 'running' && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min((foundCount / 10) * 100, 100)}%` }}
              ></div>
            </div>
          )}
          
          {/* Action Message */}
          {getActionMessage() && (
            <p className="action-message">
              {getActionMessage()}
            </p>
          )}

          {/* Error Message */}
          {error && status !== 'failed' && (
            <div className="error-message warning">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
          
          {status === 'failed' && (
            <div className="error-message">
              <XCircle size={18} />
              <span>{error || 'Search failed - please try again or contact support'}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="search-actions">
            {/* Running state */}
            {status === 'running' && (
              <button onClick={onClose} className="btn-secondary">
                Cancel Search
              </button>
            )}
            
            {/* Done state */}
            {status === 'done' && foundCount > 0 && (
              <button onClick={() => onComplete && onComplete({ status, matches, foundCount })} className="btn-primary">
                View Results
              </button>
            )}
            
            {/* No donors found - offer options */}
            {showExpandOptions() && (
              <>
                <button 
                  onClick={handleExpandRadius} 
                  className="btn-primary"
                  disabled={isExpanding}
                >
                  {isExpanding ? (
                    <><Loader className="animate-spin" size={18} /> Expanding...</>
                  ) : (
                    <><Radio size={18} /> Expand to 50 km</>
                  )}
                </button>
                <button onClick={handleNotifyEmergency} className="btn-warning">
                  <AlertTriangle size={18} />
                  Notify Emergency Network
                </button>
              </>
            )}
            
            {/* Failed state */}
            {status === 'failed' && (
              <>
                <button onClick={handleRetrySearch} className="btn-primary">
                  <RefreshCw size={18} />
                  Retry Search
                </button>
                <button onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorSearchOverlay;
