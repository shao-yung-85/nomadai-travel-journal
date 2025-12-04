
import React, { useState, useEffect } from 'react';
import {
    CurrencyDollarIcon,
    PassportIcon,
    LightBulbIcon,
    ToiletIcon,
    GlobeAltIcon,
    ClockIcon,
    ChevronLeftIcon,
    CreditCardIcon,
    FirstAidIcon,
    PlusIcon,
    TrashIcon,
    SquaresPlusIcon,
    TranslateIcon,
    SparklesIcon
} from './Icons';
import { getVisaRequirements, getCulturalEtiquette, getEmergencyInfo, getCreditCardAdvice, getTranslation } from '../services/gemini';
import { convertToTWD, formatCurrency } from '../services/currency';
import { Expense, TimeCapsule, Trip, AppSettings } from '../types';
import { translations } from '../utils/translations';
import VoiceTranslator from './VoiceTranslator';

interface ToolsProps {
    onBack: () => void;
    trips?: Trip[];
    settings: AppSettings;
    onMagicEditor: () => void;
    onOpenSettings: () => void;
}

type ToolView = 'MENU' | 'EXPENSE' | 'VISA' | 'CULTURE' | 'RESTROOM' | 'SCRATCH_MAP' | 'TIME_CAPSULE' | 'EMERGENCY' | 'CARD_ADVICE' | 'TRANSLATION' | 'CURRENCY';

// --- Sub-Components ---

const ExpenseSplitter = ({ onBack }: { onBack: () => void }) => {
    return (
        <div className="flex flex-col h-full bg-paper">
            <div className="bg-paper p-4 flex items-center gap-2 sticky top-0 z-10">
                <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
                <h3 className="font-bold text-lg text-ink">分帳工具</h3>
            </div>
            <div className="p-5 flex items-center justify-center h-full text-gray-400 text-center font-medium">
                <p>請使用行程詳情中的「預算」分頁來記錄支出。</p>
            </div>
        </div>
    )
}

