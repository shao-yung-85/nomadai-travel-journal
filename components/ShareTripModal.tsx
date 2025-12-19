import React, { useState } from 'react';
import { Trip, User } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';

interface ShareTripModalProps {
    trip: Trip;
    currentUser: User;
    onClose: () => void;
    onUpdate: (updatedTrip: Trip) => void;
}

const ShareTripModal: React.FC<ShareTripModalProps> = ({ trip, currentUser, onClose, onUpdate }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleShare = async () => {
        if (!email.trim()) return;
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            // 1. Find user by email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError('找不到此 Email 的使用者');
                setIsLoading(false);
                return;
            }

            const foundUserDoc = querySnapshot.docs[0];
            const foundUserData = foundUserDoc.data();
            const foundUserId = foundUserDoc.id; // Or foundUserData.uid

            // Check if already owner or collaborator
            if (foundUserId === currentUser.id) {
                setError('您是行程擁有者，無需分享');
                setIsLoading(false);
                return;
            }

            if (trip.userIds?.includes(foundUserId)) {
                setError('該使用者已在協作名單中');
                setIsLoading(false);
                return;
            }

            // 2. Update trip
            const newCollaborator = {
                uid: foundUserId,
                email: foundUserData.email,
                username: foundUserData.username || 'Traveler'
            };

            const tripRef = doc(db, 'itineraries', trip.id);

            // Update local optimistically or wait? Let's wait.
            await updateDoc(tripRef, {
                userIds: arrayUnion(foundUserId),
                collaborators: arrayUnion(newCollaborator)
            });

            // 3. Callback to update UI (though onSnapshot in App.tsx might handle it, fast feedback is good)
            onUpdate({
                ...trip,
                userIds: [...(trip.userIds || []), foundUserId],
                collaborators: [...(trip.collaborators || []), newCollaborator]
            });

            setSuccessMsg(`已成功邀請 ${newCollaborator.username}`);
            setEmail('');
        } catch (e: any) {
            console.error("Share error:", e);
            setError('分享失敗: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-lg text-gray-800">分享行程</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        邀請朋友一起編輯 <strong>{trip.title}</strong>。他們將獲得完全編輯權限。
                    </p>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">邀請 Email</label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="friend@example.com"
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                            />
                            <button
                                onClick={handleShare}
                                disabled={isLoading || !email}
                                className="bg-coral text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-coral/30 hover:shadow-xl hover:shadow-coral/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none transition-all flex items-center justify-center min-w-[4rem]"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    '邀請'
                                )}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                        {successMsg && <p className="text-green-500 text-xs mt-1">{successMsg}</p>}
                    </div>

                    <div className="pt-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">目前成員</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {/* Owner */}
                            <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
                                <div className="w-8 h-8 rounded-full bg-coral/10 text-coral flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                    擁
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">擁有者</p>
                                    {trip.userIds && trip.userIds.length > 0 && currentUser.id === trip.userIds[0] &&
                                        <p className="text-xs text-gray-500 truncate">(您)</p>
                                    }
                                </div>
                            </div>

                            {/* Collaborators */}
                            {trip.collaborators?.map((collab, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                        {collab.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{collab.username}</p>
                                        <p className="text-xs text-gray-500 truncate">{collab.email}</p>
                                    </div>
                                </div>
                            ))}

                            {(!trip.collaborators || trip.collaborators.length === 0) && (
                                <p className="text-xs text-gray-400 italic text-center py-2">目前沒有其他協作者</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareTripModal;
