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
 * MapSizeFix - Simple and effective visibility fix
 */
function MapSizeFix() {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    console.log('🗺️ MapSizeFix: Map instance received');
    
    // Aggressive immediate render
    map.invalidateSize(true);
    
    // Set Kerala bounds immediately
    const keralaBounds = L.latLngBounds(
      [8.2, 74.8],
      [12.8, 77.5]
    );
    map.setMaxBounds(keralaBounds);
    
    // Multiple invalidation attempts
    const timers = [
      setTimeout(() => {
        console.log('🗺️ MapSizeFix: First invalidation');
        map.invalidateSize(true);
      }, 50),
      setTimeout(() => {
        console.log('🗺️ MapSizeFix: Second invalidation + fit bounds');
        map.invalidateSize(true);
        map.fitBounds(keralaBounds);
      }, 100),
      setTimeout(() => {
        console.log('🗺️ MapSizeFix: Third invalidation');
        map.invalidateSize(true);
      }, 300),
      setTimeout(() => {
        console.log('🗺️ MapSizeFix: Fourth invalidation');
        map.invalidateSize(true);
      }, 500),
      setTimeout(() => {
        console.log('🗺️ MapSizeFix: Final invalidation');
        map.invalidateSize(true);
      }, 1000),
    ];
    
    // Force continuous visibility
    const interval = setInterval(() => {
      map.invalidateSize(false);
    }, 2000);
    
    console.log('🗺️ MapSizeFix: Complete! Kerala bounds set.');
    
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [map]);
  
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
  height = '600px', // Increased default from 400px to 600px
  centerFallback = [9.9312, 76.2673], // Kochi, India
  showConnections = false,
  fullPage = false,
  invalidateToken,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [clickedPosition, setClickedPosition] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  
  // ============================================================================
  // LOCATION NORMALIZATION
  // ============================================================================
  // Support both {lat, lng} and {latitude, longitude} formats
  const userLat = userLocation?.lat ?? userLocation?.latitude ?? null;
  const userLng = userLocation?.lng ?? userLocation?.longitude ?? null;
  const hasUser = userLat != null && userLng != null;

  // Determine map center and zoom level - KERALA CENTER
  const keralaCenter = [10.8505, 76.2711]; // Center of Kerala
  const center = hasUser ? [userLat, userLng] : keralaCenter;
  const zoom = hasUser ? 10 : 7; // Zoom 7 shows full Kerala

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
        height: height || '600px', // Increased from 400px
        minHeight: '600px', // Increased from 400px
        display: 'block',
        position: 'relative'
      };
      
  const mapBoxStyle = { 
    height: height || '600px', // Increased from 400px
    width: '100%', 
    minHeight: '600px', // Increased from 400px
    display: 'block',
    position: 'relative'
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  console.log('🗺️ MapComponent rendering:', {
    hasUser,
    requestCount: requestMarkers.length,
    center,
    zoom,
    height
  });
  
  return (
    <div 
      className={`${fullPage ? 'map-fullpage ' : ''}interactive-map-component`} 
      style={wrapperStyle}
    >
      <div style={mapBoxStyle}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: height || '600px', width: '100%' }} // Increased from 400px
          className="leaflet-map-container"
          scrollWheelZoom={true}
          zoomControl={true}
          attributionControl={true}
          minZoom={7}
          maxZoom={15}
          bounds={[[8.2, 74.8], [12.8, 77.5]]}
          maxBounds={[[8.2, 74.8], [12.8, 77.5]]}
          maxBoundsViscosity={1.0}
        >
          {/* Map size fix component */}
          <MapSizeFix />
        
          {/* Tile layer - OpenStreetMap with CORS fix */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            crossOrigin={true}
            maxZoom={19}
            minZoom={3}
            tileSize={256}
            zoomOffset={0}
            detectRetina={true}
            updateWhenIdle={false}
            updateWhenZooming={true}
            keepBuffer={2}
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
