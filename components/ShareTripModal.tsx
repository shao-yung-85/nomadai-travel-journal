import React, { useState } from 'react';
import { Trip } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';

interface ShareTripModalProps {
    trip: Trip;
    onClose: () => void;
    onUpdateTrip: (trip: Trip) => void;
}

const ShareTripModal: React.FC<ShareTripModalProps> = ({ trip, onClose, onUpdateTrip }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleInvite = async () => {
        if (!email) return;
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            // 1. Find user by email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError("找不到此 Email 的用戶。請確認對方已登入過此 App。");
                setIsLoading(false);
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            const newCollaboratorId = userData.uid;

            // Check if already added
            if (trip.userIds?.includes(newCollaboratorId)) {
                setError("此用戶已經是協作者了。");
                setIsLoading(false);
                return;
            }

            // 2. Update Trip
            const tripRef = doc(db, "itineraries", trip.id);
            await updateDoc(tripRef, {
                collaborators: arrayUnion(newCollaboratorId),
                userIds: arrayUnion(newCollaboratorId)
            });

            // Optimistic update
            const updatedTrip = {
                ...trip,
                collaborators: [...(trip.collaborators || []), newCollaboratorId],
                userIds: [...(trip.userIds || []), newCollaboratorId]
            };
            onUpdateTrip(updatedTrip);

            setSuccessMsg(`已成功邀請 ${userData.username || email}！`);
            setEmail('');
        } catch (err: any) {
            console.error("Invite failed", err);
            setError("邀請失敗: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (uidToRemove: string) => {
        if (!confirm("確定要移除此協作者嗎？")) return;

        try {
            const tripRef = doc(db, "itineraries", trip.id);
            await updateDoc(tripRef, {
                collaborators: arrayRemove(uidToRemove),
                userIds: arrayRemove(uidToRemove)
            });

            const updatedTrip = {
                ...trip,
                collaborators: (trip.collaborators || []).filter(id => id !== uidToRemove),
                userIds: (trip.userIds || []).filter(id => id !== uidToRemove)
            };
            onUpdateTrip(updatedTrip);
        } catch (err: any) {
            alert("移除失敗: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-slide-up relative" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h3 className="text-xl font-bold text-ink mb-2 text-center">共編行程</h3>
                <p className="text-sm text-gray-500 text-center mb-6">邀請朋友一起規劃旅程</p>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 ml-1">邀請 Email</label>
                        <div className="flex gap-2">
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="friend@example.com"
                                className="flex-1 bg-gray-50 p-3 rounded-xl text-sm font-bold border border-gray-100 outline-none focus:border-coral transition-colors"
                            />
                            <button
                                onClick={handleInvite}
                                disabled={!email || isLoading}
                                className="bg-coral text-white px-4 rounded-xl font-bold text-sm shadow-lg shadow-coral/30 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none whitespace-nowrap"
                            >
                                {isLoading ? '...' : '邀請'}
                            </button>
                        </div>
                        {error && <p className="text-xs text-red-500 font-bold ml-1">{error}</p>}
                        {successMsg && <p className="text-xs text-green-500 font-bold ml-1">{successMsg}</p>}
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 mb-3">目前協作者</h4>
                        <div className="space-y-2">
                            {(!trip.collaborators || trip.collaborators.length === 0) && (
                                <p className="text-sm text-gray-400 italic text-center py-2">還沒有邀請任何人</p>
                            )}
                            {trip.collaborators?.map(uid => (
                                <div key={uid} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-coral/10 rounded-full flex items-center justify-center text-coral font-bold text-xs">
                                            User
                                        </div>
                                        <span className="text-sm font-bold text-gray-600 truncate max-w-[150px]">{uid.slice(0, 8)}...</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(uid)}
                                        className="text-xs text-red-400 hover:text-red-600 font-bold px-2 py-1"
                                    >
                                        移除
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareTripModal;
