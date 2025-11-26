
import React, { useState, useRef } from 'react';
import { Trip, AppSettings } from '../types';
import { ChevronLeftIcon, CalendarIcon, CameraIcon, SparklesIcon } from './Icons';
import { generateCoverImage } from '../services/gemini';
import { translations } from '../utils/translations';

interface AddTripFormProps {
  onSave: (trip: Trip) => void;
  onCancel: () => void;
  settings: AppSettings;
}

const AddTripForm: React.FC<AddTripFormProps> = ({ onSave, onCancel, settings }) => {
  const t = translations[settings.language] || translations['zh-TW'];
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateCover = async () => {
    if (!title) {
      alert("Please enter title");
      return;
    }
    setIsGenerating(true);
    try {
      const img = await generateCoverImage(title);
      setCoverImage(img);
    } catch (e) {
      console.error(e);
      alert("Error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate) return;

    let finalCoverImage = coverImage;

    // If no cover image selected, generate one using Pollinations
    if (!finalCoverImage) {
      try {
        // Use Pollinations directly for instant result without awaiting API
        const prompt = `Cinematic travel photography of ${title}, 4k, high quality, sunny day`;
        const encoded = encodeURIComponent(prompt);
        const seed = Math.floor(Math.random() * 1000000);
        finalCoverImage = `https://image.pollinations.ai/prompt/${encoded}?width=1600&height=900&nologo=true&seed=${seed}&model=flux`;
      } catch (e) {
        console.error("Failed to generate default cover", e);
        finalCoverImage = `https://via.placeholder.com/1600x900/D4A574/FFFFFF?text=${encodeURIComponent(title)}`;
      }
    }

    const newTrip: Trip = {
      id: Date.now().toString(),
      title,
      startDate,
      endDate,
      itinerary: [],
      coverImage: finalCoverImage
    };

    onSave(newTrip);
  };

  return (
    <div className="flex flex-col h-full bg-paper pt-safe pt-12">
      <div className="px-4 py-3 flex items-center gap-2 bg-paper sticky top-0 z-10 border-b border-sand/50">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-white text-gray-500 active:scale-90 transition-transform">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-ink">{t.new_trip}</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8 flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 ml-1 uppercase">{t.destination}</label>
          <div className="relative">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="..."
              className="w-full p-5 bg-white rounded-3xl border border-sand focus:border-coral focus:ring-1 focus:ring-coral/50 transition-all text-lg font-bold text-ink outline-none placeholder:text-gray-300 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 ml-1 uppercase">{t.cover_photo}</label>
          <div className="w-full aspect-video rounded-3xl overflow-hidden bg-white border-2 border-dashed border-sand relative shadow-inner">
            {coverImage ? (
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <CameraIcon className="w-10 h-10 mb-2 opacity-50" />
                <span className="text-xs font-bold">Preview</span>
              </div>
            )}

            {coverImage && (
              <button
                type="button"
                onClick={() => setCoverImage(null)}
                className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-3 bg-white text-gray-600 rounded-2xl font-bold text-sm border border-sand hover:border-coral hover:text-coral transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CameraIcon className="w-4 h-4" /> {t.upload_photo}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

            <button
              type="button"
              onClick={handleGenerateCover}
              disabled={isGenerating || !title}
              className="flex-1 py-3 bg-purple-50 text-purple-600 rounded-2xl font-bold text-sm hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-100"
            >
              {isGenerating ? (
                <span className="animate-pulse">...</span>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" /> {t.ai_generate_cover}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase flex items-center gap-1">
              <CalendarIcon className="w-3 h-3 text-coral" /> {t.start_date}
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-4 bg-white rounded-2xl border border-sand focus:border-coral outline-none text-sm font-bold text-ink shadow-sm"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 ml-1 uppercase flex items-center gap-1">
              <CalendarIcon className="w-3 h-3 text-gray-400" /> {t.end_date}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-4 bg-white rounded-2xl border border-sand focus:border-coral outline-none text-sm font-bold text-ink shadow-sm"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full py-4 bg-coral text-white rounded-2xl font-bold text-lg shadow-float active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-coralDark ring-4 ring-white"
          >
            <span>{t.create_trip}</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white/70">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </button>
          <p className="text-center text-xs text-gray-400 mt-6 font-medium">{t.add_trip_hint}</p>
        </div>
      </form>
    </div>
  );
};

export default AddTripForm;
