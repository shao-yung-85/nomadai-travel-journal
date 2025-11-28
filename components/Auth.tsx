import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { SparklesIcon } from './Icons';

interface AuthProps {
    onLogin: () => void; // No user data needed here, handled by onAuthStateChanged in App
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        console.log("Attempting Google Login...");
        setIsLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            console.log("Google Login Success:", result.user.uid);
            // Successful login will trigger onAuthStateChanged in App.tsx
        } catch (err: any) {
            console.error("Login failed", err);
            setError(err.message || '登入失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-paper">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-card p-8 border border-sand text-center">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-coral rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-coral/30">
                        <SparklesIcon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-ink">Ques-trip</h1>
                    <p className="text-gray-400 text-sm mt-2">
                        智能旅遊規劃助手
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        id="google-login-btn"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-3.5 rounded-xl font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        )}
                        使用 Google 帳號登入
                    </button>

                    {error && (
                        <div className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded-lg">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
