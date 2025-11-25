
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trip, Flight, ExpenseItem, AppSettings, ItineraryItem } from '../types';
import { getAttractionGuide, optimizeRoute } from '../services/gemini';
import { ChevronLeftIcon, MapIcon, WalletIcon, TicketIcon, PlaneIcon, TrashIcon, RobotIcon, ListIcon, PlusIcon, SpeakerWaveIcon, StopIcon, CalendarIcon, MapPinIcon, ClockIcon, PencilIcon, ShoppingBagIcon, SparklesIcon, ShareIcon, TrainIcon, BusIcon, CarIcon, WalkIcon } from './Icons';
import ShoppingList from './ShoppingList';
import { translations } from '../utils/translations';

interface TripDetailProps {
    trip: Trip;
    onBack: () => void;
    onDelete?: (id: string) => void;
    onUpdateTrip?: (trip: Trip) => void;
    settings: AppSettings;
}

type Tab = 'ITINERARY' | 'MAP' | 'BUDGET' | 'BOOKINGS' | 'SHOPPING';

const TripDetail: React.FC<TripDetailProps> = ({ trip, onBack, onDelete, onUpdateTrip, settings }) => {
    const t = translations[settings.language] || translations['zh-TW'];
    const [activeTab, setActiveTab] = useState<Tab>('ITINERARY');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // AI Guide Modal State
    const [selectedAttraction, setSelectedAttraction] = useState<{ name: string, location: string } | null>(null);
    const [aiGuideContent, setAiGuideContent] = useState<string>('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Map State
    const [mapQuery, setMapQuery] = useState(trip.title);

    // Manual Activity State
    const [isAddingActivity, setIsAddingActivity] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null); // New: Track which item is being edited
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

    // Budget State
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [newExpenseName, setNewExpenseName] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');
    const [newExpensePayer, setNewExpensePayer] = useState('');
    const [newExpenseMethod, setNewExpenseMethod] = useState('Cash');

    // Booking State
    const [isAddingBooking, setIsAddingBooking] = useState(false);
    const [newBookingType, setNewBookingType] = useState<'FLIGHT' | 'HOTEL' | 'TRAIN'>('FLIGHT');
    const [newBookingProvider, setNewBookingProvider] = useState('');
    const [newBookingRef, setNewBookingRef] = useState('');
    const [newBookingOrigin, setNewBookingOrigin] = useState('');
    const [newBookingDest, setNewBookingDest] = useState('');
    const [newBookingDate, setNewBookingDate] = useState('');
    const [newBookingTime, setNewBookingTime] = useState('');

    // Share Function
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
                await navigator.share({
                    title: trip.title,
                    text: text,
                });
            } else {
                await navigator.clipboard.writeText(text);
                alert(t.share_success);
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    // Handle Stop Speaking when modal closes or component unmounts
    useEffect(() => {
        if (!selectedAttraction) {
            stopSpeech();
        }
    }, [selectedAttraction]);

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // Memoize grouped itinerary items from props
    const groupedItems = useMemo(() => {
        const items = trip.itinerary || [];
        const grouped: { [key: number]: ItineraryItem[] } = {};

        // Sort items by time
        const sortedItems = [...items].sort((a, b) => {
            return a.time.localeCompare(b.time);
        });

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

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        onDelete?.(trip.id);
    };

    const openLink = (url?: string) => {
        if (url) window.open(url, '_blank');
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
        // Try to match voice to language settings, default to ZH for now as content is mostly ZH
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

            // Reorder items based on sortedIds
            // We need to keep the original times? Or just reorder the sequence?
            // The prompt said "Do not change the time", but usually optimization implies changing time order.
            // Let's assume we just reorder the sequence in the array, and maybe we should update times?
            // For now, let's just reorder the items in the list but keep their original times? 
            // No, that would be confusing if times are fixed.
            // Let's swap the activities but keep the time slots? 
            // Or just reorder them and let the user adjust times.
            // Let's just reorder the array.

            const newDayItems = sortedIds.map((id: string) => dayItems.find(item => item.id === id)).filter(Boolean) as ItineraryItem[];

            // We need to update the times to match the new order? 
            // Let's just assign the times from the original sorted list to the new sorted list to keep the schedule structure.
            const sortedTimes = dayItems.map(i => i.time).sort();
            const reorderedItemsWithNewTimes = newDayItems.map((item, index) => ({
                ...item,
                time: sortedTimes[index]
            }));

            // Construct new full itinerary
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

    // --- CRUD Operations (Directly modify Trip object) ---

    const handleOpenEditModal = (item: ItineraryItem) => {
        setEditingItemId(item.id);
        setNewActivityDay(item.day);
        setNewActivityTime(item.time);
        setNewActivityName(item.activity);
        setNewActivityLocation(item.location);
        setNewActivityNotes(item.notes || '');

        // Load travel info if exists
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

    const handleSaveActivity = () => {
        if (!newActivityName) return;

        const newItem: ItineraryItem = {
            id: editingItemId || Date.now().toString(),
            day: Number(newActivityDay),
            time: newActivityTime,
            activity: newActivityName,
            location: newActivityLocation,
            notes: newActivityNotes,
            travelToNext: newTravelDuration ? {
                mode: newTravelMode,
                duration: newTravelDuration,
                details: newTravelDetails
            } : undefined
        };

        let updatedItinerary;
        if (editingItemId) {
            // Edit existing item
            updatedItinerary = (trip.itinerary || []).map(item =>
                item.id === editingItemId ? newItem : item
            );
        } else {
            // Add new item
            updatedItinerary = [...(trip.itinerary || []), newItem];
        }

        onUpdateTrip?.({ ...trip, itinerary: updatedItinerary });

        // Reset form
        setEditingItemId(null);
        setNewActivityName('');
        setNewActivityLocation('');
        setNewActivityNotes('');
        setNewTravelDuration('');
        setNewTravelDetails('');
        setIsAddingActivity(false);
    };

    // Helper to render travel icon
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

    const handleDeleteItem = (itemId: string) => {
        if (confirm(t.delete_trip_confirm.replace('{title}', t.itinerary))) {
            const updatedItinerary = (trip.itinerary || []).filter(item => item.id !== itemId);
            onUpdateTrip?.({ ...trip, itinerary: updatedItinerary });
        }
    };

    const handleAddExpense = () => {
        if (!newExpenseName || !newExpenseAmount) return;
        const newItem: ExpenseItem = {
            id: Date.now().toString(),
            title: newExpenseName,
            amount: parseFloat(newExpenseAmount),
            category: 'General',
            date: new Date().toLocaleDateString(),
            payer: newExpensePayer || 'ME',
            paymentMethod: newExpenseMethod
        };

        const currentExpenses = trip.budget?.expenses || [];
        const updatedTrip = {
            ...trip,
            budget: {
                ...trip.budget,
                total: trip.budget?.total || 0,
                currency: trip.budget?.currency || 'TWD',
                expenses: [newItem, ...currentExpenses]
            }
        };

        onUpdateTrip?.(updatedTrip);

        setNewExpenseName('');
        setNewExpenseAmount('');
        setNewExpensePayer('');
        setIsAddingExpense(false);
    };

    const handleAddBooking = () => {
        if (!newBookingProvider) return;

        const newBooking: Flight = {
            id: Date.now().toString(),
            type: newBookingType,
            airline: newBookingProvider,
            number: newBookingRef || 'N/A',
            origin: newBookingOrigin || '-',
            destination: newBookingDest || '-',
            departureTime: newBookingDate ? `${newBookingDate} ${newBookingTime}` : newBookingTime || '00:00',
            arrivalTime: '-',
            status: 'Confirmed',
            bookingUrl: '' // Explicitly set optional fields
        };

        const updatedBookings = [newBooking, ...(trip.bookings || [])];

        onUpdateTrip?.({ ...trip, bookings: updatedBookings });

        setNewBookingProvider('');
        setNewBookingRef('');
        setNewBookingOrigin('');
        setNewBookingDest('');
        setNewBookingDate('');
        setNewBookingTime('');
        setIsAddingBooking(false);
    };

    const renderWeather = () => {
        if (!trip.weather || trip.weather?.length === 0) return null;
        return (
            <div className="mb-6">
                <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider ml-1">{t.weather}</h4>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {trip.weather.map((w, idx) => (
                        <div key={idx} className="flex-shrink-0 flex flex-col items-center justify-center gap-1 bg-white border border-sand p-3 rounded-2xl min-w-[70px] shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400">{w.date}</span>
                            <span className="text-2xl drop-shadow-sm">{w.icon}</span>
                            <span className="text-xs font-bold text-ink">{w.tempHigh}°</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const renderItinerary = () => {
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
                                    {groupedItems[day].map((item, idx) => (
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
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenEditModal(item);
                                                                }}
                                                                className="p-1.5 bg-white text-gray-400 rounded-full border border-sand hover:text-coral hover:border-coral"
                                                            >
                                                                <PencilIcon className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteItem(item.id);
                                                                }}
                                                                className="p-1.5 bg-white text-gray-400 rounded-full border border-sand hover:text-red-500 hover:border-red-500"
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

                                            {/* Travel Segment (Rendered AFTER the item if it exists) */}
                                            {item.travelToNext && !isMinimalist && (
                                                <div className="pl-8 pb-10 relative">
                                                    {/* Dotted Line */}
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

                {/* Add/Edit Activity Modal */}
                {isAddingActivity && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setIsAddingActivity(false)}>
                        <div className="bg-paper w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-ink mb-6 text-center">{editingItemId ? t.edit_activity : t.add_activity}</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 ml-1">{t.day}</label>
                                        <div className="flex items-center bg-white rounded-xl border border-sand px-3">
                                            <span className="text-sm font-bold text-gray-400 mr-2">{t.day}</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={newActivityDay}
                                                onChange={(e) => setNewActivityDay(parseInt(e.target.value) || 1)}
                                                className="w-full bg-transparent p-3 text-lg font-bold border-none outline-none"
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
                                                className="w-full bg-transparent p-3 text-lg font-bold border-none outline-none"
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
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.location}</label>
                                    <input
                                        value={newActivityLocation}
                                        onChange={(e) => setNewActivityLocation(e.target.value)}
                                        placeholder="..."
                                        className="w-full bg-white p-4 rounded-xl text-base font-medium border-none shadow-sm outline-none placeholder:font-normal placeholder:text-gray-300"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.notes}</label>
                                    <textarea
                                        value={newActivityNotes}
                                        onChange={(e) => setNewActivityNotes(e.target.value)}
                                        placeholder="..."
                                        rows={2}
                                        className="w-full bg-white p-4 rounded-xl text-sm font-medium border-none shadow-sm outline-none resize-none placeholder:text-gray-300"
                                    />
                                </div>

                                {/* Travel Info Section */}
                                <div className="pt-4 border-t border-sand mt-4">
                                    <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider ml-1">{t.travel_time || "Travel to Next"}</h4>

                                    <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
                                        {['WALK', 'TRAIN', 'BUS', 'CAR', 'FLIGHT'].map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setNewTravelMode(mode as any)}
                                                className={`flex-shrink-0 p-2 rounded-xl border transition-all ${newTravelMode === mode ? 'bg-coral text-white border-coral shadow-md' : 'bg-white border-sand text-gray-400 hover:border-coral'}`}
                                            >
                                                {getTravelIcon(mode)}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-400 ml-1">{t.duration || "Duration"}</label>
                                            <input
                                                value={newTravelDuration}
                                                onChange={(e) => setNewTravelDuration(e.target.value)}
                                                placeholder="e.g. 15 min"
                                                className="w-full bg-white p-3 rounded-xl text-sm font-bold border-none shadow-sm outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-400 ml-1">{t.details || "Details"}</label>
                                            <input
                                                value={newTravelDetails}
                                                onChange={(e) => setNewTravelDetails(e.target.value)}
                                                placeholder="e.g. JR Line"
                                                className="w-full bg-white p-3 rounded-xl text-sm font-medium border-none shadow-sm outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveActivity}
                                    disabled={!newActivityName}
                                    className="w-full bg-coral text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-coral/30 mt-4 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    {editingItemId ? t.save : t.confirm}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Add Activity Button */}
                <div className="fixed bottom-28 left-0 right-0 px-6 flex justify-center pointer-events-none">
                    <button
                        onClick={() => {
                            setEditingItemId(null);
                            setNewActivityName('');
                            setNewActivityLocation('');
                            setNewActivityNotes('');
                            setIsAddingActivity(true);
                        }}
                        className="w-full max-w-xs bg-coral text-white py-4 rounded-2xl font-bold text-lg shadow-float flex items-center justify-center gap-2 pointer-events-auto active:scale-95 transition-all hover:bg-coralDark ring-4 ring-white"
                    >
                        <PlusIcon className="w-5 h-5 stroke-[3]" />
                        {t.add_activity}
                    </button>
                </div>

            </div>
        );
    };

    const renderMap = () => (
        <div className="h-full flex flex-col bg-paper">
            <div className="flex-1 w-full bg-gray-100 relative z-0 min-h-[300px]">
                <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery || 'Japan')}&t=m&z=14&output=embed&iwloc=near`}
                ></iframe>
            </div>
            <div className="h-1/3 overflow-y-auto p-5 bg-paper rounded-t-3xl -mt-6 relative z-10 shadow-float">
                <h4 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">{t.map}</h4>
                <div className="space-y-3 pb-10">
                    <button
                        onClick={() => setMapQuery(trip.title)}
                        className={`w-full text-left p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border transition-all ${mapQuery === trip.title ? 'bg-coral text-white border-coral shadow-md' : 'bg-white border-sand hover:border-coral text-ink'}`}
                    >
                        <MapIcon className="w-4 h-4" />
                        Overview
                    </button>
                    {trip.itinerary.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => setMapQuery(item.location)}
                            className={`w-full text-left p-4 rounded-2xl text-sm font-medium flex items-center gap-3 border transition-all ${mapQuery === item.location ? 'bg-white border-coral text-coral ring-2 ring-coral/10' : 'bg-white border-sand hover:border-coral text-gray-600'}`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${mapQuery === item.location ? 'bg-coral text-white' : 'bg-sand text-gray-500'}`}>{idx + 1}</div>
                            <div className="truncate">
                                <span className="text-xs text-gray-400 mr-1">{t.day} {item.day || 1}</span>
                                {item.activity}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderBudget = () => {
        const expenses = trip.budget?.expenses || [];
        const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

        return (
            <div className="space-y-6 pb-40">
                {/* Header Card */}
                <div className="bg-white p-6 rounded-3xl shadow-soft text-center mt-2 border border-sand relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-coral"></div>
                    <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">{t.budget}</h3>
                    <div className="text-5xl font-black text-ink mb-2 tracking-tight">
                        <span className="text-2xl align-top mr-1 text-gray-400">$</span>
                        {totalSpent.toLocaleString()}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-end px-2">
                        <h4 className="text-xl font-bold text-ink">{t.budget}</h4>
                        <span className="text-xs font-bold text-gray-400 bg-white px-2 py-1 rounded-lg border border-sand">{expenses?.length || 0} {t.trips_count}</span>
                    </div>

                    {expenses?.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {expenses.map((ex, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-sand shadow-card flex items-center justify-between group hover:border-coral/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-paper flex flex-col items-center justify-center text-coral border border-sand">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">{ex.payer || 'ME'}</span>
                                            <WalletIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-ink text-base">{ex.title}</div>
                                            <div className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                                                {ex.date} • {ex.paymentMethod}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-ink text-lg">${ex.amount.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-dashed border-sand p-8 text-center">
                            <p className="text-gray-400 font-medium">{t.click_add}</p>
                        </div>
                    )}
                </div>

                {/* Add Expense Overlay Form */}
                {isAddingExpense && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setIsAddingExpense(false)}>
                        <div className="bg-paper w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-ink mb-6 text-center">{t.add_expense}</h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.expense_item}</label>
                                    <input
                                        value={newExpenseName}
                                        onChange={(e) => setNewExpenseName(e.target.value)}
                                        placeholder="例如: 章魚燒"
                                        className="w-full bg-white p-4 rounded-xl text-base font-bold border-none shadow-sm outline-none placeholder:font-normal"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.amount}</label>
                                    <div className="flex items-center bg-white rounded-xl border-none shadow-sm px-4">
                                        <span className="text-gray-400 font-bold mr-2">¥</span>
                                        <input
                                            value={newExpenseAmount}
                                            onChange={(e) => setNewExpenseAmount(e.target.value)}
                                            type="number"
                                            placeholder="0"
                                            className="w-full bg-transparent py-4 text-xl font-bold border-none outline-none placeholder:font-normal"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex bg-white rounded-xl p-1 shadow-sm">
                                        <button
                                            onClick={() => setNewExpensePayer('ME')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newExpensePayer === 'ME' || newExpensePayer === '' ? 'bg-ink text-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                                        >
                                            {t.payer_me}
                                        </button>
                                        <button
                                            onClick={() => setNewExpensePayer('OTHER')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newExpensePayer === 'OTHER' ? 'bg-ink text-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                                        >
                                            {t.payer_other}
                                        </button>
                                    </div>
                                    <div className="flex bg-white rounded-xl p-1 shadow-sm">
                                        <button
                                            onClick={() => setNewExpenseMethod('Cash')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newExpenseMethod === 'Cash' ? 'bg-ink text-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                                        >
                                            {t.payment_cash}
                                        </button>
                                        <button
                                            onClick={() => setNewExpenseMethod('Card')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newExpenseMethod === 'Card' ? 'bg-ink text-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                                        >
                                            {t.payment_card}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <select
                                        className="w-full bg-white p-3 rounded-xl font-bold text-ink border-none shadow-sm outline-none h-[48px] text-center"
                                    >
                                        <option value="Individual">{t.split_individual}</option>
                                        <option value="Shared">{t.split_shared}</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handleAddExpense}
                                    disabled={!newExpenseName || !newExpenseAmount}
                                    className="w-full bg-coral text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-coral/30 mt-4 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    + 記下一筆
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Action Button for Budget */}
                <div className="fixed bottom-28 left-0 right-0 px-6 flex justify-center pointer-events-none">
                    <button
                        onClick={() => setIsAddingExpense(true)}
                        className="w-full max-w-xs bg-coral text-white py-4 rounded-2xl font-bold text-lg shadow-float flex items-center justify-center gap-2 pointer-events-auto active:scale-95 transition-all hover:bg-coralDark ring-4 ring-white"
                    >
                        <PlusIcon className="w-5 h-5 stroke-[3]" />
                        {t.add_expense}
                    </button>
                </div>
            </div>
        );
    };

    const renderBookings = () => (
        <div className="space-y-4 pb-40">
            {trip.bookings?.map(booking => (
                <div key={booking.id} className="bg-white rounded-3xl shadow-card border border-sand overflow-hidden relative group hover:shadow-soft transition-all">
                    <div className="absolute top-0 left-0 w-2 h-full bg-coral"></div>
                    <div className="p-5 pl-7">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                {booking.type === 'FLIGHT' ? <PlaneIcon className="w-5 h-5 text-coral" /> : <TicketIcon className="w-5 h-5 text-coral" />}
                                <span className="font-bold text-ink text-lg">
                                    {booking.type}
                                </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {booking.status}
                            </span>
                        </div>

                        <div className="flex justify-between items-center mb-5">
                            <div className="text-center">
                                <div className="text-2xl font-black text-ink truncate max-w-[100px]">{booking.origin}</div>
                            </div>
                            <div className="flex-1 border-b-2 border-dotted border-gray-300 mx-4 relative h-px">
                                {booking.type === 'FLIGHT' && <PlaneIcon className="w-4 h-4 text-gray-300 absolute left-1/2 -top-2 -ml-2" />}
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-ink truncate max-w-[100px]">{booking.destination}</div>
                            </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-sand pt-4">
                            <div>
                                <div className="text-xs text-gray-400 font-bold uppercase">{t.time}</div>
                                <div className="text-sm font-bold text-ink">{booking.departureTime}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{booking.airline} {booking.number}</div>
                            </div>
                            {booking.bookingUrl && (
                                <button
                                    onClick={() => openLink(booking.bookingUrl)}
                                    className="bg-paper text-coral px-4 py-2 rounded-xl text-xs font-bold hover:bg-coral hover:text-white transition-colors border border-sand"
                                >
                                    Link
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            {(!trip.bookings || trip.bookings?.length === 0) && <div className="text-center text-gray-400 py-20 font-medium">{t.no_itinerary}</div>}

            {/* Add Booking Modal */}
            {isAddingBooking && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setIsAddingBooking(false)}>
                    <div className="bg-paper w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-ink mb-6 text-center">{t.add_booking}</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.booking_type}</label>
                                <div className="flex gap-2">
                                    {['FLIGHT', 'HOTEL', 'TRAIN'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setNewBookingType(type as any)}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${newBookingType === type ? 'bg-coral text-white' : 'bg-white border border-sand text-gray-400'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.provider}</label>
                                <input
                                    value={newBookingProvider}
                                    onChange={(e) => setNewBookingProvider(e.target.value)}
                                    placeholder="..."
                                    className="w-full bg-white p-3 rounded-xl font-bold border-none shadow-sm outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">Origin</label>
                                    <input
                                        value={newBookingOrigin}
                                        onChange={(e) => setNewBookingOrigin(e.target.value)}
                                        placeholder={t.placeholder_origin}
                                        className="w-full bg-white p-3 rounded-xl font-medium border-none shadow-sm outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">Dest</label>
                                    <input
                                        value={newBookingDest}
                                        onChange={(e) => setNewBookingDest(e.target.value)}
                                        placeholder={t.placeholder_dest}
                                        className="w-full bg-white p-3 rounded-xl font-medium border-none shadow-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.start_date}</label>
                                    <input
                                        type="date"
                                        value={newBookingDate}
                                        onChange={(e) => setNewBookingDate(e.target.value)}
                                        className="w-full bg-white p-3 rounded-xl font-medium border-none shadow-sm outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.time}</label>
                                    <input
                                        type="time"
                                        value={newBookingTime}
                                        onChange={(e) => setNewBookingTime(e.target.value)}
                                        className="w-full bg-white p-3 rounded-xl font-medium border-none shadow-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.booking_ref}</label>
                                <input
                                    value={newBookingRef}
                                    onChange={(e) => setNewBookingRef(e.target.value)}
                                    placeholder="..."
                                    className="w-full bg-white p-3 rounded-xl font-medium border-none shadow-sm outline-none"
                                />
                            </div>

                            <button
                                onClick={handleAddBooking}
                                disabled={!newBookingProvider}
                                className="w-full bg-coral text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-coral/30 mt-4 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {t.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Add Button */}
            <div className="fixed bottom-28 left-0 right-0 px-6 flex justify-center pointer-events-none">
                <button
                    onClick={() => setIsAddingBooking(true)}
                    className="w-full max-w-xs bg-coral text-white py-4 rounded-2xl font-bold text-lg shadow-float flex items-center justify-center gap-2 pointer-events-auto active:scale-95 transition-all hover:bg-coralDark ring-4 ring-white"
                >
                    <PlusIcon className="w-5 h-5 stroke-[3]" />
                    {t.add_booking}
                </button>
            </div>
        </div>
    );

    const getActiveTabTitle = () => {
        switch (activeTab) {
            case 'ITINERARY': return trip.title;
            case 'MAP': return t.map;
            case 'BUDGET': return t.budget;
            case 'BOOKINGS': return t.bookings;
            case 'SHOPPING': return t.shopping_list || 'Shopping List';
        }
    }

    return (
        <div className="flex flex-col h-full bg-paper relative">
            {/* Paper-like Header */}
            <div className="px-5 py-4 flex items-center justify-between sticky top-0 z-30 bg-paper/95 backdrop-blur-sm shadow-sm border-b border-sand/50">
                <button onClick={onBack} className="p-2.5 -ml-2 rounded-full bg-white shadow-card text-ink hover:text-coral active:scale-95 transition-all">
                    <ChevronLeftIcon className="w-5 h-5 stroke-2" />
                </button>
                <h2 className="font-extrabold text-ink text-lg truncate max-w-[200px]">{getActiveTabTitle()}</h2>
                <button onClick={handleDeleteClick} className="p-2.5 -mr-2 bg-white shadow-card text-gray-400 rounded-full hover:text-red-500 active:scale-95 transition-all">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Floating Tab Bar */}
            <div className="px-4 py-2 z-20 sticky top-[72px] bg-paper/95 backdrop-blur-xl transition-all">
                <div className="bg-white rounded-2xl shadow-card p-1.5 flex justify-between items-center border border-sand">
                    {[
                        { id: 'ITINERARY', icon: ListIcon, label: t.itinerary },
                        { id: 'MAP', icon: MapIcon, label: t.map },
                        { id: 'BUDGET', icon: WalletIcon, label: t.budget },
                        { id: 'BOOKINGS', icon: TicketIcon, label: t.bookings },
                        { id: 'SHOPPING', icon: ShoppingBagIcon, label: t.shopping_list || 'Shopping' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === tab.id ? 'bg-coral text-white shadow-md' : 'text-gray-400 hover:bg-paper'}`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'stroke-2' : 'stroke-[1.5]'}`} />
                            {activeTab === tab.id && <span className="text-xs font-bold">{tab.label}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 ${activeTab === 'MAP' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                <div className={`h-full ${activeTab === 'MAP' ? 'p-0' : 'p-5'}`}>
                    {activeTab === 'ITINERARY' && renderItinerary()}
                    {activeTab === 'MAP' && renderMap()}
                    {activeTab === 'BUDGET' && renderBudget()}
                    {activeTab === 'BOOKINGS' && renderBookings()}
                    {activeTab === 'SHOPPING' && <ShoppingList trip={trip} onUpdateTrip={onUpdateTrip!} t={t} />}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsDeleteModalOpen(false)}>
                    <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-xs w-full text-center animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <TrashIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-ink mb-2">{t.delete_trip_title}</h3>
                        <p className="text-sm text-gray-500 mb-6 font-medium">{t.delete_trip_confirm.replace('{title}', trip.title)}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600 active:scale-95 transition-all">{t.cancel}</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-all">{t.confirm_delete}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Guide Modal */}
            {selectedAttraction && (
                <div className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setSelectedAttraction(null)}>
                    <div className="bg-paper w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up max-h-[80vh] m-2 mb-0 sm:m-0" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-sand flex justify-between items-center bg-white">
                            <div>
                                <div className="flex items-center gap-2 text-coral mb-1">
                                    <RobotIcon className="w-5 h-5" />
                                    <span className="text-xs font-bold uppercase tracking-wider">{t.ai_guide}</span>
                                </div>
                                <h3 className="font-bold text-ink text-xl leading-tight">{selectedAttraction.name}</h3>
                            </div>
                            <div className="flex gap-2">
                                {/* TTS Button */}
                                <button
                                    onClick={handleSpeak}
                                    disabled={isLoadingAi || !aiGuideContent}
                                    className={`p-2 rounded-full transition-colors flex items-center justify-center ${isSpeaking ? 'bg-coral text-white animate-pulse' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                                >
                                    {isSpeaking ? <StopIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
                                </button>
                                <button onClick={() => setSelectedAttraction(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {isLoadingAi ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                    <div className="w-3 h-3 bg-coral rounded-full animate-ping"></div>
                                    <p className="text-gray-400 text-sm font-medium">{t.loading}</p>
                                </div>
                            ) : (
                                <div className="prose prose-sm prose-p:text-gray-600 prose-headings:text-ink leading-relaxed">
                                    {aiGuideContent}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TripDetail;
