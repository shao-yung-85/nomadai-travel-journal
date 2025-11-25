/**
 * 匯率轉換服務
 * 使用 exchangerate-api.com 提供的免費API
 */

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/TWD';

interface ExchangeRates {
    base: string;
    rates: { [key: string]: number };
}

let cachedRates: ExchangeRates | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * 取得匯率（帶快取）
 */
export const getExchangeRates = async (): Promise<ExchangeRates> => {
    const now = Date.now();

    // 使用快取if還有效
    if (cachedRates && (now - cacheTime) < CACHE_DURATION) {
        return cachedRates;
    }

    try {
        const response = await fetch(EXCHANGE_RATE_API);
        const data = await response.json();
        cachedRates = data;
        cacheTime = now;
        return data;
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // 如果有舊快取，繼續使用
        if (cachedRates) return cachedRates;
        // 否則返回預設匯率
        return {
            base: 'TWD',
            rates: {
                TWD: 1,
                JPY: 0.22,
                KRW: 0.043,
                USD: 31.5,
                EUR: 34.2
            }
        };
    }
};

/**
 * 轉換幣別為台幣
 */
export const convertToTWD = async (amount: number, fromCurrency: string): Promise<number> => {
    if (fromCurrency === 'TWD') return amount;

    const rates = await getExchangeRates();
    const rate = rates.rates[fromCurrency];

    if (!rate) {
        console.warn(`Unknown currency: ${fromCurrency}`);
        return amount;
    }

    // TWD to foreign = 1 / rate
    // foreign to TWD = amount * (1/rate)
    return amount / rate;
};

/**
 * 格式化金額為字串
 */
export const formatCurrency = (amount: number, currency: string = 'TWD'): string => {
    const formatter = new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: currency === 'TWD' ? 'TWD' : currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    return formatter.format(amount);
};
