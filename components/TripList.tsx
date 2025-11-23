
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
             <div className="w-10 h-10 bg-coral rounded-xl shadow-soft flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-6 h-6 fill-current">
                    <path d="M444.6 15.6c11.8-6.6 26.5-3.3 34.6 7.7 8.1 11 6.6 26.4-3.6 35.7L190.5 352.1l-65.7-27.1L444.6 15.6zM130.3 308.1l231.5-231.5L50.7 201.8l79.6 106.3zM164.2 376.8l23.5 86.8c2.9 10.7 15.7 15.1 24.5 8.4l62.6-47.8-86.8-49.9-23.8 2.5zM461.3 54.9L221.7 363.6l176.4 72.8c12.3 5.1 26.1-2.2 28.5-15.3l52-282.6c2.3-12.7-7.4-24.2-19.9-20.9z"/>
                </svg>
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
          trips.map((trip) => (
            <div 
              key={trip.id} 
              onClick={() => onSelectTrip(trip)}
              className={`group cursor-pointer active:scale-[0.98] transition-all transform bg-white rounded-3xl shadow-card hover:shadow-soft overflow-hidden ${settings.minimalistMode ? 'p-5 border border-sand' : 'p-3'}`}
            >
              {!settings.minimalistMode && (
                  <div className="aspect-[2/1] w-full relative overflow-hidden rounded-2xl bg-gray-100 mb-4 shadow-inner">
                    {trip.coverImage && !failedImages.has(trip.id) ? (
                      <img 
                        src={trip.coverImage} 
                        alt={trip.title} 
                        onError={() => handleImageError(trip.id)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full bg-sand/30 flex items-center justify-center">
                        <MapPinIcon className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-ink text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                        {trip.itinerary.length} {t.trips_count}
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