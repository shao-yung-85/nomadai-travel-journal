import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trip, ItineraryItem, AppSettings } from '../types';
import { getAttractionGuide, optimizeRoute, getClothingAdvice } from '../services/gemini';
import { translations } from '../utils/translations';
import {
    ClockIcon, MapPinIcon, PencilIcon, TrashIcon, RobotIcon,
    ListIcon, SparklesIcon, ShareIcon, LightBulbIcon,
    WalkIcon, TrainIcon, BusIcon, CarIcon, PlaneIcon, WalletIcon
} from './Icons';

interface TripItineraryProps {
    trip: Trip;
    settings: AppSettings;
    onUpdateTrip?: (trip: Trip) => void;
    onOpenQuickExpense: (item: ItineraryItem) => void;
    onItemClick?: (item: ItineraryItem) => void;
}

const TripItinerary: React.FC<TripItineraryProps> = ({ trip, settings, onUpdateTrip, onOpenQuickExpense, onItemClick }) => {
    const t = translations[settings.language] || translations['zh-TW'];

    // ... (state definitions remain unchanged)

    // ... (effects and handlers remain unchanged)

    // ...

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

                        <div
                            className="bg-white p-4 rounded-2xl shadow-card border border-transparent hover:border-sand transition-all relative cursor-pointer active:scale-[0.99]"
                            onClick={() => onItemClick?.(item)}
                        >
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openLink(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`);
                                }}
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
                        </div >
                    ))}
                </div >
            ) : (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-sand/30 rounded-full flex items-center justify-center text-gray-400">
            <ListIcon className="w-8 h-8" />
        </div>
        <p className="text-gray-400 font-medium">{t.no_itinerary}<br /><span className="text-xs">{t.click_add}</span></p>
    </div>
)}

{/* AI Guide Modal */ }
{
    selectedAttraction && (
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
    )
}

{/* Add/Edit Activity Modal */ }
{
    isAddingActivity && (
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
                                placeholder="Details..."
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
    )
}

{/* Floating Action Button for Adding Activity */ }
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
        </div >
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
