import { GoogleGenAI, Type } from "@google/genai";

// Safe API key retrieval for Vite environment
const getApiKey = () => {
    return import.meta.env.VITE_API_KEY || '';
};

const apiKey = getApiKey();
const backupKey = 'AIzaSyAOtra718u35-8wCxRrdnq-Lh2P-Y39dow';

// Helper to extract text from response
const getResponseText = (response: any): string => {
    if (typeof response.text === 'string') {
        return response.text;
    }
    if (typeof response.text === 'function') {
        return response.text();
    }
    if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
        return response.candidates[0].content.parts[0].text;
    }
    throw new Error("No text found in AI response");
};

/**
 * 使用 Gemini AI 將地址轉換為經緯度座標
 */
/**
 * 使用 Gemini AI 將地址轉換為經緯度座標
 */
export const geocodeAddress = async (address: string, userApiKey?: string): Promise<{ lat: number; lng: number } | null> => {
    try {
        const keyToUse = userApiKey || apiKey || backupKey;
        if (!keyToUse) {
            console.error("No API Key available for geocoding");
            return null;
        }

        const client = new GoogleGenAI({ apiKey: keyToUse });

        const response = await client.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: `Convert this address to latitude and longitude coordinates: "${address}". 
            
            IMPORTANT: Return ONLY a JSON object in this exact format:
            {"lat": 25.0330, "lng": 121.5654}
            
            Do not include any explanations, just the JSON object.`,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = getResponseText(response);
        const coords = JSON.parse(text);

        if (coords.lat && coords.lng) {
            return { lat: parseFloat(coords.lat), lng: parseFloat(coords.lng) };
        }

        return null;
    } catch (error) {
        console.error('Geocoding failed:', error);
        return null;
    }
};

/**
 * 批次轉換多個地址
 */
export const geocodeMultiple = async (addresses: string[]): Promise<Array<{ address: string; coords: { lat: number; lng: number } | null }>> => {
    const results = await Promise.all(
        addresses.map(async (address) => ({
            address,
            coords: await geocodeAddress(address)
        }))
    );
    return results;
};
