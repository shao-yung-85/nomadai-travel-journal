import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trip, ItineraryItem, AppSettings } from '../types';
import { getAttractionGuide, optimizeRoute, getClothingAdvice } from '../services/gemini';
import { translations } from '../utils/translations';
import {
    ClockIcon, MapPinIcon, PencilIcon, TrashIcon, RobotIcon,
    ListIcon, SparklesIcon, ShareIcon, LightBulbIcon,
    WalkIcon, TrainIcon, BusIcon, CarIcon, PlaneIcon, WalletIcon,
    ChevronLeftIcon
} from './Icons';

interface TripItineraryProps {
    trip: Trip;
    settings: AppSettings;
    onUpdateTrip?: (trip: Trip) => void;
    onOpenQuickExpense: (item: ItineraryItem) => void;
}

const TripItinerary: React.FC<TripItineraryProps> = ({ trip, settings, onUpdateTrip, onOpenQuickExpense }) => {
    const t = translations[settings.language] || translations['zh-TW'];

    // AI Guide State
    const [selectedAttraction, setSelectedAttraction] = useState<{ name: string, location: string } | null>(null);
    const [aiGuideContent, setAiGuideContent] = useState<string>('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Activity Management State
    const [isAddingActivity, setIsAddingActivity] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [newActivityDay, setNewActivityDay] = useState(1);
    const [newActivityTime, setNewActivityTime] = useState('09:00');
    const [newActivityName, setNewActivityName] = useState('');
    const [newActivityLocation, setNewActivityLocation] = useState('');
    const [newActivityNotes, setNewActivityNotes] = useState('');
    const [optimizingDay, setOptimizingDay] = useState<number | null>(null);

    // Travel Info State
    const [newTravelMode, setNewTravelMode] = useState<'WALK' | 'TRAIN' | 'BUS' | 'CAR' | 'FLIGHT'>('TRAIN');
    const [newTravelDuration, setNewTravelDuration] = useState('');
    const [newTravelDetails, setNewTravelDetails] = useState('');

    // Clothing Advice State
    const [clothingAdvice, setClothingAdvice] = useState<string | null>(null);
    const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

    // Derived State
    const groupedItems = useMemo(() => {
        const items = trip.itinerary || [];
        const grouped: { [key: number]: ItineraryItem[] } = {};
        const sortedItems = [...items].sort((a, b) => a.time.localeCompare(b.time));

        sortedItems.forEach(item => {
            const day = item.day || 1;
            if (!grouped[day]) grouped[day] = [];
            grouped[day].push(item);
        });
        return grouped;
    }, [trip.itinerary]);

    const sortedDays = useMemo(() =>
        Object.keys(groupedItems).map(Number).sort((a, b) => a - b),
        [groupedItems]);

    // Effects
    useEffect(() => {
        if (!selectedAttraction) stopSpeech();
    }, [selectedAttraction]);

    useEffect(() => {
        return () => { window.speechSynthesis.cancel(); };
    }, []);

    // Handlers
    const handleShare = async () => {
        const lines = [`${trip.title} (${trip.startDate} - ${trip.endDate})`];
        sortedDays.forEach(day => {
            lines.push(`\nDay ${day}:`);
            groupedItems[day].forEach(item => {
                lines.push(`${item.time} ${item.activity}`);
                if (item.travelToNext) {
                    lines.push(`  ⬇️ ${item.travelToNext.mode} (${item.travelToNext.duration})`);
                }
            });
        });
        const text = lines.join('\n');
        try {
            if (navigator.share) {
                await navigator.share({ title: trip.title, text: text });
            } else {
                await navigator.clipboard.writeText(text);
                alert(t.share_success);
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleGetClothingAdvice = async () => {
        if (!trip.weather || trip.weather.length === 0) return;
        setIsLoadingAdvice(true);
        try {
            const advice = await getClothingAdvice(trip.weather, trip.title, settings.language);
            setClothingAdvice(advice);
        } catch (e) {
            setClothingAdvice("無法取得建議");
        } finally {
            setIsLoadingAdvice(false);
        }
    };

    const handleOpenAiGuide = async (activity: string, location: string) => {
        setSelectedAttraction({ name: activity, location });
        setAiGuideContent('');
        setIsLoadingAi(true);
        try {
            const guide = await getAttractionGuide(location, activity);
            setAiGuideContent(guide || "暫無資訊");
        } catch (e) {
            setAiGuideContent("讀取失敗");
        } finally {
            setIsLoadingAi(false);
        }
    };

    const handleSpeak = () => {
        if (isSpeaking) {
            stopSpeech();
            return;
        }
        if (!aiGuideContent) return;
        const utterance = new SpeechSynthesisUtterance(aiGuideContent);
        utterance.lang = settings.language === 'en-US' ? 'en-US' : 'zh-TW';
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    const stopSpeech = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    const handleOptimizeRoute = async (day: number) => {
        const dayItems = groupedItems[day];
        if (!dayItems || dayItems?.length < 3) {
            alert(t.optimize_route_min_items || "Need at least 3 items to optimize.");
            return;
        }
        setOptimizingDay(day);
        try {
            const sortedIds = await optimizeRoute(dayItems, settings.language);
            const newDayItems = sortedIds.map((id: string) => dayItems.find(item => item.id === id)).filter(Boolean) as ItineraryItem[];
            const sortedTimes = dayItems.map(i => i.time).sort();
            const reorderedItemsWithNewTimes = newDayItems.map((item, index) => ({
                ...item,
                time: sortedTimes[index]
            }));
            const otherItems = (trip.itinerary || []).filter(item => item.day !== day);
            const updatedItinerary = [...otherItems, ...reorderedItemsWithNewTimes];
            onUpdateTrip?.({ ...trip, itinerary: updatedItinerary });
        } catch (error) {
            console.error("Optimization failed", error);
            alert("Route optimization failed.");
        } finally {
            setOptimizingDay(null);
        }
    };

    const handleOpenEditModal = (item: ItineraryItem) => {
        setEditingItemId(item.id);
        setNewActivityDay(item.day);
        setNewActivityTime(item.time);
        setNewActivityName(item.activity);
        setNewActivityLocation(item.location);
        setNewActivityNotes(item.notes || '');
        if (item.travelToNext) {
            setNewTravelMode(item.travelToNext.mode);
            setNewTravelDuration(item.travelToNext.duration);
            setNewTravelDetails(item.travelToNext.details || '');
        } else {
            setNewTravelDuration('');
            setNewTravelDetails('');
        }
        setIsAddingActivity(true);
    };

    const handleSaveActivity = async () => {
        if (!newActivityName) return;

        let coords = null;
        if (newActivityLocation) {
            // Try to geocode with timeout
            try {
                const { geocodeAddress } = await import('../services/geocoding');
                const geocodePromise = geocodeAddress(newActivityLocation);
                const timeoutPromise = new Promise<{ lat: number; lng: number } | null>((_, reject) =>
                    setTimeout(() => reject(new Error('Geocoding timeout')), 5000)
                );

                coords = await Promise.race([geocodePromise, timeoutPromise]);
            } catch (e) {
                console.error("Auto-geocoding failed or timed out", e);
            }
        }

        const existingItem = editingItemId ? trip.itinerary?.find(i => i.id === editingItemId) : null;
        const newItem: ItineraryItem = {
            id: editingItemId || Date.now().toString(),
            day: Number(newActivityDay),
            time: newActivityTime,
            activity: newActivityName,
            location: newActivityLocation,
            notes: newActivityNotes,
            coordinates: coords || existingItem?.coordinates || null,
            lat: coords?.lat ?? existingItem?.lat ?? null,
            lng: coords?.lng ?? existingItem?.lng ?? null,
            attachments: existingItem?.attachments || [],
            ...(newTravelDuration ? {
                travelToNext: {
                    mode: newTravelMode,
                    duration: newTravelDuration,
                    details: newTravelDetails
                }
            } : {})
        };

        let updatedItinerary;
        if (editingItemId) {
            updatedItinerary = (trip.itinerary || []).map(item => item.id === editingItemId ? newItem : item);
        } else {
            updatedItinerary = [...(trip.itinerary || []), newItem];
        }
        onUpdateTrip?.({ ...trip, itinerary: updatedItinerary });

        setEditingItemId(null);
        setNewActivityName('');
        setNewActivityLocation('');
        setNewActivityNotes('');
        setNewTravelDuration('');
        setNewTravelDetails('');
        setIsAddingActivity(false);
    };

    const handleDeleteItem = (itemId: string) => {
        if (confirm(t.delete_trip_confirm.replace('{title}', t.itinerary))) {
            const updatedItinerary = (trip.itinerary || []).filter(item => item.id !== itemId);
            onUpdateTrip?.({ ...trip, itinerary: updatedItinerary });
        }
    };

    const openLink = (url?: string) => {
        if (url) window.open(url, '_blank');
    };

    const getTravelIcon = (mode: string) => {
        switch (mode) {
            case 'WALK': return <WalkIcon className="w-4 h-4" />;
            case 'TRAIN': return <TrainIcon className="w-4 h-4" />;
            case 'BUS': return <BusIcon className="w-4 h-4" />;
            case 'CAR': return <CarIcon className="w-4 h-4" />;
            case 'FLIGHT': return <PlaneIcon className="w-4 h-4" />;
            default: return <TrainIcon className="w-4 h-4" />;
        }
    };

    // Render Helpers
    const renderWeather = () => {
        if (!trip.weather || trip.weather?.length === 0) return null;
        return (
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{t.weather}</h4>
                    <button
                        onClick={handleGetClothingAdvice}
                        disabled={isLoadingAdvice}
                        className="text-xs font-bold text-coral flex items-center gap-1 hover:bg-coral/10 px-2 py-1 rounded-lg transition-colors"
                    >
                        <LightBulbIcon className="w-3 h-3" />
                        {isLoadingAdvice ? "分析中..." : "穿搭建議"}
                    </button>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {trip.weather?.map((w, idx) => (
                        <div key={idx} className="flex-shrink-0 flex flex-col items-center justify-center gap-1 bg-white border border-sand p-3 rounded-2xl min-w-[70px] shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400">{w.date}</span>
                            <span className="text-2xl drop-shadow-sm">{w.icon}</span>
                            <span className="text-xs font-bold text-ink">{w.tempHigh}°</span>
                        </div>
                    ))}
                </div>

                {clothingAdvice && (
                    <div className="mt-4 bg-white p-5 rounded-3xl shadow-card border border-sand animate-fade-in relative">
                        <button onClick={() => setClothingAdvice(null)} className="absolute top-3 right-3 text-gray-300 hover:text-gray-500">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                        <div className="flex items-start gap-3">
                            <div className="bg-orange-100 p-2 rounded-full text-orange-500 shrink-0">
                                <LightBulbIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h5 className="font-bold text-ink mb-2">AI 穿搭助手</h5>
                                <div className="prose prose-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                    {clothingAdvice}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const isMinimalist = settings?.minimalistMode;

    return (
        <div className="pb-40 relative min-h-full">
            {/* Header with Share Button */}
            <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-sand/50 py-3 mb-6 -mx-5 px-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 mr-2">
                    <span className="text-xs font-bold text-gray-400 shrink-0 mr-1">{t.nav_quick_jump}</span>
                    {sortedDays.map(day => (
                        <button
                            key={`nav-${day}`}
                            onClick={() => {
                                const el = document.getElementById(`day-header-${day}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="flex-shrink-0 px-4 py-1.5 bg-white border border-sand rounded-full font-bold text-ink text-xs hover:border-coral hover:text-coral hover:shadow-md active:bg-coral active:text-white transition-all whitespace-nowrap"
                        >
                            {t.day} {day}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleShare}
                    className="p-2 bg-white rounded-full border border-sand text-coral hover:bg-coral hover:text-white transition-colors shadow-sm shrink-0"
                >
                    <ShareIcon className="w-5 h-5" />
                </button>
            </div>

            {!isMinimalist && renderWeather()}

            {trip.itinerary?.length > 0 ? (
                <div>
                    {!isMinimalist && <h4 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider ml-1">{t.itinerary}</h4>}

                    {sortedDays.map(day => (
                        <div key={day} className="mb-8 scroll-mt-48" id={`day-header-${day}`}>
                            {/* Day Header */}
                            <div className="flex items-center gap-3 mb-4 sticky top-[60px] bg-paper py-2 z-10 border-b border-sand/50 shadow-sm">
                                <div className="bg-coral text-white px-3 py-1 rounded-lg text-sm font-bold shadow-sm">
                                    {t.day} {day}
                                </div>
                                <div className="h-px bg-sand flex-1"></div>
                                <button
                                    onClick={() => handleOptimizeRoute(day)}
                                    disabled={optimizingDay === day}
                                    className="flex items-center gap-1 text-xs font-bold text-coral bg-white border border-coral px-2 py-1 rounded-lg hover:bg-coral hover:text-white transition-colors disabled:opacity-50"
                                >
                                    {optimizingDay === day ? (
                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <SparklesIcon className="w-3 h-3" />
                                    )}
                                    {t.optimize_route || "AI Route"}
                                </button>
                            </div>

                            <div className={`space-y-0 relative ${isMinimalist ? '' : 'border-l-2 border-sand ml-4'}`}>
                                {groupedItems[day]?.map((item, idx) => (
                                    <div key={item.id || idx} className="relative group">
                                        {/* Activity Item */}
                                        <div className={`relative ${isMinimalist ? 'mb-4 border-b border-sand pb-4' : 'pl-8 pb-10 last:pb-0'}`}>
                                            {!isMinimalist && (
                                                <div className="absolute -left-[7px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-paper shadow-sm bg-gray-300 group-hover:bg-coral transition-colors"></div>
                                            )}

                                            <div className="transition-all opacity-90 group-hover:opacity-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold font-mono text-coral bg-coral/10 px-2 py-1 rounded-lg">{item.time}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onOpenQuickExpense(item);
                                                            }}
                                                            className="p-1.5 bg-white text-gray-400 rounded-full border border-sand hover:text-green-600 hover:border-green-600 shadow-sm"
                                                            title="快速記帳"
                                                        >
                                                            <WalletIcon className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenEditModal(item);
                                                            }}
                                                            className="p-1.5 bg-white text-gray-400 rounded-full border border-sand hover:text-coral hover:border-coral shadow-sm"
                                                            title="編輯"
                                                        >
                                                            <PencilIcon className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteItem(item.id);
                                                            }}
                                                            className="p-1.5 bg-white text-red-400 rounded-full border border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-500 shadow-sm transition-colors"
                                                            title="刪除"
                                                        >
                                                            <TrashIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-4 rounded-2xl shadow-card border border-transparent hover:border-sand transition-all relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenAiGuide(item.activity, item.location);
                                                        }}
                                                        className="absolute top-4 right-4 text-gray-300 hover:text-coral transition-colors"
                                                    >
                                                        <RobotIcon className="w-5 h-5" />
                                                    </button>

                                                    <h4 className={`font-bold text-ink ${isMinimalist ? 'text-base' : 'text-lg'} mb-1 pr-6`}>{item.activity}</h4>
                                                    <div
                                                        onClick={() => openLink(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`)}
                                                        className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer hover:text-coral truncate mt-1"
                                                    >
                                                        <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-coral" />
                                                        {item.location}
                                                    </div>
                                                    {item.notes && !isMinimalist && <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-50 leading-relaxed">{item.notes}</p>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Travel Segment */}
                                        {item.travelToNext && !isMinimalist && (
                                            <div className="pl-8 pb-10 relative">
                                                <div className="absolute left-[0px] top-0 bottom-0 w-0.5 border-l-2 border-dotted border-gray-300 -ml-[1px]"></div>
                                                <div className="flex items-center gap-3 bg-gray-50 border border-sand rounded-xl p-3 w-fit max-w-[80%]">
                                                    <div className="w-8 h-8 rounded-full bg-white border border-sand flex items-center justify-center text-gray-500 shadow-sm shrink-0">
                                                        {getTravelIcon(item.travelToNext.mode)}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                                            {item.travelToNext.duration}
                                                            {item.travelToNext.details && <span className="font-normal text-gray-400">• {item.travelToNext.details}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-sand/30 rounded-full flex items-center justify-center text-gray-400">
                        <ListIcon className="w-8 h-8" />
                    </div>
                    <p className="text-gray-400 font-medium">{t.no_itinerary}<br /><span className="text-xs">{t.click_add}</span></p>
                </div>
            )}

            {/* AI Guide Modal */}
            {selectedAttraction && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedAttraction(null)}>
                    <div className="bg-paper w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-ink">{selectedAttraction.name}</h3>
                            <button onClick={handleSpeak} className={`p-2 rounded-full ${isSpeaking ? 'bg-coral text-white' : 'bg-gray-100 text-gray-500'}`}>
                                <SpeakerWaveIcon className="w-5 h-5" />
                            </button>
                        </div>
                        {isLoadingAi ? (
                            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-coral border-t-transparent rounded-full animate-spin"></div></div>
                        ) : (
                            <div className="prose prose-sm text-gray-600 leading-relaxed whitespace-pre-line">{aiGuideContent}</div>
                        )}
                    </div>
                </div>
            )}

            {isAddingActivity && (
                <div className="fixed inset-0 z-[60] bg-paper sm:bg-black/50 sm:backdrop-blur-sm flex items-start sm:items-center justify-center sm:p-4 animate-fade-in">
                    <div className="w-full h-full sm:h-auto sm:max-w-sm sm:bg-paper sm:rounded-3xl sm:shadow-2xl p-6 pb-96 sm:pb-6 animate-slide-up overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center mb-6 relative">
                            <button
                                onClick={() => setIsAddingActivity(false)}
                                className="absolute left-0 p-2 -ml-2 rounded-full text-gray-400 hover:bg-gray-100 sm:hidden"
                            >
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                            <h3 className="text-xl font-bold text-ink w-full text-center">
                                {editingItemId ? t.edit_activity : t.add_activity}
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.day}</label>
                                    <div className="flex items-center bg-white rounded-xl border border-sand px-3">
                                        <span className="text-sm font-bold text-gray-400 mr-2">{t.day}</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newActivityDay}
                                            onChange={(e) => setNewActivityDay(parseInt(e.target.value) || 1)}
                                            className="w-full bg-transparent p-3 text-lg font-bold border-none outline-none text-ink"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.time}</label>
                                    <div className="flex items-center bg-white rounded-xl border border-sand px-3">
                                        <ClockIcon className="w-5 h-5 text-gray-400 mr-2" />
                                        <input
                                            type="time"
                                            value={newActivityTime}
                                            onChange={(e) => setNewActivityTime(e.target.value)}
                                            className="w-full bg-transparent p-3 text-lg font-bold border-none outline-none text-ink"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.activity_name}</label>
                                <input
                                    value={newActivityName}
                                    onChange={(e) => setNewActivityName(e.target.value)}
                                    placeholder="..."
                                    className="w-full bg-white p-4 rounded-xl text-base font-bold border-none shadow-sm outline-none placeholder:font-normal placeholder:text-gray-300"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.location}</label>
                                <input
                                    value={newActivityLocation}
                                    onChange={(e) => setNewActivityLocation(e.target.value)}
                                    placeholder="..."
                                    className="w-full bg-white p-4 rounded-xl text-base font-bold border-none shadow-sm outline-none placeholder:font-normal placeholder:text-gray-300"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.notes}</label>
                                <textarea
                                    value={newActivityNotes}
                                    onChange={(e) => setNewActivityNotes(e.target.value)}
                                    placeholder="..."
                                    className="w-full bg-white p-4 rounded-xl text-base font-medium border-none shadow-sm outline-none placeholder:font-normal placeholder:text-gray-300 min-h-[80px]"
                                />
                            </div>

                            <div className="pt-4 border-t border-sand">
                                <label className="text-xs font-bold text-gray-400 ml-1 mb-2 block">{t.travel_to_next}</label>
                                <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                                    {['WALK', 'TRAIN', 'BUS', 'CAR', 'FLIGHT'].map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setNewTravelMode(mode as any)}
                                            className={`p-2 rounded-lg border ${newTravelMode === mode ? 'bg-ink text-white border-ink' : 'bg-white text-gray-400 border-sand'}`}
                                        >
                                            {getTravelIcon(mode)}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        value={newTravelDuration}
                                        onChange={(e) => setNewTravelDuration(e.target.value)}
                                        placeholder="1h 30m"
                                        className="w-full bg-white p-3 rounded-xl text-sm font-bold border-none shadow-sm outline-none"
                                    />
                                    <input
                                        value={newTravelDetails}
                                        onChange={(e) => setNewTravelDetails(e.target.value)}
                                        placeholder="詳細說明..."
                                        className="w-full bg-white p-3 rounded-xl text-sm font-medium border-none shadow-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-paper pt-4 mt-4 border-t border-sand z-10 pb-20">
                                <button
                                    onClick={handleSaveActivity}
                                    disabled={!newActivityName}
                                    className="w-full bg-coral text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-coral/30 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    {editingItemId ? t.confirm : t.add_activity}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Button for Adding Activity */}
            <button
                onClick={() => {
                    setEditingItemId(null);
                    setNewActivityDay(1);
                    setNewActivityTime('09:00');
                    setNewActivityName('');
                    setNewActivityLocation('');
                    setNewActivityNotes('');
                    setNewTravelDuration('');
                    setNewTravelDetails('');
                    setIsAddingActivity(true);
                }}
                className="fixed bottom-24 right-6 w-14 h-14 bg-coral text-white rounded-full shadow-xl shadow-coral/40 flex items-center justify-center z-30 hover:bg-coralDark active:scale-90 transition-all"
            >
                <span className="text-3xl font-light mb-1">+</span>
            </button>
        </div>
    );
};

// Missing Icon Component
const SpeakerWaveIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
    </svg>
);

export default TripItinerary;
