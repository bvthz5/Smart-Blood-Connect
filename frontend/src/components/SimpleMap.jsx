import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SimpleMap.css';

// Import marker images directly for Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix marker icons - VITE COMPATIBLE
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const SimpleMap = ({ userLocation, requests = [] }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    // Destroy existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    console.log('🗺️ Creating Leaflet map...');

    try {
      // Create map with explicit options
      const map = L.map(mapRef.current, {
        center: [10.8505, 76.2711], // Kerala center
        zoom: 8,
        minZoom: 7,
        maxZoom: 18,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: false,
      });

      console.log('🗺️ Map instance created');

      // Add tile layer - MULTIPLE FALLBACKS
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      });

      tileLayer.on('loading', () => {
        console.log('🗺️ Tiles loading...');
      });

      tileLayer.on('load', () => {
        console.log('🗺️ Tiles loaded!');
        setMapLoaded(true);
      });

      tileLayer.on('tileerror', (error) => {
        console.error('🗺️ Tile error:', error);
      });

      tileLayer.addTo(map);

      console.log('🗺️ Tile layer added');

      // Set Kerala bounds
      const keralaBounds = L.latLngBounds([8.2, 74.8], [12.8, 77.5]);
      map.setMaxBounds(keralaBounds);
      map.fitBounds(keralaBounds);

      console.log('🗺️ Kerala bounds set');

      // Add user marker
      if (userLocation?.lat && userLocation?.lng) {
        L.marker([userLocation.lat, userLocation.lng])
          .addTo(map)
          .bindPopup('<strong>📍 Your Location</strong>');
        console.log('🗺️ User marker added');
      }

      // Add request markers
      requests.forEach((req, idx) => {
        if (req.lat && req.lng) {
          const color = req.urgency === 'high' ? 'red' : req.urgency === 'medium' ? 'orange' : 'green';
          
          L.marker([req.lat, req.lng])
            .addTo(map)
            .bindPopup(`
              <div style="min-width: 200px;">
                <strong style="color: ${color}">🏥 ${req.hospital_name || 'Hospital'}</strong><br/>
                ${req.blood_group ? `🩸 ${req.blood_group}<br/>` : ''}
                ${req.urgency ? `⚠️ ${req.urgency.toUpperCase()}<br/>` : ''}
                ${req.address || ''}
              </div>
            `);
        }
      });

      console.log(`🗺️ Added ${requests.length} hospital markers`);

      // Force render with multiple attempts
      setTimeout(() => {
        map.invalidateSize(true);
        console.log('🗺️ First invalidateSize');
      }, 100);
      
      setTimeout(() => {
        map.invalidateSize(true);
        console.log('🗺️ Second invalidateSize');
      }, 500);
      
      setTimeout(() => {
        map.invalidateSize(true);
        console.log('🗺️ Third invalidateSize');
      }, 1000);

      mapInstanceRef.current = map;
      console.log('🗺️ Map setup complete!');

    } catch (error) {
      console.error('🗺️ Map creation error:', error);
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        console.log('🗺️ Cleaning up map...');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when requests change
  useEffect(() => {
    if (!mapInstanceRef.current || !requests.length) return;
    console.log('🗺️ Requests updated, re-rendering...');
  }, [requests]);

  return (
    <div className="simple-map-wrapper">
      <div ref={mapRef} className="simple-map" id="leaflet-map" />
      {!mapLoaded && (
        <div className="map-loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading Kerala map...</p>
        </div>
      )}
    </div>
  );
};

export default SimpleMap;
