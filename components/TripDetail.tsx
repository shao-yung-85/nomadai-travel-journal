import React, { useState, useRef, useEffect } from 'react';
import { Trip, ExpenseItem, ItineraryItem, AppSettings } from '../types';
import { ChevronLeftIcon, MapIcon, WalletIcon, TicketIcon, TrashIcon, ListIcon, PencilIcon, ShoppingBagIcon, SparklesIcon, SearchIcon } from './Icons';
import ShoppingList from './ShoppingList';
import TripItinerary from './TripItinerary';
import TripBudget from './TripBudget';
import TripBookings from './TripBookings';
import TripMap from './TripMap';
import ShareTripModal from './ShareTripModal';
import { translations } from '../utils/translations';
import { geocodeAddress } from '../services/geocoding';
import { COMMON_CURRENCIES, getCurrencySymbol } from '../utils/currencies';
import { getExchangeRate } from '../services/gemini';

interface TripDetailProps {
    trip: Trip;
    onBack: () => void;
    onDelete?: (id: string) => void;
    onUpdateTrip?: (trip: Trip) => void;
    onOpenAI?: (tripId: string) => void;
    settings: AppSettings;
}

type Tab = 'ITINERARY' | 'MAP' | 'BUDGET' | 'BOOKINGS' | 'SHOPPING';

