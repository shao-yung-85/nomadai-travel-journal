import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Trip, AppSettings, ItineraryItem } from '../types';
import { translations } from '../utils/translations';
import { geocodeAddress } from '../services/geocoding';
import { MapPinIcon } from './Icons';

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
    searchedLocation?: { lat: number; lng: number } | null;
    onItemClick?: (query: string) => void;
    mapSearchQuery?: string;
}

// Component to update map view bounds
const MapUpdater = ({ bounds, isMapReady }: { bounds: L.LatLngBoundsExpression, isMapReady: boolean }) => {
    const map = useMap();
    useEffect(() => {
        if (isMapReady && bounds && (bounds as any).length > 0) {
            // Use a small timeout to ensure the map has fully updated its size
            setTimeout(() => {
                map.fitBounds(bounds, { padding: [80, 80] });
            }, 100);
        }
    }, [bounds, map, isMapReady]);
    return null;
};

// Component to invalidate map size on mount to fix rendering issues
const MapInvalidator = ({ onReady }: { onReady: () => void }) => {
    const map = useMap();
    useEffect(() => {
        // Small delay to ensure container is fully rendered and sized
        const timer = setTimeout(() => {
            map.invalidateSize();
            onReady();
        }, 250);
        return () => clearTimeout(timer);
    }, [map, onReady]);
    return null;
};

// Component to handle map flyTo actions
const MapController = ({ selectedLocation, searchedLocation, isMapReady }: { selectedLocation: { lat: number; lng: number } | null, searchedLocation?: { lat: number; lng: number } | null, isMapReady: boolean }) => {
    const map = useMap();
    useEffect(() => {
        if (isMapReady) {
            if (searchedLocation) {
                map.flyTo([searchedLocation.lat, searchedLocation.lng], 16, {
                    animate: true,
                    duration: 1.5
                });
            } else if (selectedLocation) {
                map.flyTo([selectedLocation.lat, selectedLocation.lng], 16, {
                    animate: true,
                    duration: 1.5
                });
            }
        }
    }, [selectedLocation, searchedLocation, map, isMapReady]);
    return null;
};

interface ItineraryMarkerProps {
    item: ItineraryItem;
    index: number;
    isSelected: boolean;
    color: string;
    onClick: () => void;
}

// Component to render individual markers with auto-popup functionality
const ItineraryMarker: React.FC<ItineraryMarkerProps> = ({ item, index, isSelected, color, onClick }) => {
    const markerRef = React.useRef<L.Marker>(null);

    useEffect(() => {
        if (isSelected && markerRef.current) {
            markerRef.current.openPopup();
        }
    }, [isSelected]);

    const lat = item.coordinates?.lat || item.lat;
    const lng = item.coordinates?.lng || item.lng;
    if (!lat || !lng) return null;

    return (
        <Marker
            ref={markerRef}
            position={[lat, lng]}
            icon={L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${isSelected ? '#C5A059' : color}; width: ${isSelected ? '32px' : '24px'}; height: ${isSelected ? '32px' : '24px'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${isSelected ? '14px' : '12px'}; transition: all 0.3s ease;">${index + 1}</div>`,
                iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
                iconAnchor: [isSelected ? 16 : 12, isSelected ? 16 : 12]
            })}
            eventHandlers={{
                click: onClick
            }}
        >
            <Popup>
                <div className="text-center">
                    <div className="font-bold text-ink">{index + 1}. {item.activity}</div>
                    <div className="text-xs text-gray-500">{item.time}</div>
                    <div className="text-xs text-coral mt-1">Day {item.day}</div>
                </div>
            </Popup>
        </Marker>
    );
};

