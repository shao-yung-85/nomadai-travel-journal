
import React from 'react';
import { AppSettings } from '../types';
import { ChevronLeftIcon, LanguageIcon, ArrowPathIcon, TrashIcon, SparklesIcon } from './Icons';
import { translations } from '../utils/translations';

interface SettingsProps {
    onBack: () => void;
    settings: AppSettings;
    onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
    onResetApp: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack, settings, onUpdateSettings, onResetApp }) => {
    const t = translations[settings.language] || translations['zh-TW'];

    const handleReset = () => {
        if (confirm(t.reset_confirm)) {
            onResetApp();
        }
    };

    return (
        <div className="flex flex-col h-full bg-paper pt-safe">
            <div className="px-4 py-3 flex items-center gap-2 bg-paper sticky top-0 z-10 border-b border-sand/50">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white text-gray-500 active:scale-90 transition-transform">
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-bold text-ink">{t.settings_title}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-8 pb-32">

                {/* General Settings */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{t.general}</h3>
                    <div className="bg-white rounded-3xl overflow-hidden shadow-card border border-sand divide-y divide-gray-50">
                        {/* Language */}
                        <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl">
                                    <LanguageIcon className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-ink">{t.language}</span>
                            </div>
                            <select
                                value={settings.language}
                                onChange={(e) => onUpdateSettings({ language: e.target.value as any })}
                                className="bg-transparent text-gray-500 font-medium outline-none text-right cursor-pointer"
                            >
                                <option value="zh-TW">繁體中文</option>
                                <option value="en-US">English</option>
                                <option value="ja-JP">日本語</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Appearance Settings */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{t.appearance}</h3>
                    <div className="bg-white rounded-3xl overflow-hidden shadow-card border border-sand divide-y divide-gray-50">
                        {/* Theme Color */}
                        <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-pink-50 text-pink-500 rounded-xl">
                                    <div className="w-5 h-5 rounded-full bg-current"></div>
                                </div>
                                <span className="font-bold text-ink">{t.theme_color}</span>
                            </div>
                            <div className="flex gap-2">
                                {['#D65A5A', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => onUpdateSettings({ themeColor: color })}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${settings.themeColor === color ? 'border-gray-400 scale-110' : 'border-transparent hover:scale-105'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Minimalist Mode Toggle */}
                        <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => onUpdateSettings({ minimalistMode: !settings.minimalistMode })}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 text-purple-500 rounded-xl">
                                    <SparklesIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-ink">{t.minimalist_mode}</div>
                                    <div className="text-xs text-gray-400 mt-0.5 font-medium">{t.minimalist_desc}</div>
                                </div>
                            </div>
                            <button
                                className={`w-14 h-8 rounded-full transition-all relative ${settings.minimalistMode ? 'bg-coral' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 ${settings.minimalistMode ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{t.data_mgmt}</h3>
                    <div className="bg-white rounded-3xl overflow-hidden shadow-card border border-sand divide-y divide-gray-50">
                        {/* Reset App */}
                        <button onClick={handleReset} className="w-full p-5 flex items-center justify-between hover:bg-red-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-50 text-red-500 rounded-xl group-hover:bg-red-100">
                                    <TrashIcon className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-red-500">{t.reset_all}</span>
                            </div>
                            <ArrowPathIcon className="w-4 h-4 text-red-300 group-hover:text-red-500" />
                        </button>
                    </div>
                </div>

                <div className="text-center text-xs text-gray-400 py-4 font-medium">
                    NomadAI Travel Journal v2.0
                </div>

            </div>
        </div>
    );
};

export default Settings;
