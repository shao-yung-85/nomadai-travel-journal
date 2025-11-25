
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
    SquaresPlusIcon
} from './Icons';
import { getVisaRequirements, getCulturalEtiquette, getEmergencyInfo, getCreditCardAdvice } from '../services/gemini';
import { Expense, TimeCapsule, Trip, AppSettings } from '../types';
import { translations } from '../utils/translations';

interface ToolsProps {
    onBack: () => void;
    trips?: Trip[];
    settings: AppSettings;
}

type ToolView = 'MENU' | 'EXPENSE' | 'VISA' | 'CULTURE' | 'RESTROOM' | 'SCRATCH_MAP' | 'TIME_CAPSULE' | 'EMERGENCY' | 'CARD_ADVICE';

// --- Sub-Components ---

const ExpenseSplitter = ({ onBack }: { onBack: () => void }) => {
    return (
        <div className="flex flex-col h-full bg-paper">
            <div className="bg-paper p-4 flex items-center gap-2 sticky top-0 z-10">
                <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
                <h3 className="font-bold text-lg text-ink">Splitter</h3>
            </div>
            <div className="p-5 flex items-center justify-center h-full text-gray-400 text-center font-medium">
                <p>Use the "Budget" tab in Trip Details to record expenses.</p>
            </div>
        </div>
    )
}

