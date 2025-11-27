
export interface ItineraryItem {
  id: string;
  day: number;
  time: string;
  activity: string;
  location: string;
  notes?: string;
  lat?: number;
  lng?: number;
  coordinates?: { lat: number; lng: number };
  attachments?: {
    id: string;
    name: string;
    type: 'image' | 'pdf';
    data: string; // Base64
    uploadedAt: string;
  }[];
  travelToNext?: {
    mode: 'WALK' | 'TRAIN' | 'BUS' | 'CAR' | 'FLIGHT';
    duration: string;
    details?: string;
    note?: string; // Optional note for quick expense details
  };
}

export interface Flight {
  id: string;
  number: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  origin: string;
  destination: string;
  status: 'On Time' | 'Delayed' | 'Boarding' | 'Confirmed';
  bookingReference?: string; // PNR
  passengerNames?: string[];
  bookingUrl?: string;
  type: 'FLIGHT' | 'HOTEL' | 'TRAIN';
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: 'Transport' | 'Food' | 'Accommodation' | 'Activities' | 'Shopping' | 'Other';
  date: string;
  payer: string;
  paymentMethod: 'Cash' | 'Credit Card' | 'Debit Card' | 'Mobile Payment';
  participants?: string[]; // Who should split this expense
  splits?: { person: string; amount: number }[]; // Custom split amounts
  originalCurrency?: string; // e.g. 'JPY', 'KRW'
  exchangeRate?: number; // Rate to TWD
  note?: string;
}

export interface Budget {
  total: number;
  currency: string;
  expenses: ExpenseItem[];
}

export interface PackingItem {
  id: string;
  item: string;
  category: string;
  checked: boolean;
}

export interface ShoppingItem {
  id: string;
  item: string;
  bought: boolean;
  notes?: string;
}

export interface WeatherForecast {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  icon: string;
}

export interface User {
  id: string;
  username: string;
  password?: string; // In a real app, never store plain text passwords!
  createdAt: string;
}

export interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  itinerary: ItineraryItem[];
  bookings?: Flight[];
  budget?: Budget;
  packingList?: PackingItem[];
  shoppingList?: ShoppingItem[];
  weather?: WeatherForecast[];
  notes?: string;
  isGenerating?: boolean; // New flag for loading state in list
}

export interface Expense {
  id: string;
  payer: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
}

export interface TimeCapsule {
  id: string;
  message: string;
  location: string;
  lockDate: string;
  unlockDate: string;
  isLocked: boolean;
}

export interface Memory {
  id: string;
  userId: string;
  imageUrl: string;
  caption: string;
  date: string;
}

export enum ViewState {
  HOME = 'HOME',
  ADD_TRIP = 'ADD_TRIP',
  TRIP_DETAILS = 'TRIP_DETAILS',
  SETTINGS = 'SETTINGS',
  MAGIC_EDITOR = 'MAGIC_EDITOR',
  AI_PLANNER = 'AI_PLANNER',
  TOOLS = 'TOOLS',
  TRIP_MEMORY = 'TRIP_MEMORY'
}

export interface MagicEditorState {
  originalImage: string | null;
  generatedImage: string | null;
  prompt: string;
  isLoading: boolean;
}

export interface AppSettings {
  language: 'zh-TW' | 'en-US' | 'ja-JP';
  minimalistMode: boolean;
  themeColor?: string;
}
