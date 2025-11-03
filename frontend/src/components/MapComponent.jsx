import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, FeatureGroup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './InteractiveMap.css';
import L from 'leaflet';

// ============================================================================
// MARKER ICON FIX - Required for bundlers (Vite/Webpack)
// ============================================================================
delete L.Icon.Default.prototype._getIconUrl;

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * FitBounds - Automatically adjusts map view to show all markers
 * @param {Array} markers - Array of [lat, lng] coordinates
 */
function FitBounds({ markers }) {
  const map = useMap();
  
  useMemo(() => {
    if (!map || !markers || markers.length === 0) return;
    
    try {
      const bounds = L.latLngBounds(markers);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
      }
    } catch (e) {
      console.warn('[FitBounds] Error fitting bounds:', e);
    }
  }, [map, markers]);
  
  return null;
}

/**
 * MapClickHandler - Handles click events on the map
 * @param {Function} onClick - Callback function for click events
 */
function MapClickHandler({ onClick }) {
  useMapEvents({
    click: (e) => {
      if (onClick) onClick(e.latlng);
    },
  });
  return null;
}

/**
 * MapSizeFix - Ensures map is always visible and properly sized
 * Fixes common issues with map not displaying or disappearing
 * @param {string} token - Token to trigger re-calculation when dependencies change
 */
