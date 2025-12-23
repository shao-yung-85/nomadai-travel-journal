import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trip, User } from '../types';
import { XMarkIcon, UserPlusIcon, LinkIcon, CheckIcon } from './Icons';
import { translations } from '../utils/translations';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';

interface ShareTripModalProps {
    trip: Trip;
    currentUser: User;
    onClose: () => void;
    settings: { language: 'zh-TW' | 'en-US' | 'ja-JP' };
}

const ShareTripModal: React.FC<ShareTripModalProps> = ({ trip, currentUser, onClose, settings }) => {
    const t = translations[settings.language] || translations['zh-TW'];
    const [email, setEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<User | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copied, setCopied] = useState(false);

    const handleSearchUser = async () => {
        if (!email) return;
        setIsSearching(true);
        setError('');
        setSearchResult(null);

        try {
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError(settings.language === 'zh-TW' ? '找不到此用戶' : 'User not found');
            } else {
                const userDoc = querySnapshot.docs[0];
                setSearchResult({ id: userDoc.id, ...userDoc.data() } as User);
            }
        } catch (e) {
            console.error(e);
            setError(settings.language === 'zh-TW' ? '搜尋失敗' : 'Search failed');
        } finally {
            setIsSearching(false);
        }
    };

    const handleInvite = async () => {
        if (!searchResult || !trip.id) return;

        try {
            const tripRef = doc(db, "itineraries", trip.id);
            await updateDoc(tripRef, {
                collaborators: arrayUnion(searchResult.id),
                userIds: arrayUnion(searchResult.id)
            });
            setSuccess(settings.language === 'zh-TW' ? `已邀請 ${searchResult.username}` : `Invited ${searchResult.username}`);
            setSearchResult(null);
            setEmail('');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            console.error(e);
            setError(settings.language === 'zh-TW' ? '邀請失敗' : 'Invite failed');
        }
    };

    const handleCopyLink = () => {
        const link = window.location.origin + `?trip=${trip.id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-ink">{t.share_trip || "Share Trip"}</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Invite Section */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase">
                            {settings.language === 'zh-TW' ? '邀請旅伴 (輸入 Email)' : 'Invite Companion (Enter Email)'}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="friend@example.com"
                                className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-coral outline-none text-sm"
                            />
                            <button
                                onClick={handleSearchUser}
                                disabled={isSearching || !email}
                                className="bg-coral text-white p-3 rounded-xl font-bold disabled:opacity-50"
                            >
                                {isSearching ? "..." : (settings.language === 'zh-TW' ? '搜尋' : 'Find')}
                            </button>
                        </div>

                        {error && <p className="text-red-500 text-xs font-bold ml-1">{error}</p>}

                        {searchResult && (
                            <div className="flex items-center justify-between bg-green-50 p-3 rounded-xl border border-green-100 animate-slide-up">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-bold text-xs">
                                        {searchResult.username[0]}
                                    </div>
                                    <span className="text-sm font-bold text-green-800">{searchResult.username}</span>
                                </div>
                                <button
                                    onClick={handleInvite}
                                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700"
                                >
                                    {settings.language === 'zh-TW' ? '加入' : 'Add'}
                                </button>
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 text-green-600 text-sm font-bold ml-1 animate-fade-in">
                                <CheckIcon className="w-4 h-4" /> {success}
                            </div>
                        )}
                    </div>

                    <div className="w-full h-px bg-gray-100"></div>

                    {/* Copy Link Section */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase">
                            {settings.language === 'zh-TW' ? '分享連結 (檢視用)' : 'Share Link (View Only)'}
                        </label>
                        <button
                            onClick={handleCopyLink}
                            className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-coral transition-colors flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 group-hover:text-coral shadow-sm">
                                    <LinkIcon className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-ink">
                                        {settings.language === 'zh-TW' ? '複製行程連結' : 'Copy Trip Link'}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {copied ? (settings.language === 'zh-TW' ? '已複製！' : 'Copied!') : 'nomadai.app/trip/...'}
                                    </div>
                                </div>
                            </div>
                            {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : null}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ShareTripModal;
