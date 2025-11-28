import React, { useState } from 'react';
import { User } from '../types';
import { SparklesIcon } from './Icons';

interface AuthProps {
    onLogin: (user: User) => void;
    onRegister: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onRegister }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('請輸入使用者名稱和密碼');
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            setError('兩次輸入的密碼不一致');
            return;
        }

        const tempId = 'user_' + Date.now();
        const newUser: User = {
            id: tempId, // In real app, ID comes from backend
            username,
            password, // In real app, never pass password like this
            createdAt: new Date().toISOString()
        };

        if (isLogin) {
            // Login logic is handled by parent (checking localStorage)
            // Here we just pass the credentials structure
            onLogin({ id: '', username, password, createdAt: '' });
        } else {
            onRegister(newUser);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-paper">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-card p-8 border border-sand">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-coral rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-coral/30">
                        <SparklesIcon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-ink">Ques-trip</h1>
                    <p className="text-gray-400 text-sm mt-2">
                        {isLogin ? '歡迎回來，請登入您的帳號' : '建立您的專屬旅遊帳號'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">使用者名稱</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-paper rounded-xl px-4 py-3 text-ink font-medium outline-none focus:ring-2 focus:ring-coral/50 transition-all border border-sand"
                            placeholder="Username"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">密碼</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-paper rounded-xl px-4 py-3 text-ink font-medium outline-none focus:ring-2 focus:ring-coral/50 transition-all border border-sand"
                            placeholder="Password"
                        />
                    </div>

                    {!isLogin && (
                        <div className="animate-slide-up">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">確認密碼</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-paper rounded-xl px-4 py-3 text-ink font-medium outline-none focus:ring-2 focus:ring-coral/50 transition-all border border-sand"
                                placeholder="Confirm Password"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-coral text-white py-3.5 rounded-xl font-bold shadow-lg shadow-coral/30 active:scale-95 transition-transform mt-4"
                    >
                        {isLogin ? '登入' : '註冊'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                            setUsername('');
                            setPassword('');
                            setConfirmPassword('');
                        }}
                        className="text-sm text-gray-400 hover:text-coral font-medium transition-colors"
                    >
                        {isLogin ? '還沒有帳號？立即註冊' : '已經有帳號？登入'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
