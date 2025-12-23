import React, { useState, useEffect, useMemo } from 'react';
import { Trip, ExpenseItem, AppSettings } from '../types';
import { translations } from '../utils/translations';
import { TrashIcon, UserPlusIcon, UsersIcon, CurrencyDollarIcon } from './Icons';
import { COMMON_CURRENCIES, getCurrencySymbol } from '../utils/currencies';
import { getExchangeRate } from '../services/gemini';
import { calculateDebts, getDisplayName } from '../utils/settlement';

interface TripBudgetProps {
    trip: Trip;
    settings: AppSettings;
    onUpdateTrip?: (trip: Trip) => void;
    currentUserId: string; // Add this prop
}

const TripBudget: React.FC<TripBudgetProps> = ({ trip, settings, onUpdateTrip, currentUserId }) => {
    const t = translations[settings.language] || translations['zh-TW'];
    const [activeTab, setActiveTab] = useState<'EXPENSES' | 'SETTLEMENT'>('EXPENSES');

    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [newExpenseName, setNewExpenseName] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');

    // Payer & Split State
    const [newExpensePayer, setNewExpensePayer] = useState(currentUserId);
    const [participants, setParticipants] = useState<string[]>([]);

    const [newExpenseMethod, setNewExpenseMethod] = useState('Cash');

    // Multi-currency state
    const [selectedCurrency, setSelectedCurrency] = useState(trip.budget?.currency || 'TWD');
    const [exchangeRate, setExchangeRate] = useState('');
    const [calculatedBaseAmount, setCalculatedBaseAmount] = useState(0);

    const [isFetchingRate, setIsFetchingRate] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Budget Editing State
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [tempBudgetTotal, setTempBudgetTotal] = useState('');

    // Users list (Mock logic: in real app, fetch users from DB or use trip.collaborators)
    // Assuming trip.userIds is populated properly in Phase 2
    const tripUsers = useMemo(() => {
        const users = [...(trip.userIds || [])];
        if (!users.includes(currentUserId)) {
            users.push(currentUserId);
        }
        return Array.from(new Set(users));
    }, [trip.userIds, currentUserId]);

    const handleSaveBudget = () => {
        const newTotal = parseInt(tempBudgetTotal);
        if (!isNaN(newTotal) && newTotal >= 0) {
            const updatedTrip = {
                ...trip,
                budget: {
                    ...trip.budget,
                    total: newTotal,
                    currency: trip.budget?.currency || 'TWD',
                    expenses: trip.budget?.expenses || []
                }
            };
            onUpdateTrip?.(updatedTrip);
        }
        setIsEditingBudget(false);
    };

    // Reset state when modal opens
    useEffect(() => {
        if (isAddingExpense) {
            setSelectedCurrency(trip.budget?.currency || 'TWD');
            setExchangeRate('');
            setNewExpensePayer(currentUserId);
            setParticipants(tripUsers); // Default: split among all
        }
    }, [isAddingExpense, trip.budget?.currency, currentUserId, trip.userIds]);

    // Auto-fetch exchange rate
    useEffect(() => {
        const fetchRate = async () => {
            const baseCurrency = trip.budget?.currency || 'TWD';
            setFetchError(null); // Reset error
            if (selectedCurrency !== baseCurrency) {
                const hasApiKey = settings.apiKey || import.meta.env.VITE_API_KEY || (typeof window !== 'undefined' && localStorage.getItem('nomad_user_api_key'));
                if (hasApiKey) {
                    setIsFetchingRate(true);
                    try {
                        const rate = await getExchangeRate(selectedCurrency, baseCurrency);
                        if (rate) {
                            setExchangeRate(rate);
                        } else {
                            setFetchError("無法取得匯率 (API Key 可能無效)");
                        }
                    } catch (e) {
                        console.error(e);
                        setFetchError("連線錯誤");
                    }
                    setIsFetchingRate(false);
                }
            }
        };
        fetchRate();
    }, [selectedCurrency, trip.budget?.currency, settings.apiKey]);

    // Calculate base amount when inputs change
    useEffect(() => {
        const amount = parseFloat(newExpenseAmount) || 0;
        const rate = parseFloat(exchangeRate) || 1;
        setCalculatedBaseAmount(Math.round(amount * rate));
    }, [newExpenseAmount, exchangeRate]);

    const handleAddExpense = () => {
        if (!newExpenseName || !newExpenseAmount) return;

        const amount = parseFloat(newExpenseAmount);
        if (amount <= 0) {
            alert(t.amount_invalid || 'Amount must be greater than 0');
            return;
        }

        const rate = parseFloat(exchangeRate) || 1;
        const baseAmount = Math.round(amount * rate);

        const newItem: ExpenseItem = {
            id: Date.now().toString(),
            title: newExpenseName,
            amount: baseAmount, // Store in base currency for totaling
            category: 'Other',
            date: new Date().toISOString().split('T')[0],
            payer: newExpensePayer,
            paymentMethod: newExpenseMethod as any,
            participants: participants,
            originalCurrency: selectedCurrency,
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
                expenses: [newItem, ...currentExpenses]
            }
        };
        onUpdateTrip?.(updatedTrip);
        setIsAddingExpense(false);
        setNewExpenseName('');
        setNewExpenseAmount('');
    };

    const handleDeleteExpense = (expenseId: string) => {
        if (confirm(t.delete_trip_confirm.replace('{title}', t.expense_item))) {
            const currentExpenses = trip.budget?.expenses || [];
            const updatedExpenses = currentExpenses.filter(ex => ex.id !== expenseId);
            const updatedTrip = {
                ...trip,
                budget: {
                    ...trip.budget,
                    total: trip.budget?.total || 0,
                    currency: trip.budget?.currency || 'TWD',
                    expenses: updatedExpenses
                }
            };
            onUpdateTrip?.(updatedTrip);
        }
    };

    const toggleParticipant = (userId: string) => {
        if (participants.includes(userId)) {
            // Don't allow empty participants list, at least one person must split
            if (participants.length > 1) {
                setParticipants(participants.filter(id => id !== userId));
            }
        } else {
            setParticipants([...participants, userId]);
        }
    };

    const totalSpent = (trip.budget?.expenses || []).reduce((sum, item) => sum + item.amount, 0);
    const budgetTotal = trip.budget?.total || 0;
    const progress = budgetTotal > 0 ? Math.min((totalSpent / budgetTotal) * 100, 100) : 0;
    const baseCurrency = trip.budget?.currency || 'TWD';
    const baseSymbol = getCurrencySymbol(baseCurrency);

    // Calculate Settlements
    const debts = calculateDebts(trip.budget?.expenses || [], tripUsers, currentUserId);

    return (
        <div className="pb-32">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-white p-1 rounded-2xl border border-sand">
                <button
                    onClick={() => setActiveTab('EXPENSES')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'EXPENSES' ? 'bg-ink text-white shadow-md' : 'text-gray-400 hover:bg-sand/30'}`}
                >
                    <CurrencyDollarIcon className="w-4 h-4" />
                    {t.expense_list || "消費列表"}
                </button>
                <button
                    onClick={() => setActiveTab('SETTLEMENT')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'SETTLEMENT' ? 'bg-ink text-white shadow-md' : 'text-gray-400 hover:bg-sand/30'}`}
                >
                    <UsersIcon className="w-4 h-4" />
                    {t.settlement || "分帳結算"}
                </button>
            </div>

            {/* Budget Summary Card (Only on Expenses Tab) */}
            {activeTab === 'EXPENSES' && (
                <div className="bg-ink text-white p-6 rounded-3xl shadow-xl mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div className="relative z-10">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">{t.budget_total}</p>
                        <div className="flex items-center gap-2 mb-6 group">
                            {isEditingBudget ? (
                                <div className="flex items-center">
                                    <span className="text-2xl mr-1 font-black">{baseSymbol}</span>
                                    <input
                                        type="number"
                                        value={tempBudgetTotal}
                                        onChange={(e) => setTempBudgetTotal(e.target.value)}
                                        onBlur={handleSaveBudget}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveBudget()}
                                        className="bg-transparent text-4xl font-black text-white border-b-2 border-white/20 outline-none w-48"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <h2
                                        className="text-4xl font-black cursor-pointer hover:opacity-80 transition-opacity flex items-center"
                                        onClick={() => {
                                            setTempBudgetTotal(budgetTotal.toString());
                                            setIsEditingBudget(true);
                                        }}
                                    >
                                        <span className="text-2xl mr-1">{baseSymbol}</span>{budgetTotal.toLocaleString()}
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setTempBudgetTotal(budgetTotal.toString());
                                            setIsEditingBudget(true);
                                        }}
                                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mb-2 flex justify-between text-sm font-bold">
                            <span className="text-gray-300">{t.budget_spent}</span>
                            <span>{baseSymbol}{totalSpent.toLocaleString()}</span>
                        </div>
                        <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                            <div className={`h-full rounded-full ${progress > 90 ? 'bg-red-500' : 'bg-coral'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 font-medium">
                            <span>{progress.toFixed(1)}%</span>
                            <span>目前累積花費: {baseSymbol}{totalSpent.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Expenses Tab Content */}
            {activeTab === 'EXPENSES' && (
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-2">{t.expense_list}</h4>
                    {trip.budget?.expenses?.map((expense) => (
                        <div key={expense.id} className="bg-white p-4 rounded-2xl shadow-sm border border-sand flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 ${expense.payer === currentUserId ? 'bg-coral/10 text-coral border-coral' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    {getDisplayName(expense.payer, currentUserId).slice(0, 1)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-ink">{expense.title}</h4>
                                    <p className="text-xs text-gray-400">
                                        {expense.date} • {expense.paymentMethod} •
                                        {expense.participants?.length === tripUsers.length ? ' Everyone' : ` ${expense.participants?.length} ppl`}
                                    </p>
                                    {expense.originalCurrency && expense.originalCurrency !== baseCurrency && (
                                        <p className="text-xs text-coral font-medium mt-0.5">
                                            {getCurrencySymbol(expense.originalCurrency)}{expense.originalAmount?.toLocaleString()}
                                            <span className="text-gray-400 mx-1">≈</span>
                                            {baseSymbol}{expense.amount.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-ink text-lg">{baseSymbol}{expense.amount.toLocaleString()}</span>
                                <button
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {(!trip.budget?.expenses || trip.budget.expenses.length === 0) && (
                        <div className="text-center py-10 text-gray-400 text-sm font-medium">
                            {t.no_expenses}
                        </div>
                    )}
                </div>
            )}

            {/* Settlement Tab Content */}
            {activeTab === 'SETTLEMENT' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-sand">
                        <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                            <UsersIcon className="w-5 h-5 text-coral" />
                            結算建議
                        </h3>
                        {debts.length > 0 ? (
                            <div className="space-y-4">
                                {debts.map((debt, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-sand/20 rounded-xl relative overflow-hidden">
                                        {/* Arrow visual */}
                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
                                            <svg className="w-24 h-24 text-ink" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                                        </div>

                                        <div className="flex flex-col items-start z-10">
                                            <span className="text-xs font-bold text-gray-400 uppercase">FROM</span>
                                            <span className="font-bold text-ink text-lg">{getDisplayName(debt.from, currentUserId)}</span>
                                        </div>

                                        <div className="flex flex-col items-center z-10">
                                            <span className="text-xs font-bold text-coral bg-coral/10 px-2 py-1 rounded-full mb-1">PAY</span>
                                            <span className="font-black text-2xl text-ink">{baseSymbol}{debt.amount.toLocaleString()}</span>
                                        </div>

                                        <div className="flex flex-col items-end z-10">
                                            <span className="text-xs font-bold text-gray-400 uppercase">TO</span>
                                            <span className="font-bold text-ink text-lg">{getDisplayName(debt.to, currentUserId)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-400 text-sm font-medium">
                                <p>🎉 目前沒有需要結算的債務！</p>
                                <p className="text-xs opacity-70 mt-1">大家都很守規矩，或者還沒開始花錢。</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Expense Overlay Form */}
            {isAddingExpense && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setIsAddingExpense(false)}>
                    <div className="bg-paper w-full max-w-md rounded-3xl shadow-2xl p-6 animate-slide-up relative max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setIsAddingExpense(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h3 className="text-xl font-bold text-ink mb-6 text-center">{t.add_expense}</h3>
                        <div className="space-y-4">
                            {/* 1. Item Name and Amount */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.expense_item}</label>
                                <input
                                    value={newExpenseName}
                                    onChange={(e) => setNewExpenseName(e.target.value)}
                                    placeholder="例如: 章魚燒"
                                    className="w-full bg-white p-4 rounded-xl text-base font-bold border-none shadow-sm outline-none placeholder:font-normal"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.amount}</label>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedCurrency}
                                        onChange={(e) => setSelectedCurrency(e.target.value)}
                                        className="bg-white rounded-xl border-none shadow-sm px-3 font-bold text-ink outline-none"
                                    >
                                        {COMMON_CURRENCIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.code}</option>
                                        ))}
                                    </select>
                                    <div className="flex-1 flex items-center bg-white rounded-xl border-none shadow-sm px-4">
                                        <span className="text-gray-400 font-bold mr-2">{getCurrencySymbol(selectedCurrency)}</span>
                                        <input
                                            value={newExpenseAmount}
                                            onChange={(e) => setNewExpenseAmount(e.target.value)}
                                            type="number"
                                            placeholder="0"
                                            className="w-full bg-transparent py-4 text-xl font-bold border-none outline-none placeholder:font-normal"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Exchange Rate Logic (Same as before) */}
                            {selectedCurrency !== baseCurrency && (
                                <div className="space-y-1 bg-sand/30 p-3 rounded-xl">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-gray-500">匯率 ({selectedCurrency} → {baseCurrency})</label>
                                        <span className="text-xs font-bold text-coral">
                                            ≈ {baseSymbol}{calculatedBaseAmount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            value={exchangeRate}
                                            onChange={(e) => setExchangeRate(e.target.value)}
                                            type="number"
                                            step="0.01"
                                            placeholder={isFetchingRate ? "載入匯率中..." : "Exchange Rate"}
                                            className="w-full bg-white p-3 rounded-xl text-sm font-bold border-none shadow-sm outline-none"
                                            disabled={isFetchingRate}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 2. Payer Selection */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">誰付的錢？ (Payer)</label>
                                <div className="flex flex-wrap gap-2">
                                    {tripUsers.map(uid => (
                                        <button
                                            key={uid}
                                            onClick={() => setNewExpensePayer(uid)}
                                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all border-2 ${newExpensePayer === uid
                                                ? 'bg-ink text-white border-ink'
                                                : 'bg-white text-gray-400 border-transparent hover:border-gray-200'
                                                }`}
                                        >
                                            {getDisplayName(uid, currentUserId)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Split Participants */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">分給誰？ (Split)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {tripUsers.map(uid => (
                                        <button
                                            key={uid}
                                            onClick={() => toggleParticipant(uid)}
                                            className={`p-3 rounded-xl flex items-center gap-2 transition-all border-2 ${participants.includes(uid)
                                                ? 'bg-coral/5 border-coral text-ink'
                                                : 'bg-white border-transparent grayscale opacity-60 hover:opacity-100'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${participants.includes(uid) ? 'bg-coral text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                {uid === currentUserId ? 'Me' : uid.slice(0, 1)}
                                            </div>
                                            <span className="text-sm font-bold truncate">{getDisplayName(uid, currentUserId)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 pt-4">
                                <button
                                    onClick={handleAddExpense}
                                    disabled={!newExpenseName || !newExpenseAmount}
                                    className="w-full bg-coral text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-coral/30 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    + 記下一筆
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Expense FAB */}
            <button
                onClick={() => setIsAddingExpense(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-ink text-white rounded-full shadow-xl shadow-ink/40 flex items-center justify-center z-30 hover:scale-105 active:scale-95 transition-all"
            >
                <span className="text-3xl font-light mb-1">+</span>
            </button>
        </div>
    );
};

export default TripBudget;

