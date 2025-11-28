
import React, { useState, useEffect } from 'react';
import { Trip, ViewState, AppSettings, User, Memory, AIChatSession, AIChatMessage } from './types';
import TripList from './components/TripList';
import AddTripForm from './components/AddTripForm';
import MagicEditor from './components/MagicEditor';
import TripDetail from './components/TripDetail';
import AIPlanner from './components/AIPlanner';
import Tools from './components/Tools';
import Settings from './components/Settings';
import Auth from './components/Auth';
import TripMemory from './components/TripMemory';
import { HomeIcon, SparklesIcon, SquaresPlusIcon, ChatBubbleIcon, CameraIcon } from './components/Icons';
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
      { date: '2023-11-10', tempHigh: 25, tempLow: 18, condition: 'Sunny', icon: '☀️' },
      { date: '2023-11-20', tempHigh: 22, tempLow: 17, condition: 'Cloudy', icon: '☁️' }
    ],
    notes: ''
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
  USERS: 'nomad_app_users_v1',
  CURRENT_USER: 'nomad_app_current_user_v1',
  // Dynamic keys based on user ID
  getTripsKey: (userId: string) => `nomad_app_trips_${userId}`,
  getSettingsKey: (userId: string) => `nomad_app_settings_${userId}`,
  getMemoriesKey: (userId: string) => `nomad_app_memories_${userId}`,
  getChatSessionsKey: (userId: string) => `nomad_app_chat_sessions_${userId}`
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  // Load initial state from LocalStorage based on current user
  const [trips, setTrips] = useState<Trip[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [chatSessions, setChatSessions] = useState<AIChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ language: 'zh-TW', minimalistMode: false });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data when user changes
  useEffect(() => {
    setIsDataLoaded(false); // Reset loading state

    if (!user) {
      setTrips([]);
      setMemories([]);
      setChatSessions([]);
      setCurrentChatId(null);
      return;
    }

    try {
      const tripsKey = STORAGE_KEYS.getTripsKey(user.id);
      const savedTrips = localStorage.getItem(tripsKey);
      if (savedTrips) {
        const parsed = JSON.parse(savedTrips);
        if (Array.isArray(parsed)) {
          setTrips(parsed.map(trip => ({
            ...trip,
            itinerary: Array.isArray(trip.itinerary) ? trip.itinerary : [],
            bookings: Array.isArray(trip.bookings) ? trip.bookings : [],
            weather: Array.isArray(trip.weather) ? trip.weather : [],
            budget: trip.budget || { total: 0, currency: 'TWD', expenses: [] }
          })));
        } else {
          setTrips([]);
        }
      } else {
        setTrips([]);
      }

      const memoriesKey = STORAGE_KEYS.getMemoriesKey(user.id);
      const savedMemories = localStorage.getItem(memoriesKey);
      if (savedMemories) {
        const parsed = JSON.parse(savedMemories);
        setMemories(Array.isArray(parsed) ? parsed : []);
      } else {
        setMemories([]);
      }

      const settingsKey = STORAGE_KEYS.getSettingsKey(user.id);
      const savedSettings = localStorage.getItem(settingsKey);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        setSettings({ language: 'zh-TW', minimalistMode: false });
      }

      const chatSessionsKey = STORAGE_KEYS.getChatSessionsKey(user.id);
      const savedSessions = localStorage.getItem(chatSessionsKey);
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        setChatSessions(Array.isArray(parsed) ? parsed : []);
      } else {
        setChatSessions([]);
      }

      // Mark data as loaded after setting state
      setIsDataLoaded(true);

    } catch (e) {
      console.error("Failed to load user data", e);
      setTrips([]);
      setMemories([]);
      setChatSessions([]);
      setIsDataLoaded(true); // Even on error, we mark as loaded to allow future saves
    }
  }, [user]);

  const [viewState, setViewState] = useState<ViewState>(ViewState.HOME);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [backgroundTasks, setBackgroundTasks] = useState<string[]>([]);
  // const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]); // Removed, managed by chatSessions

  // Persistence Effects
  useEffect(() => {
    if (user && isDataLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.getTripsKey(user.id), JSON.stringify(trips));
      } catch (e) {
        console.error('Failed to save trip update', e);
        alert('儲存失敗：空間不足。請嘗試刪除一些舊的行程或照片。');
      }
    }
  }, [trips, user, isDataLoaded]);

  useEffect(() => {
    if (user && isDataLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.getMemoriesKey(user.id), JSON.stringify(memories));
      } catch (e) {
        console.error('Failed to save memories', e);
        alert('儲存回憶失敗：空間不足。請嘗試刪除一些舊的照片。');
      }
    }
  }, [memories, user, isDataLoaded]);

  useEffect(() => {
    if (user && isDataLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.getChatSessionsKey(user.id), JSON.stringify(chatSessions));
      } catch (e) {
        console.error('Failed to save chat sessions', e);
        // Chat history is less critical, maybe just console error
      }
    }
  }, [chatSessions, user, isDataLoaded]);

  useEffect(() => {
    if (user && isDataLoaded) {
      try {
        localStorage.setItem(STORAGE_KEYS.getSettingsKey(user.id), JSON.stringify(settings));
      } catch (e) {
        console.error('Failed to save settings', e);
        // Silent fail for settings is acceptable, or show toast
      }
    }
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

  // Migration Effect: Fix broken Unsplash URLs
  useEffect(() => {
    const migrateImages = () => {
      let hasChanges = false;
      const newTrips = trips.map(trip => {
        // Check for deprecated Unsplash Source URLs
        if (trip.coverImage && (trip.coverImage.includes('source.unsplash.com') || trip.coverImage.includes('images.unsplash.com/photo-'))) {
          hasChanges = true;
          // Generate new static Pollinations URL
          const prompt = `Cinematic travel photography of ${trip.title}, 4k, high quality, sunny day`;
          const encoded = encodeURIComponent(prompt);
          const seed = Math.floor(Math.random() * 1000000);
          const newUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1600&height=900&nologo=true&seed=${seed}&model=flux`;
          console.log(`Migrating cover image for ${trip.title} to Pollinations`);
          return {
            ...trip,
            coverImage: newUrl
          };
        }
        return trip;
      });

      if (hasChanges) {
        setTrips(newTrips);
      }
    };

    // Run migration with a small delay to ensure hydration
    const timer = setTimeout(migrateImages, 1000);
    return () => clearTimeout(timer);
  }, []); // Run once on mount


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
      console.log("Raw AI Response:", tripPlan);

      // Generate cover image
      let coverImage = tripPlan.coverImage;
      if (!coverImage) {
        try {
          // Use the trip title or first location as the prompt for the image
          const imagePrompt = tripPlan.title || userPrompt;
          coverImage = await generateCoverImage(imagePrompt);
        } catch (imgError) {
          console.error("Failed to generate cover image:", imgError);
          // Fallback to placeholder if AI image generation fails
          coverImage = `https://placehold.co/800x600/e2e8f0/475569?text=${encodeURIComponent(tripPlan.title?.split(' ')[0] || 'Travel')}`;
        }
      }

      if (!tripPlan.itinerary || tripPlan.itinerary.length === 0) {
        console.warn("AI returned empty itinerary:", tripPlan);
        // Attempt to recover or notify?
        // For now, we just log it. The user will see an empty trip.
      } else {
        // Sanitize itinerary
        tripPlan.itinerary = tripPlan.itinerary.map((item: any) => ({
          ...item,
          day: Number(item.day) || 1,
          id: item.id || Math.random().toString(36).substr(2, 9),
          time: item.time || '09:00',
          activity: item.activity || 'New Activity',
          location: item.location || '',
          notes: item.notes || ''
        }));
      }

      const newTrip: Trip = {
        ...tripPlan,
        id: tempId,
        coverImage: coverImage,
        // Ensure other arrays are initialized
        bookings: [],
        budget: tripPlan.budget || { total: 0, currency: 'TWD', expenses: [] },
        weather: tripPlan.weather || []
      };

      setTrips(prev => [newTrip, ...prev]);
      setBackgroundTasks(prev => prev.filter(id => id !== tempId));

      // Auto-navigate to the new trip
      setSelectedTrip(newTrip);
      setViewState(ViewState.TRIP_DETAILS);

    } catch (error: any) {
      console.error("Background generation failed", error);
      setBackgroundTasks(prev => prev.filter(id => id !== tempId));
      // Show detailed error message for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`AI Generation Failed: ${errorMessage}`);
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
    if (!user) return;
    setTrips([]);
    setMemories([]);
    setChatSessions([]);
    localStorage.removeItem(STORAGE_KEYS.getTripsKey(user.id));
    localStorage.removeItem(STORAGE_KEYS.getMemoriesKey(user.id));
    localStorage.removeItem(STORAGE_KEYS.getChatSessionsKey(user.id));
    localStorage.removeItem(STORAGE_KEYS.getSettingsKey(user.id));
    setSelectedTrip(null);
    setViewState(ViewState.HOME);
  };

  const handleLogin = (userData: User) => {
    try {
      const usersJson = localStorage.getItem(STORAGE_KEYS.USERS);
      const users: User[] = usersJson ? JSON.parse(usersJson) : [];
      const foundUser = users.find(u => u.username === userData.username && u.password === userData.password);

      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(foundUser));
      } else {
        alert('使用者名稱或密碼錯誤');
      }
    } catch (e) {
      console.error("Login failed", e);
      alert('登入失敗');
    }
  };

  const handleRegister = (newUser: User) => {
    try {
      const usersJson = localStorage.getItem(STORAGE_KEYS.USERS);
      const users: User[] = usersJson ? JSON.parse(usersJson) : [];

      if (users.some(u => u.username === newUser.username)) {
        alert('使用者名稱已存在');
        return;
      }

      const updatedUsers = [...users, newUser];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));

      setUser(newUser);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
      setTrips([]); // New user starts with empty trips
      setMemories([]);
      setChatSessions([]);
    } catch (e) {
      console.error("Registration failed", e);
      alert('註冊失敗');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    setTrips([]);
    setMemories([]);
    setChatSessions([]);
    setCurrentChatId(null);
    setViewState(ViewState.HOME);
    setSelectedTrip(null);
  };

  const handleAddMemory = (memory: Memory) => {
    setMemories([memory, ...memories]);
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(memories.filter(m => m.id !== id));
  };

  const handleCreateChatSession = () => {
    const newSession: AIChatSession = {
      id: Date.now().toString(),
      title: settings.language === 'zh-TW' ? '新對話' : 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentChatId(newSession.id);
    return newSession.id;
  };

  const handleUpdateChatSession = (sessionId: string, messages: AIChatMessage[]) => {
    setChatSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        // Update title if it's the first user message and title is default
        let title = session.title;
        if (session.messages.length === 0 && messages.length > 0) {
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
          }
        }

        return {
          ...session,
          messages,
          title,
          updatedAt: Date.now()
        };
      }
      return session;
    }));
  };

  const handleDeleteChatSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentChatId === sessionId) {
      setCurrentChatId(null);
    }
  };

  const handleSelectChatSession = (sessionId: string) => {
    setCurrentChatId(sessionId);
  };

  if (!user) {
    return <Auth onLogin={handleLogin} onRegister={handleRegister} />;
  }

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
      case ViewState.TRIP_MEMORY:
        return (
          <TripMemory
            memories={memories}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
            settings={settings}
          />
        );
      case ViewState.AI_PLANNER:
        return (
          <AIPlanner
            onStartGeneration={handleStartBackgroundGeneration}
            onCancel={() => setViewState(ViewState.HOME)}
            settings={settings}
            sessions={chatSessions}
            currentSessionId={currentChatId}
            onCreateSession={handleCreateChatSession}
            onUpdateSession={handleUpdateChatSession}
            onDeleteSession={handleDeleteChatSession}
            onSelectSession={handleSelectChatSession}
          />
        );
      case ViewState.TOOLS:
        return (
          <Tools
            onBack={() => setViewState(ViewState.HOME)}
            trips={trips}
            settings={settings}
            onMagicEditor={() => setViewState(ViewState.MAGIC_EDITOR)}
          />
        );
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
            user={user}
            onLogout={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  const showBottomNav = [
    ViewState.HOME,
    ViewState.TRIP_MEMORY,
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
              onClick={() => setViewState(ViewState.TRIP_MEMORY)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all w-16 ${viewState === ViewState.TRIP_MEMORY ? 'text-coral scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <CameraIcon className={`w-6 h-6 ${viewState === ViewState.TRIP_MEMORY ? 'stroke-2' : 'stroke-[1.5]'}`} />
              {viewState === ViewState.TRIP_MEMORY && <span className="w-1 h-1 bg-coral rounded-full mt-1"></span>}
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
