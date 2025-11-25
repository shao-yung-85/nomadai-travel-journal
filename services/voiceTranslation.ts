/**
 * 語音翻譯服務
 * 支援語音輸入、AI翻譯、語音輸出
 */

import { getTranslation } from './gemini';

// 檢查瀏覽器支援
const isSpeechRecognitionSupported = () => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

const isSpeechSynthesisSupported = () => {
    return 'speechSynthesis' in window;
};

/**
 * 語音輸入（語音轉文字）
 */
export const startSpeechRecognition = (
    language: string = 'zh-TW',
    onResult: (text: string) => void,
    onError?: (error: any) => void
): any => {
    if (!isSpeechRecognitionSupported()) {
        onError?.('瀏覽器不支援語音識別');
        return null;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
    };

    recognition.onerror = (event: any) => {
        onError?.(event.error);
    };

    recognition.start();
    return recognition;
};

/**
 * 文字轉語音
 */
export const speakText = (
    text: string,
    language: string = 'zh-TW',
    onEnd?: () => void
): void => {
    if (!isSpeechSynthesisSupported()) {
        console.error('瀏覽器不支援語音合成');
        return;
    }

    // 停止當前播放
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (onEnd) {
        utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
};

/**
 * 停止語音播放
 */
export const stopSpeaking = (): void => {
    if (isSpeechSynthesisSupported()) {
        window.speechSynthesis.cancel();
    }
};

/**
 * 取得可用的語音列表
 */
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
    if (!isSpeechSynthesisSupported()) {
        return [];
    }
    return window.speechSynthesis.getVoices();
};

/**
 * 雙向語音翻譯
 * 1. 語音輸入（來源語言）
 * 2. AI 翻譯
 * 3. 語音輸出（目標語言）
 */
export const voiceTranslate = async (
    sourceLang: string,
    targetLang: string,
    onTranscript?: (text: string) => void,
    onTranslation?: (text: string) => void,
    onError?: (error: any) => void
): Promise<void> => {
    return new Promise((resolve, reject) => {
        // 步驟1：語音輸入
        const recognition = startSpeechRecognition(
            sourceLang,
            async (transcript) => {
                onTranscript?.(transcript);

                try {
                    // 步驟2：AI 翻譯
                    const translated = await getTranslation(transcript, targetLang, sourceLang);

                    if (translated) {
                        onTranslation?.(translated);

                        // 步驟3：語音輸出
                        speakText(translated, targetLang, () => {
                            resolve();
                        });
                    } else {
                        onError?.('翻譯失敗');
                        reject('Translation failed');
                    }
                } catch (error) {
                    onError?.(error);
                    reject(error);
                }
            },
            (error) => {
                onError?.(error);
                reject(error);
            }
        );

        if (!recognition) {
            reject('Speech recognition not supported');
        }
    });
};

export const speechSupport = {
    recognition: isSpeechRecognitionSupported(),
    synthesis: isSpeechSynthesisSupported()
};
