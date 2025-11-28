
import React, { useState } from 'react';
import { Trip, AppSettings } from '../types';
import { MapPinIcon, PlusIcon, CalendarIcon, Cog6ToothIcon } from './Icons';
import { translations } from '../utils/translations';

interface TripListProps {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onAddTrip: () => void;
  onOpenSettings: () => void;
  settings: AppSettings;
}

const TripList: React.FC<TripListProps> = ({ trips, onSelectTrip, onAddTrip, onOpenSettings, settings }) => {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const t = translations[settings.language] || translations['zh-TW'];

  const handleImageError = (id: string) => {
    setFailedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  return (
    <div className="flex flex-col h-full bg-paper pt-safe">
      <div className="px-6 py-5 sticky top-0 z-10 flex justify-between items-center bg-paper/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 flex items-center justify-center overflow-hidden">
            <img src="/nomadai-travel-journal/nomadai-travel-journal_app_icon.png" alt="Icon" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">{t.my_trips}</h1>
        </div>
        <button onClick={onOpenSettings} className="p-2.5 bg-white shadow-card rounded-full text-gray-400 hover:text-coral transition-colors active:scale-95">
          <Cog6ToothIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-2 space-y-6 pb-32 no-scrollbar">
        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center animate-fade-in border-2 border-dashed border-sand rounded-3xl m-4">
            <div className="w-16 h-16 bg-white shadow-soft rounded-full flex items-center justify-center mb-4 text-coral">
              <MapPinIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-ink mb-1">{t.start_adventure}</h3>
            <p className="text-gray-400 text-sm">{t.click_to_add}</p>
          </div>
        ) : (
          trips?.map((trip) => (
            <div
              key={trip.id}
              onClick={() => onSelectTrip(trip)}
              className={`group cursor-pointer active:scale-[0.98] transition-all transform bg-white rounded-3xl shadow-card hover:shadow-soft overflow-hidden ${settings.minimalistMode ? 'p-5 border border-sand' : 'p-3'}`}
            >
              {!settings.minimalistMode && (
                <div className="aspect-[2/1] w-full relative overflow-hidden rounded-2xl bg-gray-100 mb-4 shadow-inner group">
                  {trip.coverImage && !failedImages.has(trip.id) ? (
                    <>
                      {/* Loading Skeleton */}
                      <div className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center transition-opacity duration-500 ${loadedImages.has(trip.id) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <MapPinIcon className="w-8 h-8 text-gray-300 animate-bounce" />
                      </div>
                      <img
                        src={trip.coverImage}
                        alt={trip.title}
                        onLoad={() => setLoadedImages(prev => new Set(prev).add(trip.id))}
                        onError={() => handleImageError(trip.id)}
                        className={`w-full h-full object-cover transition-all duration-700 ${loadedImages.has(trip.id) ? 'opacity-100 group-hover:scale-105' : 'opacity-0'}`}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full bg-sand/30 flex items-center justify-center">
                      <MapPinIcon className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-ink text-xs font-bold px-3 py-1.5 rounded-full shadow-sm z-10">
                    {trip.itinerary?.length || 0} {t.trips_count}
                  </div>
                </div>
              )}

              <div className={`${settings.minimalistMode ? 'flex justify-between items-center' : 'px-2 pb-2'}`}>
                <div>
                  <h3 className={`font-bold text-ink leading-tight ${settings.minimalistMode ? 'text-lg' : 'text-xl mb-1'}`}>{trip.title}</h3>
                  <div className="flex items-center text-sm text-gray-400 font-medium">
                    <CalendarIcon className="w-4 h-4 mr-1.5 text-coral" />
                    <span>{trip.startDate} - {trip.endDate}</span>
                  </div>
                </div>
                {settings.minimalistMode && (
                  <div className="w-8 h-8 bg-paper rounded-full flex items-center justify-center text-coral">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onAddTrip}
        className="fixed bottom-28 right-6 w-16 h-16 bg-coral text-white rounded-full shadow-float flex items-center justify-center transition-all active:scale-90 hover:bg-coralDark z-50 ring-4 ring-white"
      >
        <PlusIcon className="w-8 h-8 stroke-[2]" />
      </button>
    </div>
  );
};

export default TripList;