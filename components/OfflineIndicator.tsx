import React, { useState, useEffect } from 'react';
import { onConnectionStateChanged } from '../services/firebase';
import { CloudIcon } from './Icons';

const OfflineIndicator: React.FC = () => {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // Monitor Browser Network Status
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Monitor Firebase Connection
        const unsubscribeFirebase = onConnectionStateChanged((isConnected) => {
            // If browser is online but Firebase is disconnected, it might be flaky, 
            // but we usually trust browser offline event more for "Airplace Mode".
            // However, Firebase disconnected means we can't save to cloud.
            // Let's rely on browser status for "Offline Mode" UI primarily.
            // But if we want to be strict, we can OR them.
            // For UX, sticking to navigator.onLine is less jumpy.
        });

        // Set initial state
        setIsOffline(!navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            unsubscribeFirebase();
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-gray-800/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold">
                <CloudIcon className="w-4 h-4 text-gray-400" />
                <span>離線模式</span>
            </div>
        </div>
    );
};

export default OfflineIndicator;