const VisaCheck = ({ onBack, t, language, onOpenSettings }: { onBack: () => void, t: any, language: string, onOpenSettings: () => void }) => {
    const [passport, setPassport] = useState('Taiwan (ROC)');
    const [dest, setDest] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const check = async () => {
        if (!dest) return;
        setLoading(true);
        try {
            const info = await getVisaRequirements(passport, dest, language);
            setResult(info || "錯誤");
        } catch (e: any) {
            setResult(e.message || "發生錯誤");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-paper">
            <div className="bg-paper p-4 flex items-center gap-2 sticky top-0 z-10">
                <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
                <h3 className="font-bold text-lg text-ink">{t.tool_visa}</h3>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1 pb-32">
                <div className="bg-white p-6 rounded-3xl shadow-card space-y-5 border border-sand">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">護照持有國</label>
                        <select value={passport} onChange={e => setPassport(e.target.value)} className="w-full mt-2 p-3 bg-paper rounded-xl text-ink font-medium border-none outline-none">
                            <option value="Taiwan (ROC)">台灣 (Taiwan)</option>
                            <option value="Japan">日本 (Japan)</option>
                            <option value="USA">美國 (USA)</option>
                            <option value="Hong Kong">香港 (Hong Kong)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">目的地</label>
                        <input value={dest} onChange={e => setDest(e.target.value)} placeholder="例如：越南、日本..." className="w-full mt-2 p-3 bg-paper rounded-xl text-ink font-medium border-none outline-none" />
                    </div>
                    <button onClick={check} disabled={loading || !dest} className="w-full bg-coral text-white py-3.5 rounded-xl font-bold shadow-lg shadow-coral/30 disabled:opacity-50">
                        {loading ? t.loading : t.confirm}
                    </button>
                </div>
                {result && (
                    <div className="bg-white p-6 rounded-3xl shadow-card border border-sand animate-fade-in">
                        <div className={`prose prose-sm max-w-none leading-relaxed whitespace-pre-line ${result?.includes('API Key') ? 'text-red-600' : 'text-ink'}`}>
                            {result}
                            {result?.includes('API Key') && (
                                <button
                                    onClick={onOpenSettings}
                                    className="mt-4 w-full py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
                                >
                                    前往設定更新 API Key
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const CultureGuide = ({ onBack, t, language, onOpenSettings }: { onBack: () => void, t: any, language: string, onOpenSettings: () => void }) => {
    const [location, setLocation] = useState('');
    const [advice, setAdvice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const getAdvice = async () => {
        setLoading(true);
        try {
            const loc = location || "Kyoto, Japan";
            const info = await getCulturalEtiquette(loc, language);
            setAdvice(info || "錯誤");
        } catch (e: any) {
            setAdvice(e.message || "發生錯誤");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-paper">
            <div className="bg-paper p-4 flex items-center gap-2 sticky top-0 z-10">
                <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
                <h3 className="font-bold text-lg text-ink">{t.tool_culture}</h3>
            </div>
            <div className="p-5 flex-1 overflow-y-auto pb-32">
                <div className="mb-4">
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="地點 (例如：曼谷、巴黎)..." className="w-full p-4 bg-white rounded-2xl shadow-sm border border-sand font-medium text-ink outline-none" />
                </div>
                <button onClick={getAdvice} disabled={loading} className="w-full bg-orange-400 text-white px-4 py-3.5 rounded-2xl font-bold text-sm shadow-md mb-6">
                    {loading ? t.loading : t.confirm}
                </button>

                {advice && (
                    <div className="bg-white p-6 rounded-3xl shadow-card border border-sand animate-fade-in">
                        <div className={`prose prose-sm whitespace-pre-line leading-relaxed ${advice?.includes('API Key') ? 'text-red-600' : 'text-ink'}`}>
                            {advice}
                            {advice?.includes('API Key') && (
                                <button
                                    onClick={onOpenSettings}
                                    className="mt-4 w-full py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
                                >
                                    前往設定更新 API Key
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const RestroomFinder = ({ onBack, t }: { onBack: () => void, t: any }) => {
    return (
        <div className="flex flex-col h-full bg-paper">
            <div className="bg-paper p-4 flex items-center gap-2 sticky top-0 z-10">
                <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
                <h3 className="font-bold text-lg text-ink">{t.tool_restroom}</h3>
            </div>
            <div className="flex-1 relative rounded-t-3xl overflow-hidden shadow-inner border-t border-sand">
                <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=public+restroom&output=embed`}
                ></iframe>
            </div>
        </div>
    )
}

const EmergencyHelper = ({ onBack, t, language, onOpenSettings }: { onBack: () => void, t: any, language: string, onOpenSettings: () => void }) => {
    const [country, setCountry] = useState('');
    const [info, setInfo] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const getInfo = async () => {
        if (!country) return;
        setLoading(true);
        try {
            const res = await getEmergencyInfo(country, language);
            setInfo(res);
        } catch (e) { setInfo("錯誤"); }
        finally { setLoading(false); }
    }

    const isApiKeyError = info && (info.includes('API Key') || info.includes('403'));

    return (
        <div className="flex flex-col h-full bg-paper">
            <div className="bg-paper p-4 flex items-center gap-2 sticky top-0 z-10">
                <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
                <h3 className="font-bold text-lg text-ink">{t.tool_emergency}</h3>
            </div>
            <div className="p-5 flex-1 overflow-y-auto pb-32">
                <div className="bg-red-500 text-white p-6 rounded-3xl shadow-lg shadow-red-500/20 mb-6">
                    <h2 className="text-xl font-bold mb-2">SOS?</h2>
                    <p className="opacity-90 text-sm">全球通用緊急電話: <span className="font-black text-2xl ml-1">112</span></p>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">當地資訊查詢</label>
                    <input value={country} onChange={e => setCountry(e.target.value)} placeholder="國家 (例如：日本)..." className="w-full p-4 bg-white rounded-2xl border border-sand shadow-sm outline-none" />
                    <button onClick={getInfo} disabled={loading || !country} className="w-full py-3.5 bg-ink text-white rounded-2xl font-bold shadow-lg">
                        {loading ? t.loading : t.confirm}
                    </button>
                </div>

                {info && (
                    <div className={`mt-6 p-6 rounded-3xl shadow-card border whitespace-pre-line leading-relaxed ${isApiKeyError ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-sand text-ink'}`}>
                        {info}
                        {isApiKeyError && (
                            <button
                                onClick={onOpenSettings}
                                className="mt-4 w-full py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
                            >
                                前往設定更新 API Key
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

const CardAdvice = ({ onBack, t, language, onOpenSettings }: { onBack: () => void, t: any, language: string, onOpenSettings: () => void }) => {
    const [dest, setDest] = useState('');
    const [info, setInfo] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const getInfo = async () => {
        if (!dest) return;
        setLoading(true);
        try {
            const res = await getCreditCardAdvice(dest, language);
            setInfo(res);
        } catch (e) { setInfo("錯誤"); }
        finally { setLoading(false); }
    }

    return (
        <div className="flex flex-col h-full bg-paper">
            <div className="bg-paper p-4 flex items-center gap-2 sticky top-0 z-10">
                <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
                <h3 className="font-bold text-lg text-ink">{t.tool_card}</h3>
            </div>
            <div className="p-5 flex-1 overflow-y-auto pb-32">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">目的地</label>
                    <input value={dest} onChange={e => setDest(e.target.value)} placeholder="國家 (例如：韓國)..." className="w-full p-4 bg-white rounded-2xl border border-sand shadow-sm outline-none" />
                    <button onClick={getInfo} disabled={loading || !dest} className="w-full py-3.5 bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200">
                        {loading ? t.loading : t.confirm}
                    </button>
                </div>

                {info && (
                    <div className={`mt-6 bg-white p-6 rounded-3xl shadow-card border border-sand whitespace-pre-line leading-relaxed ${info?.includes('API Key') ? 'text-red-600' : 'text-ink'}`}>
                        {info}
                        {info?.includes('API Key') && (
                            <button
                                onClick={onOpenSettings}
                                className="mt-4 w-full py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
                            >
                                前往設定更新 API Key
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// --- Leaflet Imports ---
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- Constants ---
const COUNTRY_COORDS: { [key: string]: [number, number] } = {
    'Japan': [36.2048, 138.2529],
    'Taiwan': [23.6978, 120.9605],
    'Thailand': [15.8700, 100.9925],
    'USA': [37.0902, -95.7129],
    'France': [46.2276, 2.2137],
    'South Korea': [35.9078, 127.7669],
    'Vietnam': [14.0583, 108.2772],
    'China': [35.8617, 104.1954],
    'Germany': [51.1657, 10.4515],
    'Italy': [41.8719, 12.5674],
    'UK': [55.3781, -3.4360],
    'Spain': [40.4637, -3.7492],
    'Australia': [-25.2744, 133.7751],
    'Canada': [56.1304, -106.3468],
    'Singapore': [1.3521, 103.8198],
    'Malaysia': [4.2105, 101.9758],
    'Philippines': [12.8797, 121.7740],
    'Indonesia': [-0.7893, 113.9213],
    'India': [20.5937, 78.9629],
    'Russia': [61.5240, 105.3188],
    'Brazil': [-14.2350, -51.9253],
    'Mexico': [23.6345, -102.5528],
    'Egypt': [26.8206, 30.8025],
    'Turkey': [38.9637, 35.2433],
    'Netherlands': [52.1326, 5.2913],
    'Switzerland': [46.8182, 8.2275],
    'Austria': [47.5162, 14.5501],
    'Belgium': [50.5039, 4.4699],
    'Sweden': [60.1282, 18.6435],
    'Norway': [60.4720, 8.4689],
    'Denmark': [56.2639, 9.5018],
    'Finland': [61.9241, 25.7482],
    'New Zealand': [-40.9006, 174.8860],
    'Hong Kong': [22.3193, 114.1694],
    'Macau': [22.1987, 113.5439]
};

// Component to invalidate map size on mount to fix rendering issues
const MapInvalidator = ({ onReady }: { onReady: () => void }) => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
            onReady();
        }, 250);
        return () => clearTimeout(timer);
    }, [map, onReady]);
    return null;
};

const ScratchMap = ({ onBack, trips, t }: { onBack: () => void, trips?: Trip[], t: any }) => {
    const [visited, setVisited] = useState<Set<string>>(new Set(['Japan', 'Thailand', 'Taiwan']));
    const [newCountry, setNewCountry] = useState('');
    const [isMapReady, setIsMapReady] = useState(false);

    useEffect(() => {
        if (trips) {
            const newSet = new Set(visited);
            trips.forEach(t => {
                if (t.title.includes('日本') || t.title.includes('Japan') || t.title.includes('京都') || t.title.includes('大阪') || t.title.includes('Tokyo')) newSet.add('Japan');
                if (t.title.includes('泰國') || t.title.includes('Thailand') || t.title.includes('曼谷')) newSet.add('Thailand');
                if (t.title.includes('台灣') || t.title.includes('Taiwan') || t.title.includes('台北')) newSet.add('Taiwan');
                if (t.title.includes('美國') || t.title.includes('USA')) newSet.add('USA');
                if (t.title.includes('法國') || t.title.includes('France') || t.title.includes('Paris')) newSet.add('France');
                if (t.title.includes('韓國') || t.title.includes('Korea') || t.title.includes('首爾')) newSet.add('South Korea');
                if (t.title.includes('越南') || t.title.includes('Vietnam')) newSet.add('Vietnam');
                if (t.title.includes('中國') || t.title.includes('China') || t.title.includes('上海') || t.title.includes('北京')) newSet.add('China');
                if (t.title.includes('香港') || t.title.includes('Hong Kong')) newSet.add('Hong Kong');
            });
            setVisited(newSet);
        }
    }, [trips]);

    const handleAdd = () => {
        if (newCountry.trim()) {
            // Try to match input to known coords keys (case insensitive)
            const input = newCountry.trim();
            const matchedKey = Object.keys(COUNTRY_COORDS).find(k => k.toLowerCase() === input.toLowerCase());

            if (matchedKey) {
                setVisited(prev => new Set(prev).add(matchedKey));
            } else {
                // Add anyway, but it won't show on map unless we have coords
                setVisited(prev => new Set(prev).add(input));
            }
            setNewCountry('');
        }
    }

    const handleRemove = (c: string) => {
        const newSet = new Set(visited);
        newSet.delete(c);
        setVisited(newSet);
    }

    return (
        <div className="flex flex-col h-full bg-[#111827] text-white">
            <div className="bg-[#111827] p-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-300" /></button>
                    <h3 className="font-bold text-lg">{t.tool_map}</h3>
                </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto pb-32">
                <div className="relative w-full aspect-[1.6] bg-[#1F2937] rounded-3xl overflow-hidden mb-8 shadow-2xl border border-gray-700">
                    <MapContainer
                        center={[20, 0]}
                        zoom={2}
                        style={{ height: '100%', width: '100%', background: '#1F2937' }}
                        zoomControl={false}
                        attributionControl={false}
                    >
                        {/* Dark theme tiles */}
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                        <MapInvalidator onReady={() => setIsMapReady(true)} />

                        {Array.from(visited).map(country => {
                            const coords = COUNTRY_COORDS[country as keyof typeof COUNTRY_COORDS];
                            if (!coords) return null;
                            return (
                                <Marker
                                    key={country}
                                    position={coords}
                                    icon={L.divIcon({
                                        className: 'custom-div-icon',
                                        html: `<div style="background-color: #FF6B6B; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #FF6B6B;"></div>`,
                                        iconSize: [12, 12],
                                        iconAnchor: [6, 6]
                                    })}
                                >
                                    <Popup>
                                        <div className="text-ink font-bold">{country}</div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>

                    <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                        <div className="inline-block bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-400 font-mono tracking-widest border border-white/10">
                            [ 互動式地圖 ]
                        </div>
                    </div>
                </div>

                <div className="bg-[#1F2937] rounded-3xl p-6 shadow-lg border border-gray-700 mb-6">
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="font-bold text-gray-200">已解鎖 ({visited.size})</h4>
                        <div className="flex gap-2">
                            <input
                                value={newCountry}
                                onChange={e => setNewCountry(e.target.value)}
                                placeholder="新增國家 (英文)..."
                                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-coral w-36 placeholder-gray-500"
                            />
                            <button onClick={handleAdd} className="bg-coral p-1.5 rounded-lg text-white hover:bg-coralDark">
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {Array.from(visited).map((country: string) => (
                            <div key={country} className="group relative px-4 py-2 bg-coral/10 text-coral rounded-xl text-sm font-bold border border-coral/20 flex items-center gap-2">
                                {country} 📍
                                <button onClick={() => handleRemove(country)} className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 bg-white text-coral rounded-full p-0.5 transition-opacity">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

const CurrencyConverter = ({ onBack, t }: { onBack: () => void, t: any }) => {
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const currencies = [
        { code: 'USD', name: '美金 (USD)' },
        { code: 'JPY', name: '日圓 (JPY)' },
        { code: 'KRW', name: '韓元 (KRW)' },
        { code: 'EUR', name: '歐元 (EUR)' },
        { code: 'CNY', name: '人民幣 (CNY)' },
        { code: 'THB', name: '泰銖 (THB)' },
        { code: 'VND', name: '越南盾 (VND)' }
    ];

    const handleConvert = async () => {
        if (!amount) return;
        setLoading(true);
        try {
            const val = parseFloat(amount);
            const twd = await convertToTWD(val, currency);
            setResult(formatCurrency(twd));
        } catch (e) {
            setResult("錯誤");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-paper">
            <div className="bg-paper p-4 flex items-center gap-2 sticky top-0 z-10">
                <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
                <h3 className="font-bold text-lg text-ink">匯率計算</h3>
            </div>
            <div className="p-5 flex-1 overflow-y-auto pb-32">
                <div className="bg-white p-6 rounded-3xl shadow-card border border-sand space-y-5">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">金額</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="輸入金額..."
                            className="w-full mt-2 p-4 bg-paper rounded-2xl text-xl font-bold text-ink border-none outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">幣別</label>
                        <select
                            value={currency}
                            onChange={e => setCurrency(e.target.value)}
                            className="w-full mt-2 p-4 bg-paper rounded-2xl text-ink font-medium border-none outline-none"
                        >
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleConvert}
                        disabled={loading || !amount}
                        className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-500/30 disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {loading ? '計算中...' : '轉換為台幣 (TWD)'}
                    </button>
                </div>

                {result && (
                    <div className="mt-6 bg-white p-6 rounded-3xl shadow-card border border-sand text-center animate-fade-in">
                        <p className="text-gray-400 text-sm font-medium mb-1">約等於</p>
                        <p className="text-3xl font-black text-ink">{result}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

const TranslationTool = ({ onBack, t, language }: { onBack: () => void, t: any, language: string }) => {
    return (
        <div className="flex flex-col h-full bg-paper">
            <div className="bg-paper p-4 flex items-center gap-2 sticky top-0 z-10">
                <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
                <h3 className="font-bold text-lg text-ink">{t.tool_translation || "Translation"}</h3>
            </div>
            <div className="flex-1 overflow-y-auto pb-32">
                <VoiceTranslator defaultSourceLang={language} />
            </div>
        </div>
    )
}

// --- Main Tools Container ---

const Tools: React.FC<ToolsProps> = ({ onBack, trips, settings, onMagicEditor, onOpenSettings }) => {
    const [activeTool, setActiveTool] = useState<ToolView>('MENU');
    const t = translations[settings.language] || translations['zh-TW'];

    if (activeTool === 'EXPENSE') return <ExpenseSplitter onBack={() => setActiveTool('MENU')} />;
    if (activeTool === 'VISA') return <VisaCheck onBack={() => setActiveTool('MENU')} t={t} language={settings.language} onOpenSettings={onOpenSettings} />;
    if (activeTool === 'CULTURE') return <CultureGuide onBack={() => setActiveTool('MENU')} t={t} language={settings.language} onOpenSettings={onOpenSettings} />;
    if (activeTool === 'RESTROOM') return <RestroomFinder onBack={() => setActiveTool('MENU')} t={t} />;
    if (activeTool === 'SCRATCH_MAP') return <ScratchMap onBack={() => setActiveTool('MENU')} trips={trips} t={t} />;
    if (activeTool === 'EMERGENCY') return <EmergencyHelper onBack={() => setActiveTool('MENU')} t={t} language={settings.language} onOpenSettings={onOpenSettings} />;
    if (activeTool === 'CARD_ADVICE') return <CardAdvice onBack={() => setActiveTool('MENU')} t={t} language={settings.language} onOpenSettings={onOpenSettings} />;
    if (activeTool === 'TIME_CAPSULE') return <div onClick={() => setActiveTool('MENU')}>Coming Soon</div>;

    if (activeTool === 'TRANSLATION') return <TranslationTool onBack={() => setActiveTool('MENU')} t={t} language={settings.language} />;
    if (activeTool === 'CURRENCY') return <CurrencyConverter onBack={() => setActiveTool('MENU')} t={t} />;

    const tools = [
        { id: 'MAGIC_EDITOR', name: '魔法修圖室', icon: SparklesIcon, color: 'text-pink-500', bg: 'bg-pink-50', desc: 'AI 智能修圖與濾鏡', action: onMagicEditor },
        { id: 'CURRENCY', name: '匯率計算', icon: CurrencyDollarIcon, color: 'text-green-500', bg: 'bg-green-50', desc: '即時匯率換算' },
        { id: 'TRANSLATION', name: t.tool_translation, icon: TranslateIcon, color: 'text-purple-500', bg: 'bg-purple-50', desc: t.desc_translator },
        { id: 'EMERGENCY', name: t.tool_emergency, icon: FirstAidIcon, color: 'text-red-500', bg: 'bg-red-50', desc: t.desc_emergency },
        { id: 'CARD_ADVICE', name: t.tool_card, icon: CreditCardIcon, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: t.desc_card },
        { id: 'SCRATCH_MAP', name: t.tool_map, icon: GlobeAltIcon, color: 'text-teal-500', bg: 'bg-teal-50', desc: t.desc_map },
        { id: 'RESTROOM', name: t.tool_restroom, icon: ToiletIcon, color: 'text-cyan-500', bg: 'bg-cyan-50', desc: t.desc_restroom },
        { id: 'VISA', name: t.tool_visa, icon: PassportIcon, color: 'text-blue-500', bg: 'bg-blue-50', desc: t.desc_visa },
        { id: 'CULTURE', name: t.tool_culture, icon: LightBulbIcon, color: 'text-orange-500', bg: 'bg-orange-50', desc: t.desc_culture },
    ];

    return (
        <div className="flex flex-col h-full bg-paper pt-safe">
            <div className="px-5 py-4 bg-paper sticky top-0 z-10 flex items-center justify-between border-b border-sand/50">
                <h2 className="text-xl font-extrabold text-ink flex items-center gap-2">
                    <SquaresPlusIcon className="w-6 h-6 text-coral" />
                    {t.tools_title}
                </h2>
            </div>

            <div className="p-5 grid grid-cols-2 gap-4 pb-32 overflow-y-auto">
                {tools.map((tool) => (
                    <div
                        key={tool.id}
                        onClick={() => tool.action ? tool.action() : setActiveTool(tool.id as ToolView)}
                        className="bg-white p-5 rounded-3xl shadow-card border border-sand active:scale-95 transition-all cursor-pointer hover:shadow-soft hover:border-coral group"
                    >
                        <div className={`w-12 h-12 ${tool.bg} ${tool.color} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                            <tool.icon className="w-6 h-6 stroke-2" />
                        </div>
                        <h3 className="font-bold text-ink mb-1">{tool.name}</h3>
                        <p className="text-xs text-gray-400 font-medium">{tool.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Tools;
