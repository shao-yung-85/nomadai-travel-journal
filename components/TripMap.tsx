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
    initialSelectedItemId?: string | null;
}

// ... (MapUpdater, MapInvalidator, MapController, ItineraryMarker components remain unchanged)

const TripMap: React.FC<TripMapProps> = ({ trip, settings, onUpdateTrip, initialSelectedItemId }) => {
    const t = translations[settings.language] || translations['zh-TW'];
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [activeDay, setActiveDay] = useState<number | 'ALL'>('ALL');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(initialSelectedItemId || null);

    // ... (Filter items and Group items logic remain unchanged)

    // ... (Calculate bounds and selectedLocation logic remain unchanged)

    // ... (handleGeocodeMissing logic remains unchanged)

    // Handle initial selection from props or default to first item
    useEffect(() => {
        if (initialSelectedItemId) {
            setSelectedItemId(initialSelectedItemId);

            // Also switch to the day of the selected item if needed
            const item = trip.itinerary?.find(i => i.id === initialSelectedItemId);
            if (item) {
                setActiveDay('ALL'); // Or set to item.day if preferred, but ALL gives better context
            }
        } else if (trip.itinerary && trip.itinerary.length > 0 && !selectedItemId) {
            // Only default to first item if no selection exists
            setSelectedItemId(trip.itinerary[0].id);
        }
    }, [initialSelectedItemId, trip.id]);

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
        <div className="h-full flex flex-col pb-24">
            {/* Controls */}
            <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar py-1 shrink-0">
                <button
                    onClick={() => {
                        setActiveDay('ALL');
                        setSelectedItemId(null); // Reset selection to show all bounds
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeDay === 'ALL' ? 'bg-ink text-white' : 'bg-white text-gray-500 border border-sand'}`}
                >
                    ALL
                </button>
                {days.map(day => (
                    <button
                        key={day}
                        onClick={() => {
                            setActiveDay(day);
                            setSelectedItemId(null); // Reset selection to show day bounds
                        }}
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

            {/* Map Container */}
            <div className="h-[35vh] shrink-0 bg-gray-100 rounded-3xl overflow-hidden shadow-inner border border-sand relative z-0 mb-4">
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
                    {bounds && !selectedLocation && <MapUpdater bounds={bounds} />}
                    <MapController selectedLocation={selectedLocation} />

                    {/* Markers */}
                    {displayItems.map((item, idx) => (
                        <ItineraryMarker
                            key={item.id || idx}
                            item={item}
                            index={idx}
                            isSelected={selectedItemId === item.id}
                            color={colors[(item.day - 1) % colors.length]}
                            onClick={() => setSelectedItemId(item.id)}
                        />
                    ))}

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
            </div>

            {/* Itinerary List */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 px-1">
                {displayItems.map((item, idx) => (
                    <div
                        key={item.id || idx}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${selectedItemId === item.id ? 'bg-coral/10 border-coral shadow-md' : 'bg-white border-sand hover:border-coral/50'}`}
                    >
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                            style={{ backgroundColor: colors[(item.day - 1) % colors.length] }}
                        >
                            {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-ink truncate">{item.activity}</h3>
                                <span className="text-xs font-bold text-coral bg-coral/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Day {item.day}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{item.time}</span>
                                <span className="truncate">{item.location}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


export default TripMap;
