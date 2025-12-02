import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Trip, AppSettings, ItineraryItem } from '../types';
import { translations } from '../utils/translations';
import { geocodeAddress } from '../services/geocoding';
import { MapPinIcon, SparklesIcon } from './Icons';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface TripMapProps {
    trip: Trip;
    settings: AppSettings;
    onUpdateTrip?: (trip: Trip) => void;
}

// Component to update map view bounds
const MapUpdater = ({ bounds }: { bounds: L.LatLngBoundsExpression }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && (bounds as any).length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
};

// Component to invalidate map size on mount to fix rendering issues
const MapInvalidator = () => {
    const map = useMap();
    useEffect(() => {
        // Small delay to ensure container is fully rendered and sized
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 250);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
};

const TripMap: React.FC<TripMapProps> = ({ trip, settings, onUpdateTrip }) => {
    const t = translations[settings.language] || translations['zh-TW'];
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [activeDay, setActiveDay] = useState<number | 'ALL'>('ALL');

    // Filter items based on active day
    const displayItems = useMemo(() => {
        const items = trip.itinerary || [];
        if (activeDay === 'ALL') return items;
        return items.filter(item => item.day === activeDay);
    }, [trip.itinerary, activeDay]);

    // Group items by day for polylines
    const itemsByDay = useMemo(() => {
        const grouped: { [key: number]: ItineraryItem[] } = {};
        (trip.itinerary || []).forEach(item => {
            if (!grouped[item.day]) grouped[item.day] = [];
            grouped[item.day].push(item);
        });
        // Sort by time
        Object.keys(grouped).forEach(day => {
            grouped[Number(day)].sort((a, b) => a.time.localeCompare(b.time));
        });
        return grouped;
    }, [trip.itinerary]);

    // Calculate bounds
    const bounds = useMemo(() => {
        const points = displayItems
            .filter(i => i.coordinates || (i.lat && i.lng))
            .map(i => [i.coordinates?.lat || i.lat!, i.coordinates?.lng || i.lng!] as [number, number]);

        if (points.length === 0) return null;
        return points;
    }, [displayItems]);

    // Handle Geocoding Missing Items
    const handleGeocodeMissing = async () => {
        setIsGeocoding(true);
        const newItinerary = [...(trip.itinerary || [])];
        let updated = false;

        try {
            for (let i = 0; i < newItinerary.length; i++) {
                const item = newItinerary[i];
                if (!item.coordinates && !item.lat) {
                    // Try to geocode
                    // Use location only for clearer context
                    const query = item.location;
                    console.log(`Geocoding: ${query}`);
                    window.localStorage.setItem('last_geocode_query', query);

                    const coords = await geocodeAddress(query, settings.apiKey);
                    window.localStorage.setItem('last_geocode_result', coords ? JSON.stringify(coords) : 'Failed');

                    if (coords) {
                        newItinerary[i] = {
                            ...item,
                            coordinates: coords,
                            lat: coords.lat,
                            lng: coords.lng
                        };
                        updated = true;
                        // Small delay to avoid rate limits if any
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            }

            if (updated && onUpdateTrip) {
                onUpdateTrip({ ...trip, itinerary: newItinerary });
                alert("Coordinates updated!");
            } else {
                alert("No new coordinates found.");
            }
        } catch (e) {
            console.error("Geocoding error", e);
            alert("Error updating coordinates.");
        } finally {
            setIsGeocoding(false);
        }
    };

    // Auto-sync on mount if items exist but coords are missing
    useEffect(() => {
        // Clear stale errors on mount
        window.localStorage.removeItem('last_geocode_error');

        // Check if we have items with location but no coordinates
        const missingCoords = trip.itinerary?.filter(
            item => item.location && (!item.lat || !item.lng)
        ) || [];

        console.log("Auto-Sync Check:", { hasItems: trip.itinerary?.length > 0, hasMissingCoords: missingCoords.length > 0, itinerary: trip.itinerary });

        if (missingCoords.length > 0) {
            console.log("Triggering auto-sync...");
            handleGeocodeMissing();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    const days = Object.keys(itemsByDay).map(Number).sort((a, b) => a - b);
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#33FFF5', '#F5FF33'];

    return (
        <div className="h-[60vh] flex flex-col pb-24">
            {/* Controls */}
            <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar py-1">
                <button
                    onClick={() => setActiveDay('ALL')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeDay === 'ALL' ? 'bg-ink text-white' : 'bg-white text-gray-500 border border-sand'}`}
                >
                    ALL
                </button>
                {days.map(day => (
                    <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeDay === day ? 'bg-coral text-white' : 'bg-white text-gray-500 border border-sand'}`}
                    >
                        Day {day}
                    </button>
                ))}
                <button
                    onClick={handleGeocodeMissing}
                    disabled={isGeocoding}
                    className="ml-auto px-3 py-1.5 bg-white border border-coral text-coral rounded-full text-xs font-bold flex items-center gap-1 hover:bg-coral hover:text-white transition-colors disabled:opacity-50"
                >
                    {isGeocoding ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <SparklesIcon className="w-3 h-3" />
                    )}
                    Sync Map
                </button>
            </div>

            {/* Map */}
            <div className="flex-1 bg-gray-100 rounded-3xl overflow-hidden shadow-inner border border-sand relative z-0">
                <MapContainer
                    center={[25.0330, 121.5654]} // Default to Taipei
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    />

                    <MapInvalidator />
                    {bounds && <MapUpdater bounds={bounds} />}

                    {/* Markers */}
                    {displayItems.map((item, idx) => {
                        const lat = item.coordinates?.lat || item.lat;
                        const lng = item.coordinates?.lng || item.lng;
                        if (!lat || !lng) return null;

                        return (
                            <Marker
                                key={item.id || idx}
                                position={[lat, lng]}
                                icon={L.divIcon({
                                    className: 'custom-div-icon',
                                    html: `<div style="background-color: ${colors[(item.day - 1) % colors.length]}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">${idx + 1}</div>`,
                                    iconSize: [24, 24],
                                    iconAnchor: [12, 12]
                                })}
                            >
                                <Popup>
                                    <div className="text-center">
                                        <div className="font-bold text-ink">{idx + 1}. {item.activity}</div>
                                        <div className="text-xs text-gray-500">{item.time}</div>
                                        <div className="text-xs text-coral mt-1">Day {item.day}</div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Polylines */}
                    {days.map((day, idx) => {
                        if (activeDay !== 'ALL' && activeDay !== day) return null;

                        const dayItems = itemsByDay[day];
                        const positions = dayItems
                            .filter(i => (i.coordinates?.lat || i.lat) && (i.coordinates?.lng || i.lng))
                            .map(i => [i.coordinates?.lat || i.lat!, i.coordinates?.lng || i.lng!] as [number, number]);

                        if (positions.length < 2) return null;

                        return (
                            <Polyline
                                key={day}
                                positions={positions}
                                color={colors[idx % colors.length]}
                                weight={4}
                                opacity={0.7}
                                dashArray="10, 10"
                            />
                        );
                    })}
                </MapContainer>

                {/* Overlay removed for auto-show map */}
            </div>
        </div>
    );
};


export default TripMap;
