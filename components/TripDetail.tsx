import React, { useState, useRef, useEffect } from 'react';
import { Trip, ExpenseItem, ItineraryItem, AppSettings } from '../types';
import { ChevronLeftIcon, MapIcon, WalletIcon, TicketIcon, TrashIcon, ListIcon, PencilIcon, ShoppingBagIcon, SparklesIcon } from './Icons';
import ShoppingList from './ShoppingList';
import TripItinerary from './TripItinerary';
import TripBudget from './TripBudget';
import TripBookings from './TripBookings';
import TripMap from './TripMap';
import { translations } from '../utils/translations';

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
    const [mapSelectedItemId, setMapSelectedItemId] = useState<string | null>(null);

    // ... (existing handlers)

    const handleItineraryItemClick = (item: ItineraryItem) => {
        setMapSelectedItemId(item.id);
        setActiveTab('MAP');
    };

    return (
        <div className="flex flex-col h-full bg-paper animate-fade-in relative">
            {/* ... (header content) */}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-paper relative rounded-t-3xl -mt-6 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                <div className="p-5 min-h-full">
                    {activeTab === 'ITINERARY' && (
                        <TripItinerary
                            trip={trip}
                            settings={settings}
                            onUpdateTrip={onUpdateTrip}
                            onOpenQuickExpense={handleOpenQuickExpense}
                            onItemClick={handleItineraryItemClick}
                        />
                    )}
                    {activeTab === 'MAP' && (
                        <TripMap
                            trip={trip}
                            settings={settings}
                            initialSelectedItemId={mapSelectedItemId}
                        />
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
            {isDeleteModalOpen && (
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
            )}

            {/* Cover Image Edit Modal */}
            {isEditingCover && (
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
            )}

            {/* Quick Expense Modal */}
            {isAddingQuickExpense && (
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
                                        placeholder="¥"
                                        className="w-24 bg-white p-3 rounded-xl font-bold border-none shadow-sm outline-none text-center"
                                    />
                                </div>
                            ))}
                            <button onClick={addQuickExpenseItemRow} className="text-xs font-bold text-coral flex items-center gap-1 mx-auto hover:bg-coral/10 px-3 py-1 rounded-lg transition-colors">
                                + 新增細項
                            </button>

                            <div className="pt-4 border-t border-sand">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold text-gray-400">總金額</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-ink text-2xl">¥</span>
                                        <input
                                            type="number"
                                            value={quickExpenseAmount}
                                            onChange={(e) => setQuickExpenseAmount(e.target.value)}
                                            className="w-32 bg-transparent text-right text-3xl font-black border-none outline-none p-0"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
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
            )}
        </div>
    );
};

export default TripDetail;
