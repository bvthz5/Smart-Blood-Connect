import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import useGeolocation, { calculateDistance, formatCoordinates } from "../../hooks/useGeolocation";
import MapComponent from "../../components/MapComponent";
import { getNearbyRequests } from "../../services/api";
import "./nearby-requests.css";

const NearbyRequests = () => {
  const navigate = useNavigate();
  const { location, error, loading, permissionStatus, requestLocation } = useGeolocation();
  const [showLocationInfo, setShowLocationInfo] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  
  // Lock body scroll when fullscreen map is open
  useEffect(() => {
    if (!isMapFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMapFullscreen]);
  
  // Filtering and sorting states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('all');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [maxDistance, setMaxDistance] = useState(50); // km
  const [debouncedMaxDistance, setDebouncedMaxDistance] = useState(50); // Debounced value for map
  const [sortBy, setSortBy] = useState('distance'); // distance, urgency, hospital
  
  // Debounce distance slider to prevent map flicker
  const distanceDebounceRef = useRef(null);
  useEffect(() => {
    if (distanceDebounceRef.current) {
      clearTimeout(distanceDebounceRef.current);
    }
    distanceDebounceRef.current = setTimeout(() => {
      setDebouncedMaxDistance(maxDistance);
    }, 150); // 150ms debounce
    
    return () => {
      if (distanceDebounceRef.current) {
        clearTimeout(distanceDebounceRef.current);
      }
    };

  const handleContact = (request) => {
    const phone = request?.contact_phone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else if (request?.hospital_phone) {
      window.location.href = `tel:${request.hospital_phone}`;
    } else {
      alert('Contact number unavailable for this request.');
    }
  };
  }, [maxDistance]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4); // Show 4 requests per page (spec)
  
  // Requests data from backend
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState(null);
  
  // Fetch nearby requests from backend when location is available
  useEffect(() => {
    const fetchNearbyRequests = async () => {
      if (!location || !location.latitude || !location.longitude) {
        return;
      }
      
      setRequestsLoading(true);
      setRequestsError(null);
      
      try {
        const response = await getNearbyRequests(
          location.latitude,
          location.longitude,
          50 // Get requests within 50km radius (spec)
        );
        
        const fetchedRequests = response.data?.requests || [];
        setRequests(fetchedRequests);
      } catch (err) {
        console.error('Failed to fetch nearby requests:', err);
        setRequestsError('Failed to load blood requests. Please try again.');
        // Keep mock data as fallback for development
        setRequests([
    {
      id: 1,
      hospital_name: "Medical Trust Hospital",
      blood_group: "O+",
      urgency: "high",
      units_required: 2,
      address: "MG Road, Kochi",
      lat: 9.9312,
      lng: 76.2673
    },
    {
      id: 2,
      hospital_name: "Amrita Institute of Medical Sciences",
      blood_group: "O+",
      urgency: "medium",
      units_required: 1,
      address: "Ponekkara, Kochi",
      lat: 10.0219,
      lng: 76.3242
    },
    {
      id: 3,
      hospital_name: "Lakeshore Hospital",
      blood_group: "A+",
      urgency: "high",
      units_required: 3,
      address: "NH Bypass, Kochi",
      lat: 9.9674,
      lng: 76.2838
    },
    {
      id: 4,
      hospital_name: "Rajagiri Hospital",
      blood_group: "B+",
      urgency: "low",
      units_required: 1,
      address: "Chunangamveli, Kochi",
      lat: 10.0272,
      lng: 76.3517
    },
    {
      id: 5,
      hospital_name: "Cochin Hospital",
      blood_group: "AB+",
      urgency: "high",
      units_required: 2,
      address: "Kaloor, Kochi",
      lat: 9.9895,
      lng: 76.2953
    },
    {
      id: 6,
      hospital_name: "Aster Medcity",
      blood_group: "A-",
      urgency: "medium",
      units_required: 1,
      address: "Cheranalloor, Kochi",
      lat: 9.9397,
      lng: 76.3251
    },
    {
      id: 7,
      hospital_name: "KIMS Hospital",
      blood_group: "O-",
      urgency: "high",
      units_required: 3,
      address: "Edappally, Kochi",
      lat: 10.0245,
      lng: 76.3084
    },
    {
      id: 8,
      hospital_name: "VPS Lakeshore",
      blood_group: "B-",
      urgency: "low",
      units_required: 1,
      address: "Maradu, Kochi",
      lat: 9.9625,
      lng: 76.3004
    }
        ]);
      } finally {
        setRequestsLoading(false);
      }
    };
    
    fetchNearbyRequests();
  }, [location]);

  // Calculate distances and apply filters
  const filteredAndSortedRequests = useMemo(() => {
    let result = requests;

    // Calculate distances
    if (location && location.latitude) {
      result = result.map(req => ({
        ...req,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          req.lat,
          req.lng
        )
      }));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(req =>
        req.hospital_name.toLowerCase().includes(query) ||
        req.address.toLowerCase().includes(query) ||
        req.blood_group.toLowerCase().includes(query)
      );
    }

    // Apply blood group filter
    if (selectedBloodGroup !== 'all') {
      result = result.filter(req => req.blood_group === selectedBloodGroup);
    }

    // Apply urgency filter
    if (selectedUrgency !== 'all') {
      result = result.filter(req => req.urgency === selectedUrgency);
    }

    // Apply distance filter
    if (location && location.latitude) {
      result = result.filter(req => req.distance <= maxDistance);
    }

    // Apply sorting
    switch (sortBy) {
      case 'distance':
        result.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        break;
      case 'urgency':
        const urgencyOrder = { high: 1, medium: 2, low: 3 };
        result.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
        break;
      case 'hospital':
        result.sort((a, b) => a.hospital_name.localeCompare(b.hospital_name));
        break;
      case 'blood_group':
        result.sort((a, b) => a.blood_group.localeCompare(b.blood_group));
        break;
      default:
        break;
    }

    return result;
  }, [location, requests, searchQuery, selectedBloodGroup, selectedUrgency, maxDistance, sortBy]);

  // Separate filtered requests for map (uses debounced distance to prevent flicker)
  const mapRequests = useMemo(() => {
    let result = requests;

    // Calculate distances
    if (location && location.latitude) {
      result = result.map(req => ({
        ...req,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          req.lat,
          req.lng
        )
      }));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(req =>
        req.hospital_name.toLowerCase().includes(query) ||
        req.address.toLowerCase().includes(query) ||
        req.blood_group.toLowerCase().includes(query)
      );
    }

    // Apply blood group filter
    if (selectedBloodGroup !== 'all') {
      result = result.filter(req => req.blood_group === selectedBloodGroup);
    }

    // Apply urgency filter
    if (selectedUrgency !== 'all') {
      result = result.filter(req => req.urgency === selectedUrgency);
    }

    // Apply distance filter with DEBOUNCED value
    if (location && location.latitude) {
      result = result.filter(req => req.distance <= debouncedMaxDistance);
    }

    return result;
  }, [location, requests, searchQuery, selectedBloodGroup, selectedUrgency, debouncedMaxDistance]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedRequests.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedRequests.slice(startIndex, endIndex);
  }, [filteredAndSortedRequests, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBloodGroup, selectedUrgency, maxDistance, sortBy]);

  // Get unique blood groups for filter
  const bloodGroups = useMemo(() => {
    const groups = [...new Set(requests.map(req => req.blood_group))];
    return groups.sort();
  }, [requests]);

  // Setup global function for map popup buttons
  useEffect(() => {
    window.viewRequestDetails = (requestId) => {
      const request = filteredAndSortedRequests.find(r => r.id === requestId);
      if (request) {
        setSelectedRequest(request);
      }
    };

    return () => {
      delete window.viewRequestDetails;
    };
  }, [filteredAndSortedRequests]);

  const handleGetDirections = (request) => {
    if (location && location.latitude) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${request.lat},${request.lng}`;
      window.open(url, '_blank');
    } else {
      alert('Location not available. Please enable location access.');
    }
  };

  const formattedLocation = location && location.latitude
    ? formatCoordinates(location.latitude, location.longitude)
    : null;

  return (
    <div className="nearby-requests">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/donor/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>🧭 Nearby Requests</h1>
          <p>Blood donation requests near your location</p>
        </div>
      </header>

      {/* Location Status Bar */}
      <div className="location-status-bar">
        <div className="location-info">
          {loading && (
            <div className="status-item loading">
              <div className="status-spinner"></div>
              <span>Getting your location...</span>
            </div>
          )}

          {error && (
            <div className="status-item error">
              <span className="status-icon">⚠️</span>
              <span>{error.message}</span>
              <button className="retry-btn" onClick={requestLocation}>
                🔄 Retry
              </button>
            </div>
          )}

          {!loading && !error && location && location.latitude && (
            <div className="status-item success">
              <span className="status-icon">✅</span>
              <span>Location acquired</span>
              <button 
                className="info-btn"
                onClick={() => setShowLocationInfo(!showLocationInfo)}
              >
                ℹ️ Details
              </button>
            </div>
          )}

          {permissionStatus === 'denied' && (
            <div className="status-item warning">
              <span className="status-icon">🔒</span>
              <span>Location access denied. Please enable in browser settings.</span>
            </div>
          )}
        </div>

        {showLocationInfo && formattedLocation && (
          <div className="location-details">
            <h4>📍 Your Current Location</h4>
            <div className="coord-grid">
              <div className="coord-item">
                <strong>Latitude:</strong> {formattedLocation.latitude}
              </div>
              <div className="coord-item">
                <strong>Longitude:</strong> {formattedLocation.longitude}
              </div>
              <div className="coord-item">
                <strong>Decimal:</strong> {formattedLocation.decimal}
              </div>
              {location.accuracy && (
                <div className="coord-item">
                  <strong>Accuracy:</strong> ±{Math.round(location.accuracy)}m
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Requests Loading/Error Status */}
      {requestsLoading && (
        <div className="loading-banner">
          <div className="status-spinner"></div>
          <span>Loading nearby blood requests...</span>
        </div>
      )}

      {requestsError && (
        <div className="error-banner">
          <span className="status-icon">⚠️</span>
          <span>{requestsError}</span>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            🔄 Retry
          </button>
        </div>
      )}

      <div className="nearby-container">
        {/* Filters and Controls */}
        <div className="controls-section">
          <div className="controls-header">
            <h3>🔍 Search & Filter</h3>
            <span className="results-count">
              {filteredAndSortedRequests.length} of {requests.length} requests
            </span>
          </div>

          {/* Search Bar */}
          <div className="search-bar">
            <label htmlFor="searchQuery" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Search</label>
            <input
              type="text"
              className="search-input"
              placeholder="Search by hospital name, address, or blood group..."
              id="searchQuery"
              name="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" aria-label="Clear search" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="filters-row">
            {/* Blood Group Filter */}
            <div className="filter-group">
              <label htmlFor="filterBloodGroup">🩸 Blood Group</label>
              <select
                id="filterBloodGroup"
                name="blood_group"
                value={selectedBloodGroup}
                onChange={(e) => setSelectedBloodGroup(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Blood Groups</option>
                {bloodGroups.map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            {/* Urgency Filter */}
            <div className="filter-group">
              <label htmlFor="filterUrgency">⚠️ Urgency</label>
              <select
                id="filterUrgency"
                name="urgency"
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Urgencies</option>
                <option value="high">🚨 High</option>
                <option value="medium">⚠️ Medium</option>
                <option value="low">✅ Low</option>
              </select>
            </div>

            {/* Distance Filter */}
            <div className="filter-group">
              <label htmlFor="maxDistance">📍 Max Distance (0–50 km): {maxDistance} km</label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                id="maxDistance"
                name="max_distance_km"
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                className="distance-slider"
              />
            </div>

            {/* Sort By */}
            <div className="filter-group">
              <label htmlFor="sortBy">📊 Sort By</label>
              <select
                id="sortBy"
                name="sort_by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="distance">Distance (Nearest First)</option>
                <option value="urgency">Urgency (High First)</option>
                <option value="hospital">Hospital (A-Z)</option>
                <option value="blood_group">Blood Group (A-Z)</option>
              </select>
            </div>

            {/* Clear Filters */}
            <button 
              className="btn-clear-filters"
              onClick={() => {
                setSearchQuery('');
                setSelectedBloodGroup('all');
                setSelectedUrgency('all');
                setMaxDistance(50);
                setSortBy('distance');
              }}
            >
              🔄 Reset Filters
            </button>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="map-section">
          <div className="section-header">
            <h2>🗺️ Interactive Map View</h2>
            <span className="request-count">{mapRequests.length} locations</span>
            <button
              className="btn-fullscreen-map"
              onClick={() => setIsMapFullscreen(true)}
              title="Open full screen map"
              aria-label="Open full screen map"
            >
              ⛶ Full Screen
            </button>
          </div>
          <MapComponent
            userLocation={location}
            requests={mapRequests}
            onMarkerClick={(request) => setSelectedRequest(request)}
            height="450px"
            invalidateToken={`${debouncedMaxDistance}-${mapRequests.length}`}
          />
        </div>

        {/* Request Cards */}
        <div className="requests-section">
          <div className="section-header">
            <h2>📋 Blood Requests</h2>
            <div className="pagination-info">
              {filteredAndSortedRequests.length > 0 ? (
                <>
                  <span>
                    Showing {((currentPage - 1) * itemsPerPage) + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredAndSortedRequests.length)} of {filteredAndSortedRequests.length}
                  </span>
                  <span className="page-indicator">Page {currentPage} of {totalPages}</span>
                </>
              ) : (
                <span>No requests found</span>
              )}
            </div>
          </div>
          
          <div className="requests-grid">
            {filteredAndSortedRequests.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No Requests Found</h3>
                <p>
                  {searchQuery || selectedBloodGroup !== 'all' || selectedUrgency !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'There are no blood donation requests in your area at the moment.'}
                </p>
              </div>
            )}

            {paginatedRequests.map((req, index) => (
              <div 
                key={req.id} 
                className={`nearby-card ${selectedRequest?.id === req.id ? 'selected' : ''}`}
                style={{"--index": index}}
              >
                <div className="card-header-nearby">
                  <h3>{req.hospital_name}</h3>
                  <div className={`urgency-tag ${req.urgency}`}>
                    {req.urgency === 'high' ? '🚨' : '⚠️'} {req.urgency.toUpperCase()}
                  </div>
                </div>

                <div className="card-details">
                  <div className="detail-row-nearby">
                    <span className="icon">🩸</span>
                    <span><strong>Blood Group:</strong> {req.blood_group}</span>
                  </div>
                  <div className="detail-row-nearby">
                    <span className="icon">💉</span>
                    <span><strong>Units:</strong> {req.units_required}</span>
                  </div>
                  <div className="detail-row-nearby">
                    <span className="icon">📍</span>
                    <span>
                      <strong>Distance:</strong> {
                        req.distance !== undefined 
                          ? `${req.distance} km` 
                          : 'Calculating...'
                      }
                    </span>
                  </div>
                  <div className="detail-row-nearby">
                    <span className="icon">📌</span>
                    <span><strong>Address:</strong> {req.address}</span>
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    className="btn-directions"
                    onClick={() => handleGetDirections(req)}
                    disabled={!location || !location.latitude}
                  >
                    🗺️ Get Directions
                  </button>
                  <button className="btn-contact">
                    📞 Contact Now
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {filteredAndSortedRequests.length > itemsPerPage && (
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                ⏮️ First
              </button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ◀️ Previous
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Show first, last, current, and adjacent pages
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        className={`page-number ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="page-ellipsis">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next ▶️
              </button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last ⏭️
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Fullscreen Map Overlay via Portal */}
      {isMapFullscreen && createPortal(
        <>
          <MapComponent
            userLocation={location}
            requests={mapRequests}
            onMarkerClick={(request) => setSelectedRequest(request)}
            fullPage
            invalidateToken={`fullscreen-${debouncedMaxDistance}-${mapRequests.length}`}
          />
          <button
            className="map-fullscreen-close"
            onClick={() => setIsMapFullscreen(false)}
            title="Close full screen"
            aria-label="Close full screen"
          >
            ✕
          </button>
        </>,
        document.body
      )}
    </div>
  );
};

export default NearbyRequests;
