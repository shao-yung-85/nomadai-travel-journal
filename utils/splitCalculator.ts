import { ExpenseItem } from '../types';

export interface DebtSummary {
    person: string;
    owes: { to: string; amount: number }[];
    owedBy: { from: string; amount: number }[];
    netBalance: number; // positive = owed money, negative = owes money
}

/**
 * 計算平均分帳
 */
export const calculateEvenSplit = (total: number, participants: string[]): { person: string; amount: number }[] => {
    const perPerson = total / participants.length;
    return participants.map(person => ({ person, amount: perPerson }));
};

/**
 * 從所有費用計算誰欠誰多少錢
 */
export const calculateDebts = (expenses: ExpenseItem[], participants: string[]): DebtSummary[] => {
    // 建立balance表：每個人的淨支出（付出 - 應分攤）
    const balances: { [person: string]: number } = {};

    participants.forEach(person => {
        balances[person] = 0;
    });

    expenses.forEach(expense => {
        const { payer, amount, participants: expenseParticipants, splits } = expense;

        if (!expenseParticipants || expenseParticipants.length === 0) return;

        // 付款人先加上總金額
        balances[payer] = (balances[payer] || 0) + amount;

        // 計算每個人應分攤的金額
        if (splits && splits.length > 0) {
            // 使用自訂分帳
            splits.forEach(split => {
                balances[split.person] = (balances[split.person] || 0) - split.amount;
            });
        } else {
            // 平均分攤
            const perPerson = amount / expenseParticipants.length;
            expenseParticipants.forEach(person => {
                balances[person] = (balances[person] || 0) - perPerson;
            });
        }
    });

    // 將balance轉換為debt關係
    const summaries: DebtSummary[] = [];

    participants.forEach(person => {
        const balance = balances[person] || 0;
        summaries.push({
            person,
            owes: [],
            owedBy: [],
            netBalance: balance
        });
    });

    // 簡單的debt settlement算法
    const creditors = summaries.filter(s => s.netBalance > 0.01).sort((a, b) => b.netBalance - a.netBalance);
    const debtors = summaries.filter(s => s.netBalance < -0.01).sort((a, b) => a.netBalance - b.netBalance);

    creditors.forEach(creditor => {
        let remaining = creditor.netBalance;

        debtors.forEach(debtor => {
            if (remaining < 0.01 || debtor.netBalance > -0.01) return;

            const amount = Math.min(remaining, -debtor.netBalance);

            creditor.owedBy.push({ from: debtor.person, amount });
            debtor.owes.push({ to: creditor.person, amount });

            remaining -= amount;
            debtor.netBalance += amount;
        });
    });

    return summaries;
};

/**
 * 生成結算建議文字
 */
export const generateSettlementSuggestions = (summaries: DebtSummary[]): string[] => {
    const suggestions: string[] = [];

    summaries.forEach(summary => {
        summary.owes.forEach(debt => {
            suggestions.push(`${summary.person} 需付 $${Math.round(debt.amount)} 給 ${debt.to}`);
        });
    });

    return suggestions;
};
