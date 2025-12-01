import { GoogleGenAI, Type } from "@google/genai";

// Safe API key retrieval for Vite environment
const getApiKey = () => {
    return import.meta.env.VITE_API_KEY || '';
};

const apiKey = getApiKey();
const backupKey = 'AIzaSyBu2o-gj4Mo1qVg-I7lnsTqbymn49EQUEY';

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
    // Helper to try geocoding with a specific key
    const tryGeocode = async (key: string | undefined) => {
        if (!key) return null; // If key is undefined or empty, don't even try
        try {
            const client = new GoogleGenAI({ apiKey: key });
            const response = await client.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `Convert this address to latitude and longitude coordinates: "${address}". 
                
                IMPORTANT: Return ONLY a JSON object in this exact format:
                {"lat": 25.0330, "lng": 121.5654}
                
                Do not include any explanations, just the JSON object.`,
                config: { responseMimeType: "application/json" }
            });
            const text = getResponseText(response);
            const coords = JSON.parse(text);
            if (coords.lat && coords.lng) {
                return { lat: parseFloat(coords.lat), lng: parseFloat(coords.lng) };
            }
        } catch (e) {
            console.warn(`Geocoding failed with key ${key.substring(0, 5)}...`, e);
            return null;
        }
        return null;
    };

    // 1. Try User Key (if provided)
    if (userApiKey) {
        const result = await tryGeocode(userApiKey);
        if (result) return result;
        console.log("User key failed, trying environment key...");
    }

    // 2. Try Environment Key (VITE_API_KEY)
    if (apiKey) {
        const result = await tryGeocode(apiKey);
        if (result) return result;
        console.log("Environment key failed, trying backup key...");
    }

    // 3. Try Backup Key
    if (backupKey) {
        return await tryGeocode(backupKey);
    }

    console.error("No API Key available for geocoding after all attempts.");
    return null;
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
