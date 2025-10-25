import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, FeatureGroup, useMap, useMapEvents, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './InteractiveMap.css';
import L from 'leaflet';

// Fix default marker icons in bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function FitBounds({ markers }) {
  const map = useMap();
  useMemo(() => {
    if (!map || !markers || markers.length === 0) return;
    const bounds = L.latLngBounds(markers);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
    }
  }, [map, markers]);
  return null;
}

function MapClickHandler({ onClick }) {
  useMapEvents({
    click: (e) => {
      if (onClick) onClick(e.latlng);
    },
  });
  return null;
}

function MapSizeFix({ token }) {
  const map = useMap();
  useEffect(() => {
    let raf = 0;
    const debouncedFix = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => map.invalidateSize());
    };

    // Initial passes
    const t1 = setTimeout(debouncedFix, 120);
    const t2 = setTimeout(debouncedFix, 360);

    // Window resize
    window.addEventListener('resize', debouncedFix);

    // Observe container size changes
    const container = map.getContainer();
    const ro = new ResizeObserver(debouncedFix);
    ro.observe(container);

    // Observe parent mutations that might affect layout
    const mo = new MutationObserver(debouncedFix);
    if (container.parentElement) {
      mo.observe(container.parentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', debouncedFix);
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [map]);
  // Invalidate size when token changes (e.g., filters/pagination affecting layout)
  useEffect(() => {
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [map, token]);
  return null;
}

const TILE_PROVIDERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  cartoVoyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  osmHot: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France',
    maxZoom: 20,
  },
};

// Optional terrain provider using API keys
const MAPTILER_KEY = import.meta?.env?.VITE_MAPTILER_KEY;
const THUNDERFOREST_KEY = import.meta?.env?.VITE_THUNDERFOREST_KEY;

