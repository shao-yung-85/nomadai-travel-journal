import React, { useState } from 'react';
import { AppSettings, ShoppingItem } from '../types';
import { translations } from '../utils/translations';
import { TrashIcon, PlusIcon, ShoppingBagIcon } from './Icons';

interface ShoppingListProps {
    items: ShoppingItem[];
    onUpdateItems: (items: ShoppingItem[]) => void;
    settings: AppSettings;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ items, onUpdateItems, settings }) => {
    const t = translations[settings.language] || translations['zh-TW'];
    const [newItemName, setNewItemName] = useState('');
    const [newItemNotes, setNewItemNotes] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddItem = () => {
        if (!newItemName.trim()) return;

        const newItem: ShoppingItem = {
            id: Date.now().toString(),
            item: newItemName,
            bought: false,
            notes: newItemNotes
        };

        const updatedList = [...items, newItem];
        onUpdateItems(updatedList);

        setNewItemName('');
        setNewItemNotes('');
        setIsAdding(false);
    };

    const handleToggleItem = (itemId: string) => {
        const updatedList = items.map(item =>
            item.id === itemId ? { ...item, bought: !item.bought } : item
        );
        onUpdateItems(updatedList);
    };

    const handleDeleteItem = (itemId: string) => {
        if (confirm(t.delete_trip_confirm.replace('{title}', t.shopping_list))) {
            const updatedList = items.filter(item => item.id !== itemId);
            onUpdateItems(updatedList);
        }
    };

    return (
        <div className="pb-40">
            {/* Header Card */}
            <div className="bg-white p-6 rounded-3xl shadow-soft text-center mt-2 border border-sand relative overflow-hidden mb-6">
                <div className="absolute top-0 left-0 w-full h-2 bg-coral"></div>
                <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">{t.shopping_list}</h3>
                <div className="text-5xl font-black text-ink mb-2 tracking-tight">
                    {items?.filter(i => i.bought).length || 0}
                    <span className="text-2xl text-gray-300 mx-2">/</span>
                    <span className="text-3xl text-gray-400">{items?.length || 0}</span>
                </div>
            </div>

            {items?.length > 0 ? (
                <div className="space-y-3">
                    {items?.map(item => (
                        <div key={item.id} className={`bg-white p-4 rounded-2xl border ${item.bought ? 'border-green-200 bg-green-50/30' : 'border-sand'} shadow-card flex items-center justify-between group transition-all`}>
                            <div className="flex items-center gap-4 flex-1" onClick={() => handleToggleItem(item.id)}>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${item.bought ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-coral'}`}>
                                    {item.bought && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <div>
                                    <div className={`font-bold text-lg ${item.bought ? 'text-gray-400 line-through' : 'text-ink'}`}>{item.item}</div>
                                    {item.notes && <div className="text-xs text-gray-400 font-medium mt-0.5">{item.notes}</div>}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-sand/30 rounded-full flex items-center justify-center text-gray-400">
                        <ShoppingBagIcon className="w-8 h-8" />
                    </div>
                    <p className="text-gray-400 font-medium">{t.no_itinerary}<br /><span className="text-xs">{t.click_add}</span></p>
                </div>
            )}

            {/* Add Item Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setIsAdding(false)}>
                    <div className="bg-paper w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-ink mb-6 text-center">{t.add_activity}</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.activity_name}</label>
                                <input
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder={t.shopping_list}
                                    className="w-full bg-white p-4 rounded-xl text-base font-bold border-none shadow-sm outline-none placeholder:font-normal"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.notes}</label>
                                <input
                                    value={newItemNotes}
                                    onChange={(e) => setNewItemNotes(e.target.value)}
                                    placeholder="..."
                                    className="w-full bg-white p-4 rounded-xl text-base font-medium border-none shadow-sm outline-none placeholder:font-normal"
                                />
                            </div>
                            <button
                                onClick={handleAddItem}
                                disabled={!newItemName.trim()}
                                className="w-full bg-coral text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-coral/30 mt-4 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {t.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Add Button */}
            <button
                onClick={() => setIsAdding(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-coral text-white rounded-full shadow-xl shadow-coral/40 flex items-center justify-center z-30 hover:bg-coralDark active:scale-90 transition-all"
            >
                <PlusIcon className="w-8 h-8 stroke-[2]" />
            </button>
        </div>
    );
};

export default ShoppingList;
