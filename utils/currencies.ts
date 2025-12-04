export interface Currency {
    code: string;
    symbol: string;
    name: string;
}

export const COMMON_CURRENCIES: Currency[] = [
    { code: 'TWD', symbol: 'NT$', name: '新台幣' },
    { code: 'JPY', symbol: '¥', name: '日圓' },
    { code: 'USD', symbol: '$', name: '美元' },
    { code: 'EUR', symbol: '€', name: '歐元' },
    { code: 'KRW', symbol: '₩', name: '韓元' },
    { code: 'CNY', symbol: '¥', name: '人民幣' },
    { code: 'HKD', symbol: 'HK$', name: '港幣' },
    { code: 'GBP', symbol: '£', name: '英鎊' },
    { code: 'THB', symbol: '฿', name: '泰銖' },
    { code: 'SGD', symbol: 'S$', name: '新加坡幣' },
];

export const getCurrencySymbol = (code: string): string => {
    const currency = COMMON_CURRENCIES.find(c => c.code === code);
    return currency ? currency.symbol : code;
};
