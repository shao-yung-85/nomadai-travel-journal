import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { translations } from '../utils/translations';
import { AppSettings } from '../types';

interface ReloadPromptProps {
    settings?: AppSettings;
}

const ReloadPrompt: React.FC<ReloadPromptProps> = ({ settings }) => {
    const t = settings ? (translations[settings.language] || translations['zh-TW']) : translations['zh-TW'];

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[1000] p-4 bg-ink text-white rounded-xl shadow-2xl animate-slide-up max-w-xs border border-white/10">
            <div className="mb-3 font-bold">
                {offlineReady ? (
                    <span>App ready to work offline</span>
                ) : (
                    <span>New content available, click on reload button to update.</span>
                )}
            </div>
            <div className="flex gap-2">
                {needRefresh && (
                    <button
                        className="flex-1 px-3 py-2 bg-coral text-white rounded-lg font-bold text-sm hover:bg-coralDark transition-colors"
                        onClick={() => updateServiceWorker(true)}
                    >
                        Reload
                    </button>
                )}
                <button
                    className="flex-1 px-3 py-2 bg-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/20 transition-colors"
                    onClick={close}
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default ReloadPrompt;