const TripDetail: React.FC<TripDetailProps> = ({ trip, onBack, onDelete, onUpdateTrip, onOpenAI, settings }) => {
    const t = translations[settings.language] || translations['zh-TW'];
    const [activeTab, setActiveTab] = useState<Tab>('ITINERARY');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    // Map Search State
    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [mapSearchResult, setMapSearchResult] = useState<{ lat: number; lng: number } | null>(null);
    const [isSearchingMap, setIsSearchingMap] = useState(false);

    const handleMapSearch = async (query?: string) => {
        const searchText = query || mapSearchQuery;
        if (!searchText.trim()) return;

        if (query) {
            setMapSearchQuery(query);
        }

        setIsSearchingMap(true);
        try {
            const result = await geocodeAddress(searchText, settings.apiKey);
            if (result) {
                setMapSearchResult(result);
            } else {
                // Don't alert if it's an auto-search from item click, just log it
                if (!query) alert('Location not found');
                console.log(`Location not found for: ${searchText}`);
            }
        } catch (error) {
            console.error('Map search failed:', error);
        } finally {
            setIsSearchingMap(false);
        }
    };

    // Quick Expense State
    const [quickExpenseItem, setQuickExpenseItem] = useState<ItineraryItem | null>(null);
    const [quickExpenseTitle, setQuickExpenseTitle] = useState('');
    const [quickExpenseAmount, setQuickExpenseAmount] = useState('');
    const [quickExpenseNote, setQuickExpenseNote] = useState('');
    const [quickExpenseItems, setQuickExpenseItems] = useState<{ name: string, price: string }[]>([{ name: '', price: '' }]);

    // Multi-currency Quick Expense
    const [quickExpenseCurrency, setQuickExpenseCurrency] = useState(trip.budget?.currency || 'TWD');
    const [quickExpenseRate, setQuickExpenseRate] = useState('');
    const [quickExpenseBaseAmount, setQuickExpenseBaseAmount] = useState(0);
    const [isFetchingQuickRate, setIsFetchingQuickRate] = useState(false);
    const [quickFetchError, setQuickFetchError] = useState<string | null>(null);
    const [isAddingQuickExpense, setIsAddingQuickExpense] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Reset currency when modal opens
    useEffect(() => {
        if (isAddingQuickExpense) {
            setQuickExpenseCurrency(trip.budget?.currency || 'TWD');
            setQuickExpenseRate('');
        }
    }, [isAddingQuickExpense, trip.budget?.currency]);

    // Auto-fetch exchange rate for Quick Expense
    useEffect(() => {
        const fetchRate = async () => {
            const baseCurrency = trip.budget?.currency || 'TWD';
            setQuickFetchError(null);
            if (quickExpenseCurrency !== baseCurrency) {
                if (settings.apiKey) {
                    setIsFetchingQuickRate(true);
                    try {
                        const rate = await getExchangeRate(quickExpenseCurrency, baseCurrency);
                        if (rate) {
                            setQuickExpenseRate(rate);
                        } else {
                            setQuickFetchError("無法取得匯率 (API Key 可能無效)");
                        }
                    } catch (error) {
                        console.error("Failed to fetch rate:", error);
                        setQuickFetchError("連線錯誤");
                    }
                    setIsFetchingQuickRate(false);
                }
            }
        };
        fetchRate();
    }, [quickExpenseCurrency, trip.budget?.currency, settings.apiKey]);

    // Calculate base amount when inputs change
    useEffect(() => {
        const amount = parseFloat(quickExpenseAmount) || 0;
        const rate = parseFloat(quickExpenseRate) || 1;
        setQuickExpenseBaseAmount(Math.round(amount * rate));
    }, [quickExpenseAmount, quickExpenseRate]);


    // Trip Editing State
    const [isEditMode, setIsEditMode] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(trip.title);
    const [isEditingCover, setIsEditingCover] = useState(false);
    const [newCoverUrl, setNewCoverUrl] = useState('');
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        onDelete?.(trip.id);
    };

    const handleSaveTitle = () => {
        if (editedTitle.trim() && editedTitle !== trip.title) {
            onUpdateTrip?.({ ...trip, title: editedTitle });
        }
        setIsEditingTitle(false);
    };

    const handleCoverChange = async (source: 'upload' | 'url' | 'ai') => {
        if (source === 'upload') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e: any) => {
                const file = e.target?.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = reader.result as string;
                        onUpdateTrip?.({ ...trip, coverImage: base64 });
                        setIsEditingCover(false);
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        } else if (source === 'url') {
            if (newCoverUrl.trim()) {
                onUpdateTrip?.({ ...trip, coverImage: newCoverUrl });
                setNewCoverUrl('');
                setIsEditingCover(false);
            }
        } else if (source === 'ai') {
            setIsGeneratingCover(true);
            try {
                const { generateCoverImage } = await import('../services/gemini');
                const newCover = await generateCoverImage(trip.title);
                onUpdateTrip?.({ ...trip, coverImage: newCover });
                setIsEditingCover(false);
            } catch (error) {
                console.error('Failed to generate cover:', error);
                alert('AI 圖片生成失敗，請稍後再試');
            } finally {
                setIsGeneratingCover(false);
            }
        }
    };

    // Quick Expense Handlers
    const handleOpenQuickExpense = (item: ItineraryItem) => {
        setQuickExpenseItem(item);
        setQuickExpenseAmount('');
        setQuickExpenseNote('');
        setQuickExpenseItems([{ name: '', price: '' }]);
        setIsAddingQuickExpense(true);
    };

    const handleSaveQuickExpense = () => {
        if (!quickExpenseItem || !quickExpenseAmount) return;

        const amount = parseFloat(quickExpenseAmount);
        if (amount <= 0) {
            alert('Amount must be greater than 0');
            return;
        }

        const rate = parseFloat(quickExpenseRate) || 1;
        const baseAmount = Math.round(amount * rate);

        const note = quickExpenseItems
            .filter(i => i.name && i.price)
            .map(i => `${i.name}: ${getCurrencySymbol(quickExpenseCurrency)}${i.price}`)
            .join(', ');

        const finalNote = quickExpenseNote ? (note ? `${quickExpenseNote} (${note})` : quickExpenseNote) : note;

        const newExpense: ExpenseItem = {
            id: Date.now().toString(),
            title: quickExpenseItem.activity,
            amount: baseAmount,
            category: 'Shopping',
            date: trip.startDate ? new Date(trip.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            payer: 'ME',
            paymentMethod: 'Cash',
            note: finalNote,
            originalCurrency: quickExpenseCurrency,
            originalAmount: amount,
            exchangeRate: rate
        };

        const currentExpenses = trip.budget?.expenses || [];
        const updatedTrip = {
            ...trip,
            budget: {
                ...trip.budget,
                total: trip.budget?.total || 0,
                currency: trip.budget?.currency || 'TWD',
                expenses: [newExpense, ...currentExpenses]
            }
        };

        onUpdateTrip?.(updatedTrip);
        setIsAddingQuickExpense(false);
    };

    const updateQuickExpenseItem = (index: number, field: 'name' | 'price', value: string) => {
        const newItems = [...quickExpenseItems];
        newItems[index][field] = value;
        setQuickExpenseItems(newItems);

        if (field === 'price') {
            const total = newItems.reduce((sum, item) => sum + (parseInt(item.price) || 0), 0);
            if (total > 0) setQuickExpenseAmount(total.toString());
        }
    };

    const addQuickExpenseItemRow = () => {
        setQuickExpenseItems([...quickExpenseItems, { name: '', price: '' }]);
    };

    const baseCurrency = trip.budget?.currency || 'TWD';
    const baseSymbol = getCurrencySymbol(baseCurrency);

    return (
        <div className="flex flex-col h-full bg-paper animate-fade-in relative">
            {/* Cover Image & Header */}
            <div className="relative h-64 shrink-0 group">
                <div className="absolute inset-0 bg-gray-200">
                    {trip.coverImage ? (
                        <img
                            src={trip.coverImage}
                            alt={trip.title}
                            className={`w-full h-full object-cover transition-opacity duration-700 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setIsImageLoaded(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-coral/20 to-sand/30">
                            <MapIcon className="w-16 h-16 text-coral/40" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                </div>

                {/* Top Bar */}
                <div className="absolute top-[5px] left-0 right-0 p-4 pt-safe pt-4 flex justify-between items-start z-10">
                    <button onClick={onBack} className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-colors">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditingCover(true)}
                            className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <SparklesIcon className="w-5 h-5" />
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsShareModalOpen(true)}
                                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onOpenAI(trip.id)}
                                data-testid="btn-ai-planner"
                                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onDelete(trip.id)}
                                className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500/50 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Share Modal */}
                    {isShareModalOpen && (
                        <ShareTripModal
                            trip={trip}
                            onClose={() => setIsShareModalOpen(false)}
                            onUpdateTrip={onUpdateTrip}
                        />
                    )}
                </div>

                {/* Title and Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-10">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="bg-white/20 backdrop-blur-md text-white text-3xl font-black px-2 py-1 rounded-lg outline-none w-full"
                                autoFocus
                                onBlur={handleSaveTitle}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                            />
                        </div>
                    ) : (
                        <h1
                            className="text-3xl font-black mb-2 leading-tight drop-shadow-md cursor-pointer hover:text-coral/90 transition-colors flex items-center gap-2"
                            onClick={() => { setIsEditingTitle(true); setEditedTitle(trip.title); }}
                        >
                            {trip.title}
                            <PencilIcon className="w-5 h-5 opacity-50" />
                        </h1>
                    )}
                    <div className="flex items-center gap-3 text-sm font-bold text-gray-200">
                        <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-xs">{trip.days} Days</span>
                        <span>{trip.startDate} - {trip.endDate}</span>
                    </div>
                </div>
            </div>


            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-paper relative rounded-t-3xl -mt-6 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                <div className="p-5 min-h-full">
                    {activeTab === 'ITINERARY' && (
                        <TripItinerary
                            trip={trip}
                            settings={settings}
                            onUpdateTrip={onUpdateTrip}
                            onOpenQuickExpense={handleOpenQuickExpense}
                        />
                    )}
                    {activeTab === 'MAP' && (
                        <>
                            <div className="mb-4 flex gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={mapSearchQuery}
                                        onChange={(e) => setMapSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleMapSearch()}
                                        placeholder={t.search_placeholder}
                                        className="w-full pl-10 pr-4 py-2 rounded-full border border-sand focus:border-coral focus:ring-1 focus:ring-coral outline-none text-sm"
                                    />
                                    <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                </div>
                                <button
                                    onClick={() => handleMapSearch()}
                                    disabled={isSearchingMap || !mapSearchQuery.trim()}
                                    className="bg-ink text-white px-4 py-2 rounded-full text-sm font-bold disabled:opacity-50 flex items-center gap-1"
                                >
                                    {isSearchingMap ? (
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        t.search_location
                                    )}
                                </button>
                            </div>
                            <TripMap
                                trip={trip}
                                settings={settings}
                                searchedLocation={mapSearchResult}
                                onItemClick={(query) => handleMapSearch(query)}
                                mapSearchQuery={mapSearchQuery}
                            />
                        </>
                    )}
                    {activeTab === 'BUDGET' && <TripBudget trip={trip} settings={settings} onUpdateTrip={onUpdateTrip} />}
                    {activeTab === 'BOOKINGS' && <TripBookings trip={trip} settings={settings} onUpdateTrip={onUpdateTrip} />}
                    {activeTab === 'SHOPPING' && (
                        <ShoppingList
                            items={trip.shoppingList || []}
                            onUpdateItems={(items) => onUpdateTrip?.({ ...trip, shoppingList: items })}
                            settings={settings}
                        />
                    )}
                </div>
            </div>

            {/* Floating Tab Bar */}
            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl rounded-full shadow-2xl border border-white/50 p-1.5 flex justify-between items-center z-30">
                {[
                    { id: 'ITINERARY', icon: ListIcon, label: t.itinerary },
                    { id: 'MAP', icon: MapIcon, label: t.map },
                    { id: 'BUDGET', icon: WalletIcon, label: t.budget },
                    { id: 'BOOKINGS', icon: TicketIcon, label: t.bookings },
                    { id: 'SHOPPING', icon: ShoppingBagIcon, label: t.shopping },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all duration-300 ${activeTab === tab.id ? 'bg-ink text-white shadow-lg scale-105' : 'text-gray-400 hover:text-ink hover:bg-gray-100'}`}
                    >
                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'stroke-2' : 'stroke-[1.5]'}`} />
                        {activeTab === tab.id && <span className="text-[10px] font-bold mt-0.5">{tab.label}</span>}
                    </button>
                ))}
            </div>

            {/* Delete Confirmation Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl animate-scale-in text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrashIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-ink mb-2">{t.delete_trip}</h3>
                            <p className="text-gray-500 mb-6">{t.delete_trip_confirm.replace('{title}', trip.title)}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors"
                                >
                                    {t.delete}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Cover Image Edit Modal */}
            {
                isEditingCover && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setIsEditingCover(false)}>
                        <div className="bg-paper w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-ink mb-6 text-center">更換封面圖片</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleCoverChange('upload')}
                                    className="w-full py-4 bg-white border border-sand rounded-xl font-bold text-ink hover:bg-gray-50 flex items-center justify-center gap-2"
                                >
                                    <span>📁</span> 上傳照片
                                </button>
                                <button
                                    onClick={() => handleCoverChange('ai')}
                                    disabled={isGeneratingCover}
                                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isGeneratingCover ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <><span>✨</span> AI 生成</>
                                    )}
                                </button>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-sand"></div></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-paper px-2 text-gray-400">OR</span></div>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={newCoverUrl}
                                        onChange={(e) => setNewCoverUrl(e.target.value)}
                                        placeholder="貼上圖片網址..."
                                        className="flex-1 bg-white p-3 rounded-xl border border-sand outline-none"
                                    />
                                    <button
                                        onClick={() => handleCoverChange('url')}
                                        disabled={!newCoverUrl}
                                        className="bg-ink text-white px-4 rounded-xl font-bold disabled:opacity-50"
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Quick Expense Modal */}
            {
                isAddingQuickExpense && (
                    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setIsAddingQuickExpense(false)}>
                        <div className="bg-paper w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-ink mb-2 text-center">快速記帳</h3>
                            <p className="text-center text-gray-400 text-sm mb-6">{quickExpenseItem?.activity}</p>

                            <div className="space-y-4">
                                {quickExpenseItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            value={item.name}
                                            onChange={(e) => updateQuickExpenseItem(idx, 'name', e.target.value)}
                                            placeholder="品項 (如: 門票)"
                                            className="flex-1 bg-white p-3 rounded-xl font-bold border-none shadow-sm outline-none"
                                            autoFocus={idx === 0}
                                        />
                                        <input
                                            type="number"
                                            value={item.price}
                                            onChange={(e) => updateQuickExpenseItem(idx, 'price', e.target.value)}
                                            placeholder={getCurrencySymbol(quickExpenseCurrency)}
                                            className="w-24 bg-white p-3 rounded-xl font-bold border-none shadow-sm outline-none text-center"
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </div>
                                ))}
                                <button onClick={addQuickExpenseItemRow} className="text-xs font-bold text-coral flex items-center gap-1 mx-auto hover:bg-coral/10 px-3 py-1 rounded-lg transition-colors">
                                    + 新增細項
                                </button>

                                <div className="pt-4 border-t border-sand">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={quickExpenseCurrency}
                                                onChange={(e) => setQuickExpenseCurrency(e.target.value)}
                                                className="bg-transparent font-bold text-gray-400 outline-none text-sm"
                                            >
                                                {COMMON_CURRENCIES.map(c => (
                                                    <option key={c.code} value={c.code}>{c.code}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-ink text-2xl">{getCurrencySymbol(quickExpenseCurrency)}</span>
                                            <input
                                                type="number"
                                                value={quickExpenseAmount}
                                                onChange={(e) => setQuickExpenseAmount(e.target.value)}
                                                className="w-32 bg-transparent text-right text-3xl font-black border-none outline-none p-0"
                                                placeholder="0"
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </div>
                                    </div>

                                    {quickExpenseCurrency !== baseCurrency && (
                                        <div className="mb-4 bg-sand/30 p-3 rounded-xl">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-gray-500">匯率 ({quickExpenseCurrency} → {baseCurrency})</label>
                                                <span className="text-xs font-bold text-coral">
                                                    ≈ {baseSymbol}{quickExpenseBaseAmount.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    value={quickExpenseRate}
                                                    onChange={(e) => setQuickExpenseRate(e.target.value)}
                                                    type="number"
                                                    step="0.01"
                                                    placeholder={isFetchingQuickRate ? "載入匯率中..." : "Exchange Rate"}
                                                    className="w-full bg-white p-3 rounded-xl text-sm font-bold border-none shadow-sm outline-none"
                                                    onFocus={(e) => e.target.select()}
                                                    disabled={isFetchingQuickRate}
                                                />
                                                {isFetchingQuickRate && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <div className="w-4 h-4 border-2 border-coral border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                )}
                                            </div>
                                            {!settings.apiKey && (
                                                <p className="text-[10px] text-red-400 mt-1">
                                                    * 請在設定中輸入 API Key 以啟用自動匯率
                                                </p>
                                            )}
                                            {quickFetchError && (
                                                <p className="text-[10px] text-red-400 mt-1">
                                                    * {quickFetchError}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <textarea
                                        value={quickExpenseNote}
                                        onChange={(e) => setQuickExpenseNote(e.target.value)}
                                        placeholder="備註..."
                                        className="w-full bg-white p-3 rounded-xl text-sm font-medium border-none shadow-sm outline-none min-h-[60px]"
                                    />
                                </div>

                                <button
                                    onClick={handleSaveQuickExpense}
                                    disabled={!quickExpenseAmount}
                                    className="w-full bg-ink text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-ink/30 mt-2 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    入帳
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default TripDetail;
