
import React, { useState, useEffect } from 'react';
import { Trip, ViewState, AppSettings } from './types';
import TripList from './components/TripList';
import AddTripForm from './components/AddTripForm';
import MagicEditor from './components/MagicEditor';
import TripDetail from './components/TripDetail';
import AIPlanner from './components/AIPlanner';
import Tools from './components/Tools';
import Settings from './components/Settings';
import { HomeIcon, SparklesIcon, SquaresPlusIcon, ChatBubbleIcon } from './components/Icons';
import { generateTripPlan, generateCoverImage } from './services/gemini';

// Mock initial data - used only if local storage is empty
const INITIAL_TRIPS: Trip[] = [
  {
    id: '1',
    title: '京都深度漫遊',
    startDate: '2023-11-10',
    endDate: '2023-11-20',
    coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
    itinerary: [
      { id: '101', day: 1, time: '09:00', activity: '伏見稻荷大社參拜', location: '伏見区深草藪之内町68', notes: '記得穿好走的鞋' },
      { id: '102', day: 1, time: '13:00', activity: '清水寺周邊散策', location: '東山區清水', notes: '必吃抹茶冰淇淋' },
      { id: '103', day: 1, time: '18:00', activity: '祇園花見小路晚餐', location: '祇園町南側', notes: '預約了懷石料理' },
      { id: '201', day: 2, time: '10:00', activity: '嵐山竹林小徑', location: '嵐山', notes: '早點去避開人潮' },
      { id: '202', day: 2, time: '14:00', activity: '金閣寺', location: '北區金閣寺町', notes: '陽光下最美' }
    ],
    bookings: [
      {
        id: 'f1',
        number: 'BR132',
        airline: 'EVA Air',
        departureTime: '08:30',
        arrivalTime: '12:10',
        origin: 'TPE',
        destination: 'KIX',
        status: 'Confirmed',
        type: 'FLIGHT',
        bookingReference: '6XYZ99',
        passengerNames: ['Wang Xiao-Ming', 'Chen Xiao-Mei'],
        bookingUrl: 'https://www.evaair.com'
      },
      {
        id: 'h1',
        number: 'Check-in: 15:00',
        airline: 'Kyoto Granvia',
        departureTime: '15:00',
        arrivalTime: '11:00',
        origin: 'Nov 10',
        destination: 'Nov 15',
        status: 'Confirmed',
        type: 'HOTEL',
        bookingReference: 'HTL-88822',
        passengerNames: ['Wang Xiao-Ming'],
        bookingUrl: 'https://www.booking.com'
      }
    ],
    budget: {
      total: 50000,
      currency: 'TWD',
      expenses: [
        { id: 'e1', title: '機票', amount: 15000, category: 'Transport', date: '2023-10-01', payer: '我', paymentMethod: 'Credit Card' },
        { id: 'e2', title: '住宿訂金', amount: 5000, category: 'Accommodation', date: '2023-10-05', payer: '小明', paymentMethod: 'Cash' },
      ]
    },
    weather: [
      { date: '11/10', tempHigh: 18, tempLow: 10, condition: 'Sunny', icon: '☀️' },
      { date: '11/11', tempHigh: 17, tempLow: 9, condition: 'Cloudy', icon: '☁️' },
      { date: '11/12', tempHigh: 16, tempLow: 8, condition: 'Rain', icon: '🌧️' }
    ]
  },
  {
    id: '2',
    title: '台北美食探險',
    startDate: '2024-03-05',
    endDate: '2024-03-12',
    coverImage: 'https://images.unsplash.com/photo-1470004914212-05527e49370b?q=80&w=800&auto=format&fit=crop',
    itinerary: [],
    budget: { total: 10000, currency: 'TWD', expenses: [] }
  }
];

const STORAGE_KEYS = {
  TRIPS: 'nomad_app_trips_v3',
  SETTINGS: 'nomad_app_settings_v3'
};

