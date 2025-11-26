import React, { useState, useRef } from 'react';
import { Memory, AppSettings } from '../types';
import { CameraIcon, TrashIcon, PlusIcon } from './Icons';

interface TripMemoryProps {
    memories: Memory[];
    onAddMemory: (memory: Memory) => void;
    onDeleteMemory: (id: string) => void;
    settings: AppSettings;
}

const TripMemory: React.FC<TripMemoryProps> = ({ memories, onAddMemory, onDeleteMemory, settings }) => {
    const [caption, setCaption] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedImage) return;

        const newMemory: Memory = {
            id: Date.now().toString(),
            userId: '', // Will be set by App.tsx logic or ignored if handled by parent
            imageUrl: selectedImage,
            caption: caption,
            date: new Date().toISOString()
        };

        onAddMemory(newMemory);
        setCaption('');
        setSelectedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="h-full flex flex-col bg-paper animate-slide-in pb-24">
            {/* Header */}
            <div className="px-6 py-6 bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-sand">
                <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
                    <CameraIcon className="w-8 h-8 text-coral" />
                    旅程回憶
                </h1>
                <p className="text-sm text-gray-400 mt-1">記錄旅途中的美好瞬間</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Upload Section */}
                <div className="bg-white rounded-3xl p-6 shadow-card border border-sand">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative w-full aspect-video rounded-2xl border-2 border-dashed border-sand flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-50 ${selectedImage ? 'border-none p-0 overflow-hidden' : ''}`}
                        >
                            {selectedImage ? (
                                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center text-gray-400">
                                    <CameraIcon className="w-12 h-12 mb-2" />
                                    <span className="font-medium">點擊上傳照片</span>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="寫下這張照片的故事..."
                            className="w-full bg-paper rounded-xl p-4 text-ink font-medium outline-none focus:ring-2 focus:ring-coral/50 transition-all border border-sand resize-none h-24"
                        />

                        <button
                            type="submit"
                            disabled={!selectedImage}
                            className={`w-full py-3.5 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${selectedImage ? 'bg-coral text-white shadow-coral/30 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            <PlusIcon className="w-5 h-5" />
                            新增回憶
                        </button>
                    </form>
                </div>

                {/* Memories Grid */}
                <div className="grid grid-cols-1 gap-6">
                    {memories.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p>還沒有任何回憶</p>
                            <p className="text-sm mt-2">快去上傳第一張照片吧！</p>
                        </div>
                    ) : (
                        memories.map((memory) => (
                            <div key={memory.id} className="bg-white rounded-3xl overflow-hidden shadow-card border border-sand group">
                                <div className="relative aspect-video">
                                    <img src={memory.imageUrl} alt={memory.caption} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-4">
                                        <button
                                            onClick={() => onDeleteMemory(memory.id)}
                                            className="p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-red-500 transition-colors"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <p className="text-ink font-medium whitespace-pre-wrap">{memory.caption}</p>
                                    <p className="text-xs text-gray-400 mt-3">
                                        {new Date(memory.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TripMemory;
