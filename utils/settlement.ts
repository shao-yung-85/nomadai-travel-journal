import { ExpenseItem } from '../types';

export interface Debt {
    from: string;
    to: string;
    amount: number;
}

export const calculateDebts = (expenses: ExpenseItem[], users: string[], currentUserId: string): Debt[] => {
    // 1. Calculate net balance for each user
    const balances: { [key: string]: number } = {};

    // Initialize balances
    users.forEach(u => balances[u] = 0);
    // Ensure "ME" and other potential IDs from expenses are initialized if not in users list
    expenses.forEach(e => {
        if (balances[e.payer] === undefined) balances[e.payer] = 0;
        const participants = e.participants && e.participants.length > 0 ? e.participants : users;
        participants.forEach(p => {
            if (balances[p] === undefined) balances[p] = 0;
        });
    });

    expenses.forEach(expense => {
        const amount = expense.amount; // Base currency amount
        const payer = expense.payer;
        const participants = expense.participants && expense.participants.length > 0
            ? expense.participants
            : users.filter(u => u !== 'ME' && u !== currentUserId).length > 0 ? users : [payer]; // Fallback if no participants, assume payer pays for themselves or check logic

        // Simply: One person pays, split equally among participants
        // If payer is also a participant, they "pay themselves", which cancels out in net balance calculation

        // Add amount to payer's credit
        balances[payer] += amount;

        // Deduct amount from participants' balance
        const splitAmount = amount / participants.length;
        participants.forEach(person => {
            balances[person] -= splitAmount;
        });
    });

    // 2. Simplify debts
    // Positive balance = needs to receive money
    // Negative balance = needs to pay money
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];

    Object.entries(balances).forEach(([id, amount]) => {
        // Round to 2 decimal places to avoid floating point errors
        const roundedAmount = Math.round(amount * 100) / 100;
        if (roundedAmount < -0.01) {
            debtors.push({ id, amount: roundedAmount });
        } else if (roundedAmount > 0.01) {
            creditors.push({ id, amount: roundedAmount });
        }
    });

    // Sort by magnitude to optimize matching
    debtors.sort((a, b) => a.amount - b.amount); // Ascending (most negative first)
    creditors.sort((a, b) => b.amount - a.amount); // Descending (most positive first)

    const debts: Debt[] = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        // The amount to settle is the minimum of what debtor owes and what creditor is owed
        const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        // Record debt
        if (amount > 0) {
            debts.push({
                from: debtor.id,
                to: creditor.id,
                amount: Math.round(amount) // Round to whole number for display simplicity in TWD/JPY usually, can adjust
            });
        }

        // Adjust remaining balances
        debtor.amount += amount;
        creditor.amount -= amount;

        // Move indices if settled
        if (Math.abs(debtor.amount) < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return debts;
};

// Helper to get display name
export const getDisplayName = (userId: string, currentUserId: string, userMap?: { [key: string]: string }) => {
    if (!userId) return 'Unknown';
    if (userId === currentUserId || userId === 'ME') return '你 (You)';
    return userMap?.[userId] || (typeof userId === 'string' && userId.length > 4 ? userId.substring(0, 4) + '...' : userId);
};
