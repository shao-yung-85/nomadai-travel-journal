import React, { useState, useEffect, useCallback } from 'react';
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
import { generateTripPlan, generateCoverImage, updateTripPlan } from './services/gemini';
import ReloadPrompt from './components/ReloadPrompt';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';

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
  getTripsKey: (userId: string) => `nomad_app_trips_${userId} `,
  getSettingsKey: (userId: string) => `nomad_app_settings_${userId} `,
  getMemoriesKey: (userId: string) => `nomad_app_memories_${userId} `,
  getChatSessionsKey: (userId: string) => `nomad_app_chat_sessions_${userId} `
};

const App: React.FC = () => {
  console.log("App Component Rendering...");
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [chatSessions, setChatSessions] = useState<AIChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ language: 'zh-TW', minimalistMode: false });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null); // New error state

  const [viewState, setViewState] = useState<ViewState>(ViewState.HOME);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [backgroundTasks, setBackgroundTasks] = useState<string[]>([]);

  // Auth & Data Listener
  useEffect(() => {
    console.log("Setting up Auth Listener...");
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Auth State Changed:", firebaseUser ? "User Logged In" : "User Logged Out", firebaseUser?.uid);
      if (firebaseUser) {
        // User is signed in
        const newUser: User = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || 'Traveler',
          password: '', // Not needed
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString()
        };
        setUser(newUser);

        // Listen to Trips
        console.log("Listening to trips for user:", firebaseUser.uid);
        const q = query(
          collection(db, "itineraries"),
          where("uid", "==", firebaseUser.uid),
          orderBy("createdAt", "desc")
        );

        const unsubscribeTrips = onSnapshot(q, (snapshot) => {
          const loadedTrips: Trip[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Map Firestore data to Trip type
            // Assuming data structure matches Trip type, but we need to handle dates/timestamps if needed
            loadedTrips.push({
              id: doc.id,
              ...data
            } as any);
          });
          setTrips(loadedTrips);
          setIsDataLoaded(true);
        }, (error) => {
          console.error("Error fetching trips:", error);
          setLastError(`Fetch Trips Error: ${error.message}`);
          setIsDataLoaded(true);
        });

        return () => unsubscribeTrips();
      } else {
        // User is signed out
        setUser(null);
        setTrips([]);
        setIsDataLoaded(true);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // ... (keep other effects for settings/memories if they are still local, or move them later)
  // For now, let's disable the local storage sync for trips to avoid conflicts

  const handleAddTrip = async (newTrip: Trip) => {
    if (!user) return;
    try {
      // Remove id (let Firestore generate it) or use it as doc id? 
      // Firestore addDoc generates ID. Let's use that.
      const { id, ...tripData } = newTrip;
      await addDoc(collection(db, "itineraries"), {
        ...tripData,
        uid: user.id,
        createdAt: serverTimestamp()
      });
      // State update is handled by onSnapshot
      if (viewState === ViewState.AI_PLANNER) {
        setViewState(ViewState.HOME); // Go home to see the new trip, or we need to wait for ID to select it
      }
    } catch (e: any) {
      console.error("Error adding trip", e);
      setLastError(`Add Trip Error: ${e.message}`);
      alert("新增失敗: " + e.message);
    }
  };

  const handleUpdateTrip = async (updatedTrip: Trip) => {
    if (!user || !updatedTrip.id) return;
    try {
      const tripRef = doc(db, "itineraries", updatedTrip.id);
      // Exclude id from data
      const { id, ...data } = updatedTrip;
      await updateDoc(tripRef, data);

      if (selectedTrip?.id === updatedTrip.id) {
        setSelectedTrip(updatedTrip);
      }
    } catch (e) {
      console.error("Error updating trip", e);
      alert("更新失敗");
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteDoc(doc(db, "itineraries", tripId));
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(null);
        setViewState(ViewState.HOME);
      }
    } catch (e) {
      console.error("Error deleting trip", e);
      alert("刪除失敗");
    }
  };

  const handleStartBackgroundGeneration = useCallback(async (userPrompt: string, tripId?: string): Promise<{ title: string; tripId: string } | null> => {
    console.log("Starting background generation...", { userPrompt, tripId });
    const tempId = Date.now().toString();
    setBackgroundTasks(prev => [...prev, tempId]);

    try {
      let tripPlan;
      let currentTrip = null;

      if (tripId) {
        currentTrip = trips.find(t => t.id === tripId);
      }

      if (currentTrip) {
        // Update existing trip
        console.log("Updating existing trip:", currentTrip.title);
        tripPlan = await updateTripPlan(currentTrip, userPrompt, settings.language);
        console.log("Updated Trip Plan:", tripPlan);
      } else {
        // Generate new trip
        console.log("Generating new trip...");
        tripPlan = await generateTripPlan(userPrompt, settings.language);
        console.log("New Trip Plan:", tripPlan);
      }

      // Generate cover image if needed (only for new trips or if missing)
      let coverImage = tripPlan.coverImage || currentTrip?.coverImage;
      if (!coverImage) {
        try {
          const imagePrompt = tripPlan.title || userPrompt;
          coverImage = await generateCoverImage(imagePrompt);
        } catch (imgError) {
          console.error("Failed to generate cover image:", imgError);
          coverImage = `https://placehold.co/800x600/e2e8f0/475569?text=${encodeURIComponent(tripPlan.title?.split(' ')[0] || 'Travel')}`;
        }
      }

      if (!tripPlan.itinerary || tripPlan.itinerary.length === 0) {
        console.warn("AI returned empty itinerary:", tripPlan);
      } else {
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

      let finalTrip: Trip;

      if (currentTrip) {
        finalTrip = {
          ...currentTrip,
          ...tripPlan,
          id: currentTrip.id, // Keep original ID
          coverImage: coverImage,
        };
        // Update via Firestore
        handleUpdateTrip(finalTrip);
      } else {
        finalTrip = {
          ...tripPlan,
          id: tempId, // Temporary ID, Firestore will generate real one
          coverImage: coverImage,
          bookings: [],
          budget: tripPlan.budget || { total: 0, currency: 'TWD', expenses: [] },
          weather: tripPlan.weather || []
        };
        // Add via Firestore
        handleAddTrip(finalTrip);
      }

      setBackgroundTasks(prev => prev.filter(id => id !== tempId));
      return { title: finalTrip.title, tripId: finalTrip.id };

    } catch (error: any) {
      console.error("Background generation failed", error);
      setBackgroundTasks(prev => prev.filter(id => id !== tempId));
      return null;
    }
  }, [trips, settings.language]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleResetApp = () => {
    if (!user) return;
    // For Firestore, we might want to delete all trips? Or just clear local state?
    // Let's just clear local state for now as "Reset App" usually implies local reset.
    // But since we are synced, maybe we should warn user.
    // For now, let's just sign out.
    handleLogout();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // State clearing handled by onAuthStateChanged
      setViewState(ViewState.HOME);
      setSelectedTrip(null);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  // Remove handleLogin/handleRegister as they are replaced by Auth component logic
  const handleLogin = () => { };
  const handleRegister = () => { };

  // ...

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

  const handleUpdateChatSession = (sessionId: string, messages: AIChatMessage[], title?: string, tripId?: string) => {
    setChatSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        // Update title if provided, OR if it's the first user message and title is default
        let newTitle = session.title;

        if (title) {
          newTitle = title;
        } else {
          // Check if this is the first USER message
          const hasUserMessage = session.messages.some(m => m.role === 'user');
          if (!hasUserMessage) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
              newTitle = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
            }
          }
        }

        return {
          ...session,
          messages,
          title: newTitle,
          tripId: tripId || session.tripId, // Persist tripId
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

  // Dedicated effect for removing loader
  useEffect(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      console.log("Removing loading screen...");
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    } else {
      console.log("Loading screen not found (already removed?)");
    }
  }, []);

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
  }, [settings, user, isDataLoaded]);

  if (!user) {
    return <Auth onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const handleOpenAIForTrip = (tripId: string) => {
    // Find existing session for this trip
    const existingSession = chatSessions.find(s => s.tripId === tripId);
    if (existingSession) {
      setCurrentChatId(existingSession.id);
    } else {
      // Create new session linked to trip
      const newSessionId = handleCreateChatSession();
      // Update session to link to trip
      setChatSessions(prev => prev.map(s => s.id === newSessionId ? { ...s, tripId, title: `${trips.find(t => t.id === tripId)?.title || 'Trip'} Planning` } : s));
    }
    setViewState(ViewState.AI_PLANNER);
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
            onOpenAI={handleOpenAIForTrip}
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
      {lastError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{lastError}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setLastError(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" /></svg>
          </span>
        </div>
      )}
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
      <ReloadPrompt settings={settings} />
    </div>
  );
};

export default App;
