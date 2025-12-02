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
/**
 * 使用 Gemini AI 將地址轉換為經緯度座標
 */
const TEST_LOCATIONS: Record<string, { lat: number, lng: number }> = {
    "1": { lat: 25.0330, lng: 121.5654 }, // Taipei 101
    "2": { lat: 25.0421, lng: 121.5082 }, // Ximending
    "3": { lat: 25.1024, lng: 121.5486 }, // National Palace Museum
    "test": { lat: 25.0330, lng: 121.5654 },
    "kyoto": { lat: 35.0116, lng: 135.7681 },
    "osaka": { lat: 34.6937, lng: 135.5023 },
    "tokyo": { lat: 35.6762, lng: 139.6503 }
};

export const geocodeAddress = async (address: string, userApiKey?: string): Promise<{ lat: number; lng: number } | null> => {
    // 0. Check Test Locations first
    const normalizedAddr = address.toLowerCase().trim();
    if (TEST_LOCATIONS[normalizedAddr]) {
        console.log(`Using Test Location for: ${address}`);
        return TEST_LOCATIONS[normalizedAddr];
    }

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

    // Helper to try Google Maps Geocoding API
    const tryGoogleMapsGeocode = async (key: string) => {
        if (!key) return null;
        try {
            console.log(`Trying Google Maps Geocoding API with key ${key.substring(0, 5)}...`);
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return { lat: location.lat, lng: location.lng };
            } else {
                console.warn('Google Maps Geocoding API error:', data.status, data.error_message);
                // Store error for debug panel
                window.localStorage.setItem('last_geocode_error', `${data.status}: ${data.error_message || 'Unknown error'}`);
            }
        } catch (e) {
            console.warn('Google Maps Geocoding API request failed:', e);
            window.localStorage.setItem('last_geocode_error', `Network Error: ${e}`);
        }
        return null;
    };

    // Helper to try Open-Meteo Geocoding (More stable CORS)
    const tryOpenMeteoGeocode = async () => {
        try {
            console.log(`Trying Open-Meteo Geocoding...`);
            // Open-Meteo Geocoding API
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=zh&format=json`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`Open-Meteo status: ${res.status}`);

            const data = await res.json();

            if (data && data.results && data.results.length > 0) {
                const location = data.results[0];
                return { lat: location.latitude, lng: location.longitude };
            } else {
                console.warn('Open-Meteo found no results.');
                window.localStorage.setItem('last_geocode_error', 'Open-Meteo: No results found');
            }
        } catch (e) {
            console.warn('Open-Meteo request failed:', e);
            window.localStorage.setItem('last_geocode_error', `Open-Meteo Error: ${e}`);
        }
        return null;
    };

    // 1. Try User Key (Gemini -> Maps)
    if (userApiKey) {
        let result = await tryGeocode(userApiKey);
        if (result) return result;

        // Fallback to Maps API with user key
        result = await tryGoogleMapsGeocode(userApiKey);
        if (result) return result;

        console.log("User key failed, trying environment key...");
    }

    // 2. Try Environment Key (Gemini -> Maps)
    if (apiKey) {
        let result = await tryGeocode(apiKey);
        if (result) return result;

        // Fallback to Maps API with env key
        result = await tryGoogleMapsGeocode(apiKey);
        if (result) return result;

        console.log("Environment key failed, trying backup key...");
    }

    // 3. Try Backup Key (Gemini ONLY)
    // We use the backup key for Gemini (AI) because it's smarter at finding POIs than Open-Meteo.
    // We DO NOT use it for Google Maps Geocoding API to avoid REQUEST_DENIED errors.
    if (backupKey) {
        console.log("Trying Backup Key with Gemini...");
        const result = await tryGeocode(backupKey);
        if (result) return result;
    }

    // 4. Final Fallback: Open-Meteo - No Key Required
    console.log("Falling back to Open-Meteo (Free Service)...");
    return await tryOpenMeteoGeocode();
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