function MapSizeFix({ token }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    let mounted = true;
    
    // Initial size fixes at different intervals to ensure proper rendering
    const timers = [
      setTimeout(() => {
        if (!mounted) return;
        try {
          map.invalidateSize(true);
          const container = map.getContainer();
          if (container) {
            container.style.display = 'block';
            container.style.opacity = '1';
            container.style.visibility = 'visible';
          }
        } catch (e) {
          // Silent error handling
        }
      }, 100),
      
      setTimeout(() => {
        if (!mounted) return;
        try {
          map.invalidateSize(true);
          const tilePane = map.getPane('tilePane');
          if (tilePane) {
            tilePane.style.opacity = '1';
            tilePane.style.visibility = 'visible';
          }
        } catch (e) {
          // Silent error handling
        }
      }, 500),
    ];

    // Handle window resize events
    const handleResize = () => {
      if (!mounted) return;
      try {
        map.invalidateSize(true);
      } catch (e) {
        // Silent error handling
      }
    };
    
    window.addEventListener('resize', handleResize);

    // Periodic check to ensure map stays visible (every 3 seconds)
    const interval = setInterval(() => {
      if (!mounted) return;
      try {
        const container = map.getContainer();
        if (container) {
          container.style.opacity = '1';
          container.style.visibility = 'visible';
        }
        const tilePane = map.getPane('tilePane');
        if (tilePane) {
          tilePane.style.opacity = '1';
          tilePane.style.visibility = 'visible';
        }
      } catch (e) {
        // Silent error handling
      }
    }, 3000);

    // Cleanup function
    return () => {
      mounted = false;
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [map, token]);
  
  return null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * MapComponent - Interactive map with markers, popups, and connections
 * 
 * Features:
 * - Displays user location and blood request markers
 * - Shows connections between user and requests
 * - Auto-fits bounds to show all markers
 * - Handles click events
 * - Fully responsive with proper sizing
 * - Always visible (no flickering or disappearing)
 * 
 * @param {Object} userLocation - User's current location {lat, lng} or {latitude, longitude}
 * @param {Array} requests - Array of blood request objects with lat/lng
 * @param {Function} onMarkerClick - Callback when a marker is clicked
 * @param {string} height - Map height (default: 400px)
 * @param {Array} centerFallback - Default center coordinates [lat, lng]
 * @param {boolean} showConnections - Show lines connecting user to requests
 * @param {boolean} fullPage - Display map in fullscreen mode
 * @param {string} invalidateToken - Token to trigger map recalculation
 */
const MapComponent = ({
  userLocation,
  requests = [],
  onMarkerClick,
  height = '400px',
  centerFallback = [9.9312, 76.2673], // Kochi, India
  showConnections = false,
  fullPage = false,
  invalidateToken,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [clickedPosition, setClickedPosition] = useState(null);
  
  // ============================================================================
  // LOCATION NORMALIZATION
  // ============================================================================
  // Support both {lat, lng} and {latitude, longitude} formats
  const userLat = userLocation?.lat ?? userLocation?.latitude ?? null;
  const userLng = userLocation?.lng ?? userLocation?.longitude ?? null;
  const hasUser = userLat != null && userLng != null;

  // Determine map center and zoom level
  const center = hasUser ? [userLat, userLng] : centerFallback;
  const zoom = hasUser ? 13 : 10;

  // ============================================================================
  // MARKER PROCESSING
  // ============================================================================
  // Filter valid request markers (must have coordinates)
  const requestMarkers = requests.filter(r => r?.lat && r?.lng);

  // Collect all markers for auto-fit bounds
  const allMarkersForBounds = useMemo(() => {
    const points = [];
    if (hasUser) points.push([userLat, userLng]);
    requestMarkers.forEach(r => points.push([r.lat, r.lng]));
    return points;
  }, [hasUser, userLat, userLng, requestMarkers]);

  // ============================================================================
  // STYLING
  // ============================================================================
  const wrapperStyle = fullPage
    ? { 
        height: '100vh', 
        width: '100vw', 
        margin: 0, 
        padding: 0, 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        zIndex: 9999 
      }
    : { 
        width: '100%', 
        height: height || '400px', 
        minHeight: '400px', 
        display: 'block' 
      };
      
  const mapBoxStyle = { 
    height: height || '400px', 
    width: '100%', 
    minHeight: '400px', 
    display: 'block' 
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div 
      className={`${fullPage ? 'map-fullpage ' : ''}interactive-map-component`} 
      style={wrapperStyle}
    >
      <div style={mapBoxStyle}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: height || '400px', width: '100%' }}
          className="leaflet-map-container"
          scrollWheelZoom={true}
          fadeAnimation={false}
          zoomAnimation={false}
          markerZoomAnimation={false}
          trackResize={true}
          doubleClickZoom={true}
          dragging={true}
          zoomControl={true}
          attributionControl={true}
          preferCanvas={false}
        >
          {/* Map size fix component */}
          <MapSizeFix 
            token={JSON.stringify({ 
              invalidateToken, 
              reqs: requestMarkers.length, 
              hasUser 
            })} 
          />
        
          {/* Tile layer - OpenStreetMap */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            subdomains={['a', 'b', 'c']}
            maxZoom={19}
            minZoom={3}
            opacity={1}
            className="map-tiles"
            keepBuffer={2}
            maxNativeZoom={19}
            tileSize={256}
            updateWhenIdle={false}
            updateWhenZooming={false}
            errorTileUrl="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Crect width='256' height='256' fill='%23e5e7eb'/%3E%3C/svg%3E"
          />

          {/* Click handler */}
          <MapClickHandler onClick={setClickedPosition} />

          {/* User location marker */}
          {hasUser && (
            <Marker position={[userLat, userLng]}>
              <Popup>
                <div>
                  <strong>📍 Your Location</strong>
                  <div>Latitude: {userLat.toFixed(6)}</div>
                  <div>Longitude: {userLng.toFixed(6)}</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Blood request markers */}
          {requestMarkers.map((req, idx) => (
            <Marker
              key={req.id ?? idx}
              position={[req.lat, req.lng]}
              eventHandlers={onMarkerClick ? { click: () => onMarkerClick(req) } : undefined}
            >
              <Popup>
                <div>
                  <strong>🏥 {req.hospital_name || 'Medical Facility'}</strong>
                  {req.urgency && (
                    <div style={{ marginTop: 4 }}>
                      Urgency: <b style={{ 
                        color: req.urgency === 'high' ? '#DC2626' : 
                               req.urgency === 'medium' ? '#F59E0B' : '#10B981' 
                      }}>
                        {String(req.urgency).toUpperCase()}
                      </b>
                    </div>
                  )}
                  {req.blood_group && <div>🩸 Blood Group: {req.blood_group}</div>}
                  {req.units_required && <div>💉 Units: {req.units_required}</div>}
                  {req.address && <div>📍 {req.address}</div>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Clicked position marker */}
          {clickedPosition && (
            <Marker position={clickedPosition}>
              <Popup>
                <div>
                  <strong>📌 Clicked Location</strong>
                  <div>Latitude: {clickedPosition.lat.toFixed(6)}</div>
                  <div>Longitude: {clickedPosition.lng.toFixed(6)}</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Connection lines between user and requests */}
          {hasUser && requestMarkers.length > 0 && showConnections && (
            <FeatureGroup>
              {requestMarkers.map((req, idx) => (
                <Polyline
                  key={`line-${req.id ?? idx}`}
                  positions={[[userLat, userLng], [req.lat, req.lng]]}
                  pathOptions={{
                    color: req.urgency === 'high' ? '#DC2626' : 
                           req.urgency === 'medium' ? '#F59E0B' : '#10B981',
                    weight: 2,
                    opacity: 0.6,
                    dashArray: req.urgency === 'high' ? undefined : '5,8',
                  }}
                />
              ))}
            </FeatureGroup>
          )}

          {/* Auto-fit bounds to show all markers */}
          {allMarkersForBounds.length > 0 && (
            <FitBounds markers={allMarkersForBounds} />
          )}
        </MapContainer>
      </div>

      {/* Display clicked position info */}
      {clickedPosition && !fullPage && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          background: '#f5f5f5', 
          borderRadius: 8,
          fontSize: '14px'
        }}>
          <strong>Last clicked position:</strong>
          <div>Latitude: {clickedPosition.lat.toFixed(6)}</div>
          <div>Longitude: {clickedPosition.lng.toFixed(6)}</div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