const App: React.FC = () => {
  // Load initial state from LocalStorage
  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const savedTrips = localStorage.getItem(STORAGE_KEYS.TRIPS);
      if (!savedTrips) return INITIAL_TRIPS;
      const parsed = JSON.parse(savedTrips);
      // Ensure parsed data is actually an array and sanitize items
      if (!Array.isArray(parsed)) return INITIAL_TRIPS;

      return parsed.map(trip => ({
        ...trip,
        itinerary: Array.isArray(trip.itinerary) ? trip.itinerary : [],
        bookings: Array.isArray(trip.bookings) ? trip.bookings : [],
        weather: Array.isArray(trip.weather) ? trip.weather : [],
        budget: trip.budget || { total: 0, currency: 'TWD', expenses: [] }
      }));
    } catch (e) {
      console.error("Failed to load trips", e);
      return INITIAL_TRIPS;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!savedSettings) return { language: 'zh-TW', minimalistMode: false };
      const parsed = JSON.parse(savedSettings);
      return parsed && typeof parsed === 'object' ? parsed : { language: 'zh-TW', minimalistMode: false };
    } catch (e) {
      return { language: 'zh-TW', minimalistMode: false };
    }
  });

  const [viewState, setViewState] = useState<ViewState>(ViewState.HOME);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [backgroundTasks, setBackgroundTasks] = useState<string[]>([]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    if (settings.themeColor) {
      document.documentElement.style.setProperty('--color-coral', settings.themeColor);
    } else {
      document.documentElement.style.removeProperty('--color-coral');
    }

    // Hide loading screen when app is mounted
    const loader = document.getElementById('loading-screen');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }, [settings]);

  const handleAddTrip = (newTrip: Trip) => {
    setTrips([newTrip, ...trips]);
    if (viewState === ViewState.AI_PLANNER) {
      setSelectedTrip(newTrip);
      setViewState(ViewState.TRIP_DETAILS);
    }
  };

  const handleUpdateTrip = (updatedTrip: Trip) => {
    setTrips(trips?.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    // Important: Update selectedTrip reference so Detail view re-renders immediately
    if (selectedTrip?.id === updatedTrip.id) {
      setSelectedTrip(updatedTrip);
    }
  };

  const handleStartBackgroundGeneration = async (userPrompt: string) => {
    const tempId = Date.now().toString();
    setBackgroundTasks(prev => [...prev, tempId]);

    try {
      const tripPlan = await generateTripPlan(userPrompt, settings.language);

      // Generate cover image
      let coverImage = tripPlan.coverImage;
      if (!coverImage) {
        try {
          // Use the trip title or first location as the prompt for the image
          const imagePrompt = tripPlan.title || userPrompt;
          coverImage = await generateCoverImage(imagePrompt);
        } catch (imgError) {
          console.error("Failed to generate cover image:", imgError);
          // Fallback to Unsplash if AI image generation fails
          coverImage = `https://source.unsplash.com/800x600/?travel,${tripPlan.title.split(' ')[0]}`;
        }
      }

      const newTrip: Trip = {
        ...tripPlan,
        id: tempId,
        coverImage: coverImage,
      };

      setTrips(prev => [newTrip, ...prev]);
      setBackgroundTasks(prev => prev.filter(id => id !== tempId));

    } catch (error) {
      console.error("Background generation failed", error);
      setBackgroundTasks(prev => prev.filter(id => id !== tempId));
      alert("AI Generation Failed.");
    }
  };

  const handleDeleteTrip = (tripId: string) => {
    setTrips(trips.filter(t => t.id !== tripId));
    setSelectedTrip(null);
    setViewState(ViewState.HOME);
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleResetApp = () => {
    setTrips([]);
    localStorage.removeItem(STORAGE_KEYS.TRIPS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    setSelectedTrip(null);
    setViewState(ViewState.HOME);
    setTrips(INITIAL_TRIPS);
  };

  const renderContent = () => {
    switch (viewState) {
      case ViewState.HOME:
        return (
          <TripList
            trips={trips}
            onSelectTrip={(trip) => {
              setSelectedTrip(trip);
              setViewState(ViewState.TRIP_DETAILS);
            }}
            onAddTrip={() => setViewState(ViewState.ADD_TRIP)}
            onOpenSettings={() => setViewState(ViewState.SETTINGS)}
            settings={settings}
          />
        );
      case ViewState.ADD_TRIP:
        return (
          <AddTripForm
            onSave={(t) => { handleAddTrip(t); setViewState(ViewState.HOME); }}
            onCancel={() => setViewState(ViewState.HOME)}
            settings={settings}
          />
        );
      case ViewState.MAGIC_EDITOR:
        return <MagicEditor settings={settings} />;
      case ViewState.AI_PLANNER:
        return (
          <AIPlanner
            onStartGeneration={handleStartBackgroundGeneration}
            onCancel={() => setViewState(ViewState.HOME)}
            settings={settings}
          />
        );
      case ViewState.TOOLS:
        return <Tools onBack={() => setViewState(ViewState.HOME)} trips={trips} settings={settings} />;
      case ViewState.TRIP_DETAILS:
        return selectedTrip ? (
          <TripDetail
            trip={selectedTrip}
            onBack={() => setViewState(ViewState.HOME)}
            onDelete={handleDeleteTrip}
            onUpdateTrip={handleUpdateTrip}
            settings={settings}
          />
        ) : null;
      case ViewState.SETTINGS:
        return (
          <Settings
            onBack={() => setViewState(ViewState.HOME)}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetApp={handleResetApp}
          />
        );
      default:
        return null;
    }
  };

  const showBottomNav = [
    ViewState.HOME,
    ViewState.MAGIC_EDITOR,
    ViewState.TOOLS,
    ViewState.AI_PLANNER
  ].includes(viewState);

  return (
    <div className="h-full w-full max-w-md mx-auto bg-paper shadow-2xl relative overflow-hidden flex flex-col font-sans text-ink">
      <div className="flex-1 overflow-hidden relative bg-paper">
        {renderContent()}
      </div>

      {showBottomNav && (
        <div className="absolute bottom-6 left-4 right-4 z-40">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-float rounded-3xl px-2 py-3 flex justify-around items-center">
            <button
              onClick={() => setViewState(ViewState.HOME)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all w-16 ${viewState === ViewState.HOME ? 'text-coral scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <HomeIcon className={`w-6 h-6 ${viewState === ViewState.HOME ? 'stroke-2' : 'stroke-[1.5]'}`} />
              {viewState === ViewState.HOME && <span className="w-1 h-1 bg-coral rounded-full mt-1"></span>}
            </button>

            <button
              onClick={() => setViewState(ViewState.AI_PLANNER)}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-2xl transition-all w-16 ${viewState === ViewState.AI_PLANNER ? 'text-coral scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className="relative">
                <ChatBubbleIcon className={`w-6 h-6 ${viewState === ViewState.AI_PLANNER ? 'stroke-2' : 'stroke-[1.5]'}`} />
                {backgroundTasks?.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-coral rounded-full animate-ping"></span>
                )}
                {backgroundTasks?.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-coral rounded-full border-2 border-white"></span>
                )}
              </div>
              {viewState === ViewState.AI_PLANNER && <span className="w-1 h-1 bg-coral rounded-full mt-1"></span>}
            </button>

            <button
              onClick={() => setViewState(ViewState.MAGIC_EDITOR)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all w-16 ${viewState === ViewState.MAGIC_EDITOR ? 'text-coral scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <SparklesIcon className={`w-6 h-6 ${viewState === ViewState.MAGIC_EDITOR ? 'stroke-2' : 'stroke-[1.5]'}`} />
              {viewState === ViewState.MAGIC_EDITOR && <span className="w-1 h-1 bg-coral rounded-full mt-1"></span>}
            </button>

            <button
              onClick={() => setViewState(ViewState.TOOLS)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all w-16 ${viewState === ViewState.TOOLS ? 'text-coral scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <SquaresPlusIcon className={`w-6 h-6 ${viewState === ViewState.TOOLS ? 'stroke-2' : 'stroke-[1.5]'}`} />
              {viewState === ViewState.TOOLS && <span className="w-1 h-1 bg-coral rounded-full mt-1"></span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