const TripMap: React.FC<TripMapProps> = ({ trip, settings, onUpdateTrip, searchedLocation, onItemClick, mapSearchQuery }) => {
    const t = translations[settings.language] || translations['zh-TW'];
    const [geocodingId, setGeocodingId] = useState<string | null>(null);
    const [failedItems, setFailedItems] = useState<Set<string>>(new Set());
    const [activeDay, setActiveDay] = useState<number | 'ALL'>('ALL');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

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

    const days = useMemo(() => Object.keys(itemsByDay).map(Number).sort((a, b) => a - b), [itemsByDay]);
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#33FFF5', '#F5FF33'];

    // Calculate bounds
    const bounds = useMemo(() => {
        const points = displayItems
            .filter(i => i.coordinates || (i.lat && i.lng))
            .map(i => [i.coordinates?.lat || i.lat!, i.coordinates?.lng || i.lng!] as [number, number]);

        if (points.length === 0) return null;
        return points;
    }, [displayItems]);

    const selectedLocation = useMemo(() => {
        if (!selectedItemId) return null;
        const item = trip.itinerary?.find(i => i.id === selectedItemId);
        if (item && (item.coordinates || (item.lat && item.lng))) {
            return {
                lat: item.coordinates?.lat || item.lat!,
                lng: item.coordinates?.lng || item.lng!
            };
        }
        return null;
    }, [selectedItemId, trip.itinerary]);



    // Auto-select first item on load
    useEffect(() => {
        if (trip.itinerary && trip.itinerary.length > 0) {
            // Find first day
            const days = Array.from(new Set(trip.itinerary.map(i => Number(i.day)))).sort((a, b) => a - b);
            if (days.length > 0) {
                const firstDay = days[0];
                const firstDayItems = trip.itinerary
                    .filter(i => i.day === firstDay)
                    .sort((a, b) => a.time.localeCompare(b.time));

                if (firstDayItems.length > 0) {
                    const firstItem = firstDayItems[0];
                    setSelectedItemId(firstItem.id);
                    setActiveDay(firstDay); // Auto-switch to first day view

                    // Trigger search/focus
                    if (onItemClick) {
                        const query = firstItem.location || firstItem.activity;
                        if (query) {
                            // Small timeout to allow UI to settle
                            setTimeout(() => onItemClick(query), 500);
                        }
                    }
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trip.id]); // Re-run if trip changes

    // Auto-sync on mount if items exist but coords are missing
    useEffect(() => {
        // Clear stale errors on mount
        window.localStorage.removeItem('last_geocode_error');

        // We no longer auto-sync. User must click item or "Sync Map" button.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trip.id]);



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

                    <MapInvalidator onReady={() => setIsMapReady(true)} />
                    {bounds && !selectedLocation && !searchedLocation && <MapUpdater bounds={bounds} isMapReady={isMapReady} />}
                    <MapController selectedLocation={selectedLocation} searchedLocation={searchedLocation} isMapReady={isMapReady} />

                    {/* Searched Location Marker */}
                    {searchedLocation && (() => {
                        // Find if this location matches an itinerary item
                        const matchedItemIndex = displayItems.findIndex(item =>
                            (item.coordinates?.lat === searchedLocation.lat && item.coordinates?.lng === searchedLocation.lng) ||
                            (item.location === mapSearchQuery) ||
                            (item.activity === mapSearchQuery)
                        );

                        const matchedItem = matchedItemIndex !== -1 ? displayItems[matchedItemIndex] : null;

                        // If matched item already has coordinates, don't show the red marker (avoid duplicate)
                        if (matchedItem && matchedItem.coordinates) {
                            return null;
                        }

                        const content = matchedItemIndex !== -1 ? (matchedItemIndex + 1) : '?';
                        const markerColor = matchedItem ? colors[(matchedItem.day - 1) % colors.length] : '#FF0000';

                        return (
                            <Marker
                                position={[searchedLocation.lat, searchedLocation.lng]}
                                icon={L.divIcon({
                                    className: 'custom-div-icon',
                                    html: `<div style="background-color: ${markerColor}; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">${content}</div>`,
                                    iconSize: [32, 32],
                                    iconAnchor: [16, 16]
                                })}
                            >
                                <Popup>
                                    <div className="text-center font-bold">Searched Location</div>
                                </Popup>
                            </Marker>
                        );
                    })()}

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
                {displayItems.map((item, idx) => {
                    const hasCoords = (item.coordinates?.lat || item.lat) && (item.coordinates?.lng || item.lng);
                    const isItemGeocoding = geocodingId === item.id || (geocodingId === 'BATCH' && !hasCoords);
                    const isFailed = failedItems.has(item.id);

                    return (
                        <div
                            key={item.id || idx}
                            onClick={async () => {
                                setSelectedItemId(item.id);
                                setActiveDay(item.day); // Switch to this item's day view

                                // Trigger parent callback for search
                                if (onItemClick) {
                                    const query = item.location || item.activity;
                                    if (query) onItemClick(query);
                                }

                                if (!hasCoords && !geocodingId) {
                                    // Trigger single item geocode
                                    setGeocodingId(item.id);
                                    // Reset failed state when retrying
                                    if (failedItems.has(item.id)) {
                                        const newFailed = new Set(failedItems);
                                        newFailed.delete(item.id);
                                        setFailedItems(newFailed);
                                    }

                                    console.log(`[TripMap] Starting geocode for item: ${item.activity}`);
                                    try {
                                        // Strategy: Try location first, then activity name, then simplified activity name
                                        let query = item.location;
                                        let coords = null;

                                        if (query) {
                                            console.log(`[TripMap] Trying location: ${query}`);
                                            coords = await geocodeAddress(query, settings.apiKey);
                                        }

                                        if (!coords) {
                                            console.log(`[TripMap] Location failed or empty, trying activity: ${item.activity}`);
                                            coords = await geocodeAddress(item.activity, settings.apiKey);
                                        }

                                        if (!coords) {
                                            // Try simplified activity name (remove parentheses, "or", etc.)
                                            const simplified = item.activity.split(/[\(（]/)[0].split(/或|\/|\|/)[0].trim();
                                            if (simplified && simplified !== item.activity) {
                                                console.log(`[TripMap] Activity failed, trying simplified: ${simplified}`);
                                                coords = await geocodeAddress(simplified, settings.apiKey);
                                            }
                                        }

                                        console.log(`[TripMap] Final geocode result:`, coords);

                                        if (coords && onUpdateTrip) {
                                            const newItinerary = [...(trip.itinerary || [])];
                                            const index = newItinerary.findIndex(i => i.id === item.id);
                                            if (index !== -1) {
                                                console.log(`[TripMap] Updating item ${index} with coords`, coords);
                                                newItinerary[index] = {
                                                    ...newItinerary[index],
                                                    coordinates: coords,
                                                    lat: coords.lat,
                                                    lng: coords.lng
                                                };
                                                onUpdateTrip({ ...trip, itinerary: newItinerary });
                                                console.log(`[TripMap] onUpdateTrip called`);
                                            }
                                        } else {
                                            console.warn(`[TripMap] No coords found for item ${item.id}`);
                                            setFailedItems(prev => new Set(prev).add(item.id));
                                        }
                                    } catch (e) {
                                        console.error("On-demand geocoding failed", e);
                                        setFailedItems(prev => new Set(prev).add(item.id));
                                    } finally {
                                        setGeocodingId(null);
                                    }
                                }
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${selectedItemId === item.id ? 'bg-coral/10 border-coral shadow-md' : 'bg-white border-sand hover:border-coral/50'}`}
                        >
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shrink-0 relative"
                                style={{ backgroundColor: colors[(item.day - 1) % colors.length] }}
                            >
                                {isItemGeocoding && !hasCoords ? (
                                    <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    idx + 1
                                )}
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
                                    <span className="truncate flex-1">
                                        {item.location}
                                        {!hasCoords && !isItemGeocoding && !isFailed && <span className="text-coral ml-1 text-[10px]">(點擊搜尋位置)</span>}
                                        {isItemGeocoding && !hasCoords && <span className="text-coral ml-1 text-[10px] animate-pulse">搜尋中...</span>}
                                        {isFailed && !hasCoords && !isItemGeocoding && <span className="text-red-500 ml-1 text-[10px]">位置未找到</span>}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


export default TripMap;