const TERRAIN_PROVIDER = MAPTILER_KEY
  ? {
      name: 'Terrain',
      url: `https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
      attribution:
        'Map tiles &copy; <a href="https://www.maptiler.com/" target="_blank" rel="noreferrer">MapTiler</a> | Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 20,
    }
  : THUNDERFOREST_KEY
  ? {
      name: 'Terrain',
      url: `https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_KEY}`,
      attribution:
        'Maps &copy; <a href="https://www.thunderforest.com/" target="_blank" rel="noreferrer">Thunderforest</a>, Data &copy; OpenStreetMap contributors',
      maxZoom: 22,
      subdomains: 'abc',
    }
  : null;

const MapComponent = ({
  userLocation,
  requests = [],
  onMarkerClick,
  height = '450px',
  centerFallback = [9.9312, 76.2673], // Kochi
  tileProvider = 'osm',
  tileUrl,
  tileAttribution,
  tileMaxZoom,
  showConnections = false,
  fullPage = false,
  invalidateToken,
}) => {
  const [clickedPosition, setClickedPosition] = useState(null);
  // Normalize user coordinates (support latitude/longitude or lat/lng)
  const userLat = userLocation?.lat ?? userLocation?.latitude ?? null;
  const userLng = userLocation?.lng ?? userLocation?.longitude ?? null;
  const hasUser = userLat != null && userLng != null;

  const center = hasUser ? [userLat, userLng] : centerFallback;
  const zoom = hasUser ? 13 : 10;

  const requestMarkers = requests.filter(r => r?.lat && r?.lng);

  const allMarkersForBounds = useMemo(() => {
    const points = [];
    if (hasUser) points.push([userLat, userLng]);
    requestMarkers.forEach(r => points.push([r.lat, r.lng]));
    return points;
  }, [hasUser, userLat, userLng, requestMarkers]);

  const provider = TILE_PROVIDERS[tileProvider] || TILE_PROVIDERS.osm;
  const finalTileUrl = tileUrl || provider.url;
  const finalAttribution = tileAttribution || provider.attribution;
  const finalMaxZoom = tileMaxZoom || provider.maxZoom || 19;

  const tileEventHandlers = {
    tileerror: () => {
      /* no-op: we keep other base layers available via LayersControl */
    },
  };

  const wrapperStyle = fullPage
    ? { height: '100vh', width: '100%', margin: 0, padding: 0 }
    : { width: '100%', height };
  const mapBoxStyle = { height: '100%', width: '100%' };

  return (
    <div className={`${fullPage ? 'map-fullpage ' : ''}interactive-map-component`} style={wrapperStyle}>
      <div style={mapBoxStyle}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          className="leaflet-map-container"
          fadeAnimation={false}
          zoomAnimation={true}
          updateWhenIdle={true}
          preferCanvas={false}
          scrollWheelZoom
        >
        <MapSizeFix token={JSON.stringify({ invalidateToken, reqs: requestMarkers.length, hasUser })} />
        <LayersControl position="topright">
          {/* Street (default) */}
          <LayersControl.BaseLayer name="Street" checked>
            <TileLayer
              attribution={TILE_PROVIDERS.cartoVoyager.attribution}
              url={TILE_PROVIDERS.cartoVoyager.url}
              maxZoom={TILE_PROVIDERS.cartoVoyager.maxZoom}
              crossOrigin="anonymous"
              keepBuffer={2}
              errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
              eventHandlers={tileEventHandlers}
            />
          </LayersControl.BaseLayer>

          {/* Satellite (Esri World Imagery) */}
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
              url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              maxZoom={19}
              crossOrigin="anonymous"
              keepBuffer={2}
              errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
              eventHandlers={tileEventHandlers}
            />
          </LayersControl.BaseLayer>

          {/* Optional Terrain layer (enabled only if API key is set) */}
          {TERRAIN_PROVIDER && (
            <LayersControl.BaseLayer name="Terrain">
              <TileLayer
                attribution={TERRAIN_PROVIDER.attribution}
                url={TERRAIN_PROVIDER.url}
                maxZoom={TERRAIN_PROVIDER.maxZoom}
                subdomains={TERRAIN_PROVIDER.subdomains}
                crossOrigin="anonymous"
                keepBuffer={2}
                errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
                eventHandlers={tileEventHandlers}
              />
            </LayersControl.BaseLayer>
          )}

          {/* OpenStreetMap Classic */}
          <LayersControl.BaseLayer name="OSM">
            <TileLayer
              attribution={TILE_PROVIDERS.osm.attribution}
              url={TILE_PROVIDERS.osm.url}
              maxZoom={TILE_PROVIDERS.osm.maxZoom}
              crossOrigin="anonymous"
              keepBuffer={2}
              errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
              eventHandlers={tileEventHandlers}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapClickHandler onClick={setClickedPosition} />

        {hasUser && (
          <Marker position={[userLat, userLng]}>
            <Popup>
              <div>
                <strong>Your Location</strong>
                <div>Lat: {userLat.toFixed(6)}</div>
                <div>Lng: {userLng.toFixed(6)}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {requestMarkers.map((req, idx) => (
          <Marker
            key={req.id ?? idx}
            position={[req.lat, req.lng]}
            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(req) } : undefined}
          >
            <Popup>
              <div>
                <strong>{req.hospital_name || 'Medical Facility'}</strong>
                {req.urgency && (
                  <div style={{ marginTop: 4 }}>
                    Urgency: <b>{String(req.urgency).toUpperCase()}</b>
                  </div>
                )}
                {req.blood_group && <div>Blood Group: {req.blood_group}</div>}
                {req.units_required && <div>Units: {req.units_required}</div>}
                {req.address && <div>Address: {req.address}</div>}
              </div>
            </Popup>
          </Marker>
        ))}

        {clickedPosition && (
          <Marker position={clickedPosition}>
            <Popup>
              <div>
                <strong>Clicked here</strong>
                <div>Lat: {clickedPosition.lat.toFixed(6)}</div>
                <div>Lng: {clickedPosition.lng.toFixed(6)}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {hasUser && requestMarkers.length > 0 && showConnections && (
          <FeatureGroup>
            {requestMarkers.map((req, idx) => (
              <Polyline
                key={`line-${req.id ?? idx}`}
                positions={[[userLat, userLng], [req.lat, req.lng]]}
                pathOptions={{
                  color: req.urgency === 'high' ? '#DC2626' : req.urgency === 'medium' ? '#F59E0B' : '#10B981',
                  weight: 2,
                  opacity: 0.6,
                  dashArray: req.urgency === 'high' ? undefined : '5,8',
                }}
              />
            ))}
          </FeatureGroup>
        )}

        {allMarkersForBounds.length > 0 && (
          <FitBounds markers={allMarkersForBounds} />
        )}
        </MapContainer>
      </div>

      {clickedPosition && !fullPage && (
        <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: 8 }}>
          <strong>Last clicked position:</strong>
          <div>Latitude: {clickedPosition.lat.toFixed(6)}</div>
          <div>Longitude: {clickedPosition.lng.toFixed(6)}</div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
