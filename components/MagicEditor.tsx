
import React, { useState, useRef } from 'react';
import { CameraIcon, SparklesIcon, ChevronLeftIcon } from './Icons';
import { editTravelPhoto } from '../services/gemini';
import { translations } from '../utils/translations';
import { AppSettings } from '../types';

interface MagicEditorProps {
  settings?: AppSettings;
  onBack: () => void;
}

const MagicEditor: React.FC<MagicEditorProps> = ({ settings, onBack }) => {
  const language = settings?.language || 'zh-TW';
  const t = translations[language] || translations['zh-TW'];
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
        setResultImage(null); // Reset result when new image is picked
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt) return;

    setIsLoading(true);
    setError(null);

    try {
      const editedImage = await editTravelPhoto(selectedImage, prompt);
      setResultImage(editedImage);
    } catch (err) {
      setError("Error");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-paper pt-safe">
      <div className="px-5 py-4 pt-9 bg-paper sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack}><ChevronLeftIcon className="w-6 h-6 text-gray-500" /></button>
          <h2 className="text-xl font-extrabold text-ink flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-coral" />
            {t.magic_editor_title}
          </h2>
        </div>
        <span className="text-[10px] font-bold bg-white text-coral border border-coral/20 px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm">Beta</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-32 no-scrollbar">
        {/* Input Area */}
        {!selectedImage ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sand rounded-3xl h-80 flex flex-col items-center justify-center bg-white cursor-pointer active:scale-[0.98] transition-all hover:border-coral hover:bg-white/80 group shadow-card"
          >
            <div className="w-20 h-20 bg-paper rounded-full shadow-inner flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <CameraIcon className="w-10 h-10 text-coral" />
            </div>
            <span className="text-ink font-bold text-lg">{t.upload_hint}</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Polaroid Previews */}
            <div className="flex gap-4 overflow-x-auto pb-6 snap-x no-scrollbar px-2">
              <div className="snap-center shrink-0 w-full bg-white p-3 pb-12 rounded-sm shadow-polaroid rotate-1 relative transition-transform hover:rotate-0 duration-300">
                <div className="aspect-square bg-gray-100 overflow-hidden mb-2">
                  <img src={selectedImage} alt="Original" className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-4 left-4 font-handwriting text-gray-500 text-sm font-bold">#Original</div>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setResultImage(null);
                    setPrompt('');
                  }}
                  className="absolute -top-2 -right-2 bg-white text-ink p-2 rounded-full shadow-lg border border-sand hover:text-coral"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>

              {resultImage && (
                <div className="snap-center shrink-0 w-full bg-white p-3 pb-12 rounded-sm shadow-polaroid -rotate-1 relative transition-transform hover:rotate-0 duration-300 ring-2 ring-coral/20">
                  <div className="aspect-square bg-gray-100 overflow-hidden mb-2">
                    <img src={resultImage} alt="Magic Result" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-4 left-4 font-handwriting text-coral font-bold flex items-center gap-1">
                    <SparklesIcon className="w-4 h-4" /> #MagicEdit
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div className="bg-white p-2 rounded-3xl shadow-card border border-sand">
              <div className="p-4">
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t.magic_prompt_placeholder}
                  className="w-full p-4 rounded-2xl bg-paper border-0 focus:ring-2 focus:ring-coral/50 outline-none text-base resize-none h-24 placeholder:text-gray-300 font-medium text-ink"
                />
              </div>

              {error && (
                <div className="mx-4 mb-2 text-red-500 text-xs bg-red-50 p-3 rounded-xl flex items-center gap-2 font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="p-2">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                  className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${isLoading || !prompt.trim()
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none'
                      : 'bg-coral hover:bg-coralDark hover:shadow-coral/30 active:scale-[0.98]'
                    }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t.generating}
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5 stroke-[2]" />
                      {t.start_magic}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MagicEditor;
