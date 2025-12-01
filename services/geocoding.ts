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

    // Helper to try OpenStreetMap (Nominatim)
    const tryNominatimGeocode = async () => {
        try {
            console.log(`Trying OpenStreetMap (Nominatim)...`);
            // Nominatim requires a unique User-Agent or Referer. Browser sends Referer.
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=jsonv2&limit=1`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`Nominatim status: ${res.status}`);

            const data = await res.json();

            if (data && data.length > 0) {
                const location = data[0];
                return { lat: parseFloat(location.lat), lng: parseFloat(location.lon) };
            } else {
                console.warn('Nominatim found no results.');
                window.localStorage.setItem('last_geocode_error', 'Nominatim: No results found');
            }
        } catch (e) {
            console.warn('Nominatim request failed:', e);
            window.localStorage.setItem('last_geocode_error', `Nominatim Error: ${e}`);
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

    // 3. Try Backup Key (Gemini -> Maps)
    if (backupKey) {
        let result = await tryGeocode(backupKey);
        if (result) return result;

        // Fallback to Maps API with backup key
        result = await tryGoogleMapsGeocode(backupKey);
        if (result) return result;
    }

    // 4. Final Fallback: OpenStreetMap (Nominatim) - No Key Required
    console.log("All keys failed. Falling back to OpenStreetMap (Nominatim)...");
    return await tryNominatimGeocode();
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
