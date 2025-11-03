import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import { 
  Loader, Users, MapPin, CheckCircle, XCircle, RefreshCw, 
  AlertTriangle, Radio, Navigation, Phone, Mail, ArrowLeft,
  Activity, Clock, Award, Heart
} from 'lucide-react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import SeekerNavbar from '../../components/seeker/SeekerNavbar';
import SeekerSidebar from '../../components/seeker/SeekerSidebar';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './DonorSearchResults.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DonorSearchResults = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const location = useLocation();
  const [status, setStatus] = useState('running');
  const [foundCount, setFoundCount] = useState(0);
  const [matches, setMatches] = useState([]);
  const [searchMetadata, setSearchMetadata] = useState(null);
  const [hospitalLocation, setHospitalLocation] = useState(null);
  const [error, setError] = useState(null);
  const [searchDuration, setSearchDuration] = useState(0);
  const [isExpanding, setIsExpanding] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const lastUpdatedRef = useRef(null);
  const searchStartTime = useRef(Date.now());
  const mapRef = useRef(null);
  
  const POLL_INTERVAL = 2000;
  const POLL_TIMEOUT = 60000;

  useEffect(() => {
    let mounted = true;
    let interval = null;
    let timeoutTimer = null;
    let durationTimer = null;
    let currentController = null;

    // Update search duration
    durationTimer = setInterval(() => {
      if (mounted) {
        const elapsed = Math.floor((Date.now() - searchStartTime.current) / 1000);
        setSearchDuration(elapsed);
      }
    }, 1000);

    // Set overall timeout
    timeoutTimer = setTimeout(() => {
      if (mounted && status === 'running') {
        setError('Search timeout - server not responding');
        setStatus('failed');
        if (interval) clearInterval(interval);
      }
    }, POLL_TIMEOUT);

    const poll = async () => {
      // Skip if component unmounted
      if (!mounted) return;

      try {
        const token = localStorage.getItem('seeker_token') || localStorage.getItem('access_token');
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const qs = lastUpdatedRef.current ? `?since=${encodeURIComponent(lastUpdatedRef.current)}` : '';
        
        // Create new AbortController for this request
        currentController = new AbortController();
        const timeoutId = setTimeout(() => {
          if (currentController) {
            currentController.abort();
          }
        }, 5000);
        
        const response = await fetch(`/api/requests/${requestId}/match-status${qs}`, { 
          headers,
          signal: currentController.signal 
        });
        
        clearTimeout(timeoutId);
        
        // Check if unmounted after fetch completes
        if (!mounted) return;
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Check again if still mounted
        if (!mounted) return;

        // Update metadata
        if (data.search_metadata) {
          setSearchMetadata(data.search_metadata);
          if (data.search_metadata.hospital?.location) {
            setHospitalLocation(data.search_metadata.hospital.location);
          }
        }

        // Handle new matches
        if (data.matched && data.matched.length > 0) {
          const existingIds = new Set(matches.map(m => m.match_prediction_id));
          const newMatches = data.matched.filter(m => !existingIds.has(m.match_prediction_id));
          
          if (newMatches.length > 0) {
            setMatches(prev => [...prev, ...newMatches].sort((a, b) => (a.rank || 99) - (b.rank || 99)));
            setFoundCount(data.found_count || matches.length + newMatches.length);
            announceToScreenReader(`Found ${newMatches.length} new donor${newMatches.length > 1 ? 's' : ''}. Total: ${data.found_count}`);
          }
        }

        setStatus(data.status);
        setFoundCount(data.found_count || 0);
        lastUpdatedRef.current = data.updated_at;

        // Stop polling if complete
        if (data.status === 'done' || data.status === 'none_found' || data.status === 'failed') {
          if (interval) clearInterval(interval);
          if (timeoutTimer) clearTimeout(timeoutTimer);
          
          if (data.status === 'done') {
            announceToScreenReader(`Search complete. Found ${data.found_count} compatible donors.`);
          } else if (data.status === 'none_found') {
            announceToScreenReader('No compatible donors found in the search area.');
          }
        }

      } catch (err) {
        // Only log and handle errors if component is still mounted
        if (mounted) {
          // Don't show error for AbortError when component is unmounting
          if (err.name !== 'AbortError') {
            console.error('Poll error:', err);
            setError(err.message || 'Network error occurred');
          }
        }
      }
    };

    // Start polling
    poll();
    interval = setInterval(poll, POLL_INTERVAL);

    // Cleanup function
    return () => {
      mounted = false;
      
      // Abort any ongoing fetch
      if (currentController) {
        currentController.abort();
      }
      
      // Clear all timers
      if (interval) clearInterval(interval);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (durationTimer) clearInterval(durationTimer);
    };
  }, [requestId]);

  const announceToScreenReader = (message) => {
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
        body: JSON.stringify({ radius_km: 50 })
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
      navigate('/seeker/requests');
    } catch (err) {
      console.error('Emergency notify failed:', err);
      setError('Failed to send emergency notification.');
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
        return `${foundCount} compatible donor${foundCount !== 1 ? 's' : ''} found`;
      case 'none_found':
        return `No eligible donors found within ${radius} km`;
      case 'failed':
        return 'Search failed — try again or contact support';
      default:
        return 'Initializing search...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader className="animate-spin" size={32} />;
      case 'done':
        return <CheckCircle size={32} className="text-green-600" />;
      case 'none_found':
        return <AlertTriangle size={32} className="text-orange-600" />;
      case 'failed':
        return <XCircle size={32} className="text-red-600" />;
      default:
        return <Activity size={32} className="text-blue-600" />;
    }
  };

  const showExpandOptions = () => {
    return (status === 'none_found' || (status === 'running' && searchDuration > 30 && foundCount === 0));
  };

  // Custom marker icons
  const hospitalIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#c62828">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 16h-2v-3H7v-2h3v-3h2v3h3v2h-3v3z"/>
      </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  const donorIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#4caf50">
        <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
        <path d="M12 6v12M6 12h12" stroke="white" stroke-width="2"/>
      </svg>
    `),
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });

  return (
    <SeekerLayout navbar={<SeekerNavbar />} sidebar={<SeekerSidebar />}>
      <div className="donor-search-results-page">
        {/* ARIA Live Region */}
        <div 
          id="search-announcement" 
          role="status" 
          aria-live="polite" 
          aria-atomic="true"
          className="sr-only"
        ></div>

        {/* Header */}
        <div className="search-header">
          <button onClick={() => navigate('/seeker/requests')} className="back-button">
            <ArrowLeft size={20} />
            Back to Requests
          </button>
          <h1>Donor Search Progress</h1>
        </div>

        <div className="search-content-grid">
          {/* Left Panel - Radar & Status */}
          <div className="search-left-panel">
            {/* Radar Animation */}
            <div className="radar-section">
              <div className="radar-container" aria-hidden="true">
                {status === 'running' && <div className="radar-sweep"></div>}
                <div className="hospital-marker-center">
                  <MapPin size={32} className="text-red-600" />
                  {status === 'running' && <div className="pulse-ring"></div>}
                </div>
                
                {/* Animated donor dots */}
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
            </div>

            {/* Status Display */}
            <div className="status-section">
              <div className="status-icon-wrapper">
                {getStatusIcon()}
              </div>
              
              <h2 className="status-title">{getStatusText()}</h2>
              
              {searchMetadata?.hospital && (
                <p className="hospital-info">
                  <MapPin size={16} />
                  {searchMetadata.hospital.name} • {searchMetadata.hospital.district}
                </p>
              )}

              {/* Live Counter */}
              <div className="match-counter-large">
                <Users size={28} />
                <span className="counter-text">
                  {status === 'running' ? (
                    <>Finding: <strong>{foundCount}</strong> / 10</>
                  ) : (
                    <>Found: <strong>{foundCount}</strong> donor{foundCount !== 1 ? 's' : ''}</>
                  )}
                </span>
              </div>

              {/* Progress Bar */}
              {status === 'running' && (
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min((foundCount / 10) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="search-time">
                    <Clock size={14} /> {searchDuration}s elapsed
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && status !== 'failed' && (
                <div className="error-banner warning">
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                </div>
              )}
              
              {status === 'failed' && (
                <div className="error-banner">
                  <XCircle size={18} />
                  <span>{error || 'Search failed - please try again or contact support'}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="action-buttons">
                {status === 'running' && (
                  <button onClick={() => navigate('/seeker/requests')} className="btn-secondary">
                    Cancel Search
                  </button>
                )}
                
                {status === 'done' && foundCount > 0 && (
                  <button onClick={() => navigate('/seeker/requests')} className="btn-primary">
                    <CheckCircle size={18} />
                    View All Requests
                  </button>
                )}
                
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
                
                {status === 'failed' && (
                  <>
                    <button onClick={handleRetrySearch} className="btn-primary">
                      <RefreshCw size={18} />
                      Retry Search
                    </button>
                    <button onClick={() => navigate('/seeker/requests')} className="btn-secondary">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Map & Donors List */}
          <div className="search-right-panel">
            {/* Map */}
            {hospitalLocation && (
              <div className="map-section">
                <h3 className="section-title">
                  <Navigation size={20} />
                  Donor Locations
                </h3>
                <MapContainer
                  center={[hospitalLocation.lat, hospitalLocation.lng]}
                  zoom={11}
                  style={{ height: '400px', width: '100%', borderRadius: '12px' }}
                  ref={mapRef}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  
                  {/* Hospital Marker */}
                  <Marker 
                    position={[hospitalLocation.lat, hospitalLocation.lng]}
                    icon={hospitalIcon}
                  >
                    <Popup>
                      <div className="map-popup">
                        <strong>🏥 Hospital</strong>
                        <p>{searchMetadata?.hospital?.name}</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Search Radius Circle */}
                  <Circle
                    center={[hospitalLocation.lat, hospitalLocation.lng]}
                    radius={(searchMetadata?.radius_km || 20) * 1000}
                    pathOptions={{ color: '#c62828', fillColor: '#c62828', fillOpacity: 0.1 }}
                  />

                  {/* Donor Markers with Polylines */}
                  {matches.map((donor) => {
                    if (!donor.location?.lat || !donor.location?.lng) return null;
                    
                    return (
                      <React.Fragment key={donor.match_prediction_id}>
                        {/* Line from hospital to donor */}
                        <Polyline
                          positions={[
                            [hospitalLocation.lat, hospitalLocation.lng],
                            [donor.location.lat, donor.location.lng]
                          ]}
                          pathOptions={{ color: '#4caf50', weight: 2, opacity: 0.6, dashArray: '5, 10' }}
                        />
                        
                        {/* Donor Marker */}
                        <Marker
                          position={[donor.location.lat, donor.location.lng]}
                          icon={donorIcon}
                          eventHandlers={{
                            click: () => setSelectedDonor(donor)
                          }}
                        >
                          <Popup>
                            <div className="map-popup donor-popup">
                              <strong>🩸 {donor.donor_name}</strong>
                              <p>Blood Group: <span className="blood-badge">{donor.blood_group}</span></p>
                              <p>📍 Distance: <strong>{donor.distance_km} km</strong></p>
                              <p>⭐ Match Score: <strong>{(donor.match_score * 100).toFixed(0)}%</strong></p>
                              {donor.notified && donor.contact_phone && (
                                <p>📞 {donor.contact_phone}</p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
              </div>
            )}

            {/* Donors List */}
            {matches.length > 0 && (
              <div className="donors-list-section">
                <h3 className="section-title">
                  <Users size={20} />
                  Matched Donors ({foundCount})
                </h3>
                <div className="donors-list">
                  {matches.map((donor, idx) => (
                    <div 
                      key={donor.match_prediction_id} 
                      className={`donor-card ${selectedDonor?.match_prediction_id === donor.match_prediction_id ? 'selected' : ''}`}
                      onClick={() => setSelectedDonor(donor)}
                    >
                      <div className="donor-card-header">
                        <div className="donor-rank">#{idx + 1}</div>
                        <div className="donor-name">
                          <Heart size={16} className="text-red-500" />
                          {donor.donor_name}
                        </div>
                        <div className="blood-group-badge">{donor.blood_group}</div>
                      </div>
                      
                      <div className="donor-card-body">
                        <div className="donor-stat">
                          <Navigation size={14} />
                          <span>{donor.distance_km} km away</span>
                        </div>
                        
                        <div className="donor-stat">
                          <Award size={14} />
                          <span>Match: {(donor.match_score * 100).toFixed(0)}%</span>
                        </div>
                        
                        {donor.availability_score && (
                          <div className="donor-stat">
                            <Activity size={14} />
                            <span>Availability: {(donor.availability_score * 100).toFixed(0)}%</span>
                          </div>
                        )}
                        
                        {donor.notified && (
                          <div className="donor-stat notified">
                            <CheckCircle size={14} />
                            <span>Notified</span>
                          </div>
                        )}
                      </div>
                      
                      {donor.notified && donor.contact_phone && (
                        <div className="donor-card-footer">
                          <a href={`tel:${donor.contact_phone}`} className="contact-link">
                            <Phone size={14} />
                            {donor.contact_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {status === 'none_found' && matches.length === 0 && (
              <div className="no-results">
                <AlertTriangle size={48} className="text-orange-600" />
                <h3>No Donors Found</h3>
                <p>Try expanding the search radius or notify the emergency network.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SeekerLayout>
  );
};

export default DonorSearchResults;
