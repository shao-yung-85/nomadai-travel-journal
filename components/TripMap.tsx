import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ItineraryItem } from '../types';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TripMapProps {
    items: ItineraryItem[];
    onMarkerClick?: (item: ItineraryItem) => void;
}

const TripMap: React.FC<TripMapProps> = ({ items, onMarkerClick }) => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize map
        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([25.033, 121.5654], 13);

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(mapRef.current);
        }

        const map = mapRef.current;

        // Clear existing layers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });

        // Filter items with coordinates
        const itemsWithCoords = items.filter(item => item.coordinates);

        if (itemsWithCoords.length === 0) return;

        // Add markers
        const markers: L.Marker[] = [];
        const latLngs: L.LatLngExpression[] = [];

        itemsWithCoords.forEach((item) => {
            if (!item.coordinates) return;

            const { lat, lng } = item.coordinates;
            latLngs.push([lat, lng]);

            const marker = L.marker([lat, lng])
                .bindPopup(`
                    <div style="font-family: sans-serif;">
                        <strong>${item.activity}</strong><br/>
                        <span style="color: #666; font-size: 0.9em;">${item.time}</span><br/>
                        ${item.notes ? `<span style="font-size: 0.85em;">${item.notes}</span>` : ''}
                    </div>
                `)
                .addTo(map);

            if (onMarkerClick) {
                marker.on('click', () => onMarkerClick(item));
            }

            markers.push(marker);
        });

        // Draw route
        if (latLngs.length > 1) {
            L.polyline(latLngs, {
                color: '#D4A574',
                weight: 3,
                opacity: 0.8,
                smoothFactor: 1
            }).addTo(map);
        }

        // Fit bounds to show all markers
        if (latLngs.length > 0) {
            const bounds = L.latLngBounds(latLngs);
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        return () => {
            // Cleanup on unmount
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [items, onMarkerClick]);

    return (
        <div
            ref={mapContainerRef}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '400px'
            }}
        />
    );
};

export default TripMap;
