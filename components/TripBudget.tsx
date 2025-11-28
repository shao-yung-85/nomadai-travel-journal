import React, { useState } from 'react';
import { Trip, ExpenseItem, AppSettings } from '../types';
import { translations } from '../utils/translations';
import { TrashIcon } from './Icons';

interface TripBudgetProps {
    trip: Trip;
    settings: AppSettings;
    onUpdateTrip?: (trip: Trip) => void;
}

const TripBudget: React.FC<TripBudgetProps> = ({ trip, settings, onUpdateTrip }) => {
    const t = translations[settings.language] || translations['zh-TW'];

    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [newExpenseName, setNewExpenseName] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');
    const [newExpensePayer, setNewExpensePayer] = useState('');
    const [newExpenseMethod, setNewExpenseMethod] = useState('Cash');

    const handleAddExpense = () => {
        if (!newExpenseName || !newExpenseAmount) return;
        const newItem: ExpenseItem = {
            id: Date.now().toString(),
            title: newExpenseName,
            amount: parseInt(newExpenseAmount),
            category: 'Other',
            date: new Date().toISOString().split('T')[0],
            payer: newExpensePayer || 'ME',
            paymentMethod: newExpenseMethod
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

    const totalSpent = (trip.budget?.expenses || []).reduce((sum, item) => sum + item.amount, 0);
    const budgetTotal = trip.budget?.total || 0;
    const progress = budgetTotal > 0 ? Math.min((totalSpent / budgetTotal) * 100, 100) : 0;

    return (
        <div className="pb-32">
            {/* Budget Summary Card */}
            <div className="bg-ink text-white p-6 rounded-3xl shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="relative z-10">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">{t.budget_total}</p>
                    <h2 className="text-4xl font-black mb-6">
                        <span className="text-2xl mr-1">¥</span>{budgetTotal.toLocaleString()}
                    </h2>

                    <div className="mb-2 flex justify-between text-sm font-bold">
                        <span className="text-gray-300">{t.budget_spent}</span>
                        <span>¥{totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                        <div className={`h-full rounded-full ${progress > 90 ? 'bg-red-500' : 'bg-coral'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-medium">
                        <span>{progress.toFixed(1)}%</span>
                        <span>{t.budget_remaining}: ¥{(budgetTotal - totalSpent).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Expense List */}
            <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-2">{t.expense_list}</h4>
                {trip.budget?.expenses?.map((expense) => (
                    <div key={expense.id} className="bg-white p-4 rounded-2xl shadow-sm border border-sand flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${expense.payer === 'ME' ? 'bg-coral/10 text-coral' : 'bg-gray-100 text-gray-500'}`}>
                                {expense.payer === 'ME' ? '我' : '他'}
                            </div>
                            <div>
                                <h4 className="font-bold text-ink">{expense.title}</h4>
                                <p className="text-xs text-gray-400">{expense.date} • {expense.paymentMethod}</p>
                                {expense.note && <p className="text-xs text-gray-500 mt-0.5">{expense.note}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-ink text-lg">¥{expense.amount.toLocaleString()}</span>
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

            {/* Add Expense Overlay Form */}
            {isAddingExpense && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setIsAddingExpense(false)}>
                    <div className="bg-paper w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-slide-up relative" onClick={e => e.stopPropagation()}>
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
                                <div className="flex items-center bg-white rounded-xl border-none shadow-sm px-4">
                                    <span className="text-gray-400 font-bold mr-2">¥</span>
                                    <input
                                        value={newExpenseAmount}
                                        onChange={(e) => setNewExpenseAmount(e.target.value)}
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-transparent py-4 text-xl font-bold border-none outline-none placeholder:font-normal"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex bg-white rounded-xl p-1 shadow-sm">
                                    <button
                                        onClick={() => setNewExpensePayer('ME')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newExpensePayer === 'ME' || newExpensePayer === '' ? 'bg-ink text-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                                    >
                                        {t.payer_me}
                                    </button>
                                    <button
                                        onClick={() => setNewExpensePayer('OTHER')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newExpensePayer === 'OTHER' ? 'bg-ink text-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                                    >
                                        {t.payer_other}
                                    </button>
                                </div>
                                <div className="flex bg-white rounded-xl p-1 shadow-sm">
                                    <button
                                        onClick={() => setNewExpenseMethod('Cash')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newExpenseMethod === 'Cash' ? 'bg-ink text-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                                    >
                                        {t.payment_cash}
                                    </button>
                                    <button
                                        onClick={() => setNewExpenseMethod('Card')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newExpenseMethod === 'Card' ? 'bg-ink text-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                                    >
                                        {t.payment_card}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <select
                                    className="w-full bg-white p-3 rounded-xl font-bold text-ink border-none shadow-sm outline-none h-[48px] text-center"
                                >
                                    <option value="Individual">{t.split_individual}</option>
                                    <option value="Shared">{t.split_shared}</option>
                                </select>
                            </div>

                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={handleAddExpense}
                                    disabled={!newExpenseName || !newExpenseAmount}
                                    className="w-full bg-coral text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-coral/30 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    + 記下一筆
                                </button>
                                <button
                                    onClick={() => setIsAddingExpense(false)}
                                    className="w-full py-3 bg-transparent text-gray-400 font-bold hover:text-gray-600 transition-colors"
                                >
                                    取消
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
