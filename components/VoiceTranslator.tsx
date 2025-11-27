import React, { useState } from 'react';
import { voiceTranslate, speakText, stopSpeaking, speechSupport } from '../services/voiceTranslation';
import { MicrophoneIcon, SpeakerWaveIcon, StopCircleIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface VoiceTranslatorProps {
    defaultSourceLang?: string;
    defaultTargetLang?: string;
}

const VoiceTranslator: React.FC<VoiceTranslatorProps> = ({
    defaultSourceLang = 'zh-TW',
    defaultTargetLang = 'en-US'
}) => {
    const [sourceLang, setSourceLang] = useState(defaultSourceLang);
    const [targetLang, setTargetLang] = useState(defaultTargetLang);
    const [sourceText, setSourceText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState('');

    const languages = [
        { code: 'zh-TW', name: '繁體中文' },
        { code: 'en-US', name: 'English' },
        { code: 'ja-JP', name: '日本語' },
        { code: 'ko-KR', name: '한국어' },
        { code: 'th-TH', name: 'ไทย' }
    ];

    const handleVoiceTranslate = async () => {
        if (!speechSupport.recognition) {
            setError('您的瀏覽器不支援語音識別');
            return;
        }

        setError('');
        setIsListening(true);
        setSourceText('');
        setTranslatedText('');

        try {
            await voiceTranslate(
                sourceLang,
                targetLang,
                (transcript) => {
                    setSourceText(transcript);
                },
                (translation) => {
                    setTranslatedText(translation);
                    setIsSpeaking(true);
                },
                (err) => {
                    setError(`錯誤：${err}`);
                }
            );
        } catch (err) {
            console.error(err);
        } finally {
            setIsListening(false);
            setIsSpeaking(false);
        }
    };

    const handleSwapLanguages = () => {
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
        setSourceText('');
        setTranslatedText('');
    };

    const handleSpeak = (text: string, lang: string) => {
        if (!speechSupport.synthesis) {
            setError('您的瀏覽器不支援語音合成');
            return;
        }
        speakText(text, lang);
    };

    const handleStop = () => {
        stopSpeaking();
        setIsSpeaking(false);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-paper rounded-3xl shadow-float">
            <h2 className="text-2xl font-bold text-ink mb-6 text-center">🎤 語音即時翻譯</h2>

            {/* Language Selection */}
            <div className="flex items-center gap-4 mb-6">
                <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="flex-1 p-3 rounded-xl border-2 border-sand bg-white text-ink font-medium focus:border-coral outline-none"
                >
                    {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>

                <button
                    onClick={handleSwapLanguages}
                    className="p-3 rounded-full bg-coral text-white hover:bg-coralDark active:scale-95 transition-all"
                >
                    <ArrowsRightLeftIcon className="w-5 h-5" />
                </button>

                <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="flex-1 p-3 rounded-xl border-2 border-sand bg-white text-ink font-medium focus:border-coral outline-none"
                >
                    {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
            </div>

            {/* Translation Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Source Text */}
                <div className="bg-white p-4 rounded-2xl border border-sand min-h-[120px] flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">原文 (可輸入)</span>
                        {sourceText && (
                            <button
                                onClick={() => handleSpeak(sourceText, sourceLang)}
                                className="p-1 text-coral hover:text-coralDark"
                            >
                                <SpeakerWaveIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <textarea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="按下麥克風說話，或直接在此輸入文字..."
                        className="w-full flex-1 resize-none outline-none text-ink bg-transparent placeholder:text-gray-300"
                    />
                </div>

                {/* Translated Text */}
                <div className="bg-white p-4 rounded-2xl border border-sand min-h-[120px]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">翻譯</span>
                        {translatedText && (
                            <button
                                onClick={() => handleSpeak(translatedText, targetLang)}
                                className="p-1 text-coral hover:text-coralDark"
                            >
                                <SpeakerWaveIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-ink whitespace-pre-wrap">{translatedText || '翻譯結果將顯示在這裡...'}</p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {error}
                </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handleVoiceTranslate}
                    disabled={isListening || isSpeaking}
                    className={`flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-coral text-white hover:bg-coralDark active:scale-95'
                        }`}
                >
                    <MicrophoneIcon className="w-6 h-6" />
                    {isListening ? '正在聆聽...' : '開始翻譯'}
                </button>

                {(isListening || isSpeaking) && (
                    <button
                        onClick={handleStop}
                        className="px-6 py-4 rounded-2xl font-bold bg-gray-500 text-white hover:bg-gray-600 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <StopCircleIcon className="w-6 h-6" />
                        停止
                    </button>
                )}
            </div>

            {/* Browser Support Info */}
            {(!speechSupport.recognition || !speechSupport.synthesis) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                    ⚠️ 您的瀏覽器可能不完全支援語音功能。建議使用 Chrome、Edge 或 Safari 瀏覽器。
                </div>
            )}
        </div>
    );
};

export default VoiceTranslator;