const VisaCheck = ({ onBack, t, language }: { onBack: () => void, t: any, language: string }) => {
    const [passport, setPassport] = useState('Taiwan (ROC)');
    const [dest, setDest] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const check = async () => {
        if (!dest) return;
        setLoading(true);
        try {
            const info = await getVisaRequirements(passport, dest, language);
            setResult(info || "Error");
        } catch (e) {
            setResult("Error");
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
                        <label className="text-xs font-bold text-gray-400 uppercase">Passport</label>
                        <select value={passport} onChange={e => setPassport(e.target.value)} className="w-full mt-2 p-3 bg-paper rounded-xl text-ink font-medium border-none outline-none">
                            <option value="Taiwan (ROC)">Taiwan (ROC)</option>
                            <option value="Japan">Japan</option>
                            <option value="USA">USA</option>
                            <option value="Hong Kong">Hong Kong</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Destination</label>
                        <input value={dest} onChange={e => setDest(e.target.value)} placeholder="e.g., Vietnam" className="w-full mt-2 p-3 bg-paper rounded-xl text-ink font-medium border-none outline-none" />
                    </div>
                    <button onClick={check} disabled={loading || !dest} className="w-full bg-coral text-white py-3.5 rounded-xl font-bold shadow-lg shadow-coral/30 disabled:opacity-50">
                        {loading ? t.loading : t.confirm}
                    </button>
                </div>
                {result && (
                    <div className="bg-white p-6 rounded-3xl shadow-card border border-sand animate-fade-in">
                        <div className="prose prose-sm max-w-none text-ink leading-relaxed whitespace-pre-line">
                            {result}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const CultureGuide = ({ onBack, t, language }: { onBack: () => void, t: any, language: string }) => {
    const [location, setLocation] = useState('');
    const [advice, setAdvice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const getAdvice = async () => {
        setLoading(true);
        try {
            const loc = location || "Kyoto, Japan";
            const info = await getCulturalEtiquette(loc, language);
            setAdvice(info || "Error");
        } catch (e) {
            setAdvice("Error");
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
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (e.g. Bangkok)..." className="w-full p-4 bg-white rounded-2xl shadow-sm border border-sand font-medium text-ink outline-none" />
                </div>
                <button onClick={getAdvice} disabled={loading} className="w-full bg-orange-400 text-white px-4 py-3.5 rounded-2xl font-bold text-sm shadow-md mb-6">
                    {loading ? t.loading : t.confirm}
                </button>

                {advice && (
                    <div className="bg-white p-6 rounded-3xl shadow-card border border-sand animate-fade-in">
                        <div className="prose prose-sm text-ink whitespace-pre-line leading-relaxed">
                            {advice}
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

const EmergencyHelper = ({ onBack, t, language }: { onBack: () => void, t: any, language: string }) => {
    const [country, setCountry] = useState('');
    const [info, setInfo] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const getInfo = async () => {
        if (!country) return;
        setLoading(true);
        try {
            const res = await getEmergencyInfo(country, language);
            setInfo(res);
        } catch (e) { setInfo("Error"); }
        finally { setLoading(false); }
    }

    return (
        <div className="flex flex-col h-full bg-paper">
            <div className="bg-paper p-4 flex items-center gap-2 sticky top-0 z-10">
                <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
                <h3 className="font-bold text-lg text-ink">{t.tool_emergency}</h3>
            </div>
            <div className="p-5 flex-1 overflow-y-auto pb-32">
                <div className="bg-red-500 text-white p-6 rounded-3xl shadow-lg shadow-red-500/20 mb-6">
                    <h2 className="text-xl font-bold mb-2">SOS?</h2>
                    <p className="opacity-90 text-sm">Global Emergency: <span className="font-black text-2xl ml-1">112</span></p>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Local Info</label>
                    <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country (e.g. Japan)" className="w-full p-4 bg-white rounded-2xl border border-sand shadow-sm outline-none" />
                    <button onClick={getInfo} disabled={loading || !country} className="w-full py-3.5 bg-ink text-white rounded-2xl font-bold shadow-lg">
                        {loading ? t.loading : t.confirm}
                    </button>
                </div>

                {info && (
                    <div className="mt-6 bg-white p-6 rounded-3xl shadow-card border border-sand whitespace-pre-line leading-relaxed text-ink">
                        {info}
                    </div>
                )}
            </div>
        </div>
    )
}

const CardAdvice = ({ onBack, t, language }: { onBack: () => void, t: any, language: string }) => {
    const [dest, setDest] = useState('');
    const [info, setInfo] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const getInfo = async () => {
        if (!dest) return;
        setLoading(true);
        try {
            const res = await getCreditCardAdvice(dest, language);
            setInfo(res);
        } catch (e) { setInfo("Error"); }
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
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Destination</label>
                    <input value={dest} onChange={e => setDest(e.target.value)} placeholder="Country (e.g. Korea)" className="w-full p-4 bg-white rounded-2xl border border-sand shadow-sm outline-none" />
                    <button onClick={getInfo} disabled={loading || !dest} className="w-full py-3.5 bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200">
                        {loading ? t.loading : t.confirm}
                    </button>
                </div>

                {info && (
                    <div className="mt-6 bg-white p-6 rounded-3xl shadow-card border border-sand whitespace-pre-line leading-relaxed text-ink">
                        {info}
                    </div>
                )}
            </div>
        </div>
    )
}

const ScratchMap = ({ onBack, trips, t }: { onBack: () => void, trips?: Trip[], t: any }) => {
    const [visited, setVisited] = useState<Set<string>>(new Set(['Japan', 'Thailand', 'Taiwan']));
    const [newCountry, setNewCountry] = useState('');

    useEffect(() => {
        if (trips) {
            const newSet = new Set(visited);
            trips.forEach(t => {
                if (t.title.includes('日本') || t.title.includes('Japan') || t.title.includes('京都') || t.title.includes('大阪') || t.title.includes('Tokyo')) newSet.add('Japan');
                if (t.title.includes('泰國') || t.title.includes('Thailand') || t.title.includes('曼谷')) newSet.add('Thailand');
                if (t.title.includes('台灣') || t.title.includes('Taiwan') || t.title.includes('台北')) newSet.add('Taiwan');
                if (t.title.includes('美國') || t.title.includes('USA')) newSet.add('USA');
                if (t.title.includes('法國') || t.title.includes('France') || t.title.includes('Paris')) newSet.add('France');
            });
            setVisited(newSet);
        }
    }, [trips]);

    const handleAdd = () => {
        if (newCountry.trim()) {
            setVisited(prev => new Set(prev).add(newCountry.trim()));
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
                <div className="relative w-full aspect-[1.6] bg-[#1F2937] rounded-3xl overflow-hidden mb-8 shadow-2xl border border-gray-700 flex items-center justify-center">
                    <div className="absolute inset-0 opacity-30 flex items-center justify-center">
                        <svg viewBox="0 0 100 50" className="w-full h-full text-coral fill-current">
                            <path d="M20 10 Q30 5 40 15 T60 15 T80 10 V40 H20 Z" opacity="0.5" />
                            <circle cx="25" cy="15" r="5" />
                            <circle cx="75" cy="15" r="6" />
                            <circle cx="50" cy="30" r="4" />
                        </svg>
                    </div>
                    <h1 className="relative text-5xl font-black text-coral tracking-tighter opacity-80 mix-blend-overlay">WORLD</h1>
                    <div className="absolute bottom-4 text-xs text-gray-500 font-mono tracking-widest">[ Interactive Visualization ]</div>
                </div>

                <div className="bg-[#1F2937] rounded-3xl p-6 shadow-lg border border-gray-700 mb-6">
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="font-bold text-gray-200">Unlocked ({visited.size})</h4>
                        <div className="flex gap-2">
                            <input
                                value={newCountry}
                                onChange={e => setNewCountry(e.target.value)}
                                placeholder="Add..."
                                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-coral w-32"
                            />
                            <button onClick={handleAdd} className="bg-coral p-1.5 rounded-lg text-white hover:bg-coralDark">
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {Array.from(visited).map(country => (
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

// --- Main Tools Container ---

const Tools: React.FC<ToolsProps> = ({ onBack, trips, settings }) => {
    const [activeTool, setActiveTool] = useState<ToolView>('MENU');
    const t = translations[settings.language] || translations['zh-TW'];

    if (activeTool === 'EXPENSE') return <ExpenseSplitter onBack={() => setActiveTool('MENU')} />;
    if (activeTool === 'VISA') return <VisaCheck onBack={() => setActiveTool('MENU')} t={t} language={settings.language} />;
    if (activeTool === 'CULTURE') return <CultureGuide onBack={() => setActiveTool('MENU')} t={t} language={settings.language} />;
    if (activeTool === 'RESTROOM') return <RestroomFinder onBack={() => setActiveTool('MENU')} t={t} />;
    if (activeTool === 'SCRATCH_MAP') return <ScratchMap onBack={() => setActiveTool('MENU')} trips={trips} t={t} />;
    if (activeTool === 'EMERGENCY') return <EmergencyHelper onBack={() => setActiveTool('MENU')} t={t} language={settings.language} />;
    if (activeTool === 'CARD_ADVICE') return <CardAdvice onBack={() => setActiveTool('MENU')} t={t} language={settings.language} />;
    if (activeTool === 'TIME_CAPSULE') return <div onClick={() => setActiveTool('MENU')}>Coming Soon</div>;

    const tools = [
        { id: 'EMERGENCY', name: t.tool_emergency, icon: FirstAidIcon, color: 'text-red-500', bg: 'bg-red-50', desc: 'SOS / Police' },
        { id: 'CARD_ADVICE', name: t.tool_card, icon: CreditCardIcon, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: 'Payment Tips' },
        { id: 'SCRATCH_MAP', name: t.tool_map, icon: GlobeAltIcon, color: 'text-teal-500', bg: 'bg-teal-50', desc: 'Visited List' },
        { id: 'RESTROOM', name: t.tool_restroom, icon: ToiletIcon, color: 'text-cyan-500', bg: 'bg-cyan-50', desc: 'WC Finder' },
        { id: 'VISA', name: t.tool_visa, icon: PassportIcon, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Entry Rules' },
        { id: 'CULTURE', name: t.tool_culture, icon: LightBulbIcon, color: 'text-orange-500', bg: 'bg-orange-50', desc: 'Tips / Taboos' },
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
                        onClick={() => setActiveTool(tool.id as ToolView)}
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
