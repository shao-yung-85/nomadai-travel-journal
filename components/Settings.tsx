import React, { useState, useEffect } from 'react';
import { AppSettings, User } from '../types';
import { ChevronLeftIcon, TrashIcon, LogOutIcon, KeyIcon } from './Icons';
import { translations } from '../utils/translations';

interface SettingsProps {
    onBack: () => void;
    settings: AppSettings;
    onUpdateSettings: (settings: Partial<AppSettings>) => void;
    onResetApp: () => void;
    user: User | null;
    onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack, settings, onUpdateSettings, onResetApp, user, onLogout }) => {
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showSaved, setShowSaved] = useState(false);
    const t = translations[settings.language] || translations['zh-TW'];

    useEffect(() => {
        const storedKey = localStorage.getItem('nomad_user_api_key');
        if (storedKey) setApiKey(storedKey);
    }, []);

    const handleSaveApiKey = (value: string) => {
        setApiKey(value);
        localStorage.setItem('nomad_user_api_key', value);
        if (value) {
            setShowSaved(true);
            setTimeout(() => setShowSaved(false), 2000);
        }
    };

    const colors = [
        { name: '珊瑚紅', value: '#FF6B6B' },
        { name: '海洋藍', value: '#4ECDC4' },
        { name: '陽光黃', value: '#FFE66D' },
        { name: '薰衣草紫', value: '#A06CD5' },
        { name: '薄荷綠', value: '#6BCB77' },
    ];

    return (
        <div className="h-full flex flex-col bg-paper animate-slide-in">
            {/* Header */}
            <div className="px-6 py-6 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-sand">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ChevronLeftIcon className="w-6 h-6 text-ink" />
                </button>
                <h1 className="text-xl font-bold text-ink">設定</h1>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* User Profile */}
                {user && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-sand">
                        <h2 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">帳號資訊</h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-lg font-bold text-ink">{user.username}</p>
                                <p className="text-xs text-gray-400">ID: {user.id}</p>
                            </div>
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors text-sm font-medium"
                            >
                                <LogOutIcon className="w-4 h-4" />
                                登出
                            </button>
                        </div>
                    </div>
                )}

                {/* API Key Settings */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-sand">
                    <h2 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider flex items-center gap-2">
                        <KeyIcon className="w-4 h-4" />
                        {t.api_settings || 'API 設定'}
                    </h2>
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-ink">{t.api_key_label || 'Gemini API Key'}</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => handleSaveApiKey(e.target.value)}
                                placeholder={t.api_key_placeholder || '貼上您的 API Key'}
                                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-coral focus:ring-2 focus:ring-coral/20 outline-none transition-all font-mono text-sm"
                            />
                            {showSaved && (
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-xs font-bold animate-fade-in">
                                    {t.api_key_saved || '已儲存'}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            {t.api_key_help || '您的 Key 僅會儲存在瀏覽器中，不會上傳伺服器。'}
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-coral hover:underline ml-1">
                                取得免費 Key
                            </a>
                        </p>
                    </div>
                </div>

                {/* Theme Settings */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-sand">
                    <h2 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">主題顏色</h2>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {colors.map((color) => (
                            <button
                                key={color.value}
                                onClick={() => onUpdateSettings({ themeColor: color.value })}
                                className={`w-10 h-10 rounded-full flex-shrink-0 transition-transform ${settings.themeColor === color.value ? 'scale-110 ring-2 ring-offset-2 ring-gray-300' : 'hover:scale-105'}`}
                                style={{ backgroundColor: color.value }}
                                aria-label={color.name}
                            />
                        ))}
                        <button
                            onClick={() => onUpdateSettings({ themeColor: undefined })}
                            className={`w-10 h-10 rounded-full flex-shrink-0 bg-coral flex items-center justify-center text-white text-xs font-bold transition-transform ${!settings.themeColor ? 'scale-110 ring-2 ring-offset-2 ring-gray-300' : 'hover:scale-105'}`}
                        >
                            預設
                        </button>
                    </div>
                </div>

                {/* Language Settings */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-sand">
                    <h2 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">語言</h2>
                    <div className="space-y-2">
                        {[
                            { code: 'zh-TW', label: '繁體中文' },
                            { code: 'en-US', label: 'English' },
                            { code: 'ja-JP', label: '日本語' }
                        ].map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => onUpdateSettings({ language: lang.code })}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${settings.language === lang.code ? 'bg-coral/10 text-coral font-bold' : 'hover:bg-gray-50 text-ink'}`}
                            >
                                <span>{lang.label}</span>
                                {settings.language === lang.code && <div className="w-2 h-2 rounded-full bg-coral" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-sand">
                    <h2 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">資料管理</h2>

                    {!showResetConfirm ? (
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-colors font-bold"
                        >
                            <TrashIcon className="w-5 h-5" />
                            清空所有資料
                        </button>
                    ) : (
                        <div className="space-y-3 animate-fade-in">
                            <p className="text-center text-sm text-red-500 font-medium">確定要刪除所有行程嗎？此操作無法復原。</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => {
                                        onResetApp();
                                        setShowResetConfirm(false);
                                    }}
                                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/30"
                                >
                                    確認刪除
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-center text-xs text-gray-400 py-4">
                    <p>NomadAI Travel Journal v1.0.0</p>
                    <p className="mt-1">Made with ❤️ by NomadAI Team</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
