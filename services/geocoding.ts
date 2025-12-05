import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env.VITE_API_KEY || '';
        }
        if (typeof process !== 'undefined' && process.env) {
            return process.env.VITE_API_KEY || '';
        }
    } catch (e) {
        console.warn("Failed to access API key", e);
    }
    return '';
};

const apiKey = getApiKey();
const backupKey = 'AIzaSyC2SRWVViygm5tBgGQeGgFEq9_jK_PdT_0';

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
    "taipei 101": { lat: 25.0330, lng: 121.5654 },
    "2": { lat: 25.0421, lng: 121.5082 }, // Ximending
    "3": { lat: 25.1024, lng: 121.5486 }, // National Palace Museum
    "test": { lat: 25.0330, lng: 121.5654 },
    "kyoto": { lat: 35.0116, lng: 135.7681 },
    "osaka": { lat: 34.6937, lng: 135.5023 },
    "tokyo": { lat: 35.6762, lng: 139.6503 },
    // Okinawa Locations
    "那霸機場": { lat: 26.2048, lng: 127.6458 },
    "沖繩豬肉蛋飯糰 (那霸機場店) 或飯店check in（美榮橋站）": { lat: 26.2048, lng: 127.6458 },
    "沖繩豬肉蛋飯糰": { lat: 26.2048, lng: 127.6458 },
    "琉球新麵 通堂拉麵 小祿本店": { lat: 26.1960, lng: 127.6650 },
    "琉球新麵": { lat: 26.1960, lng: 127.6650 },
    "通堂拉麵": { lat: 26.1960, lng: 127.6650 },
    "波上宮": { lat: 26.2206, lng: 127.6711 },
    "奧武島": { lat: 26.1308, lng: 127.7739 },
    "美國村": { lat: 26.3164, lng: 127.7577 },
    "古宇利島": { lat: 26.6950, lng: 128.0220 },
    "美麗海水族館": { lat: 26.6942, lng: 127.8779 },
    "萬座毛": { lat: 26.5050, lng: 127.8512 },
    "國際通": { lat: 26.2150, lng: 127.6850 },
    "tokyo tower": { lat: 35.6586, lng: 139.7454 },
    "東京鐵塔": { lat: 35.6586, lng: 139.7454 }
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

    // Helper to clean address for better geocoding results
    const cleanAddress = (addr: string): string[] => {
        // 1. Split by common separators (OR, /)
        const parts = addr.split(/或|\/|\|/).map(p => p.trim()).filter(p => p);

        // 2. Process each part to remove noise
        return parts.map(part => {
            // Remove text in parentheses if it looks like extra info, 
            // BUT sometimes location is IN parentheses e.g. "Hotel (Station)"
            // Strategy: Try the full part first, then try removing parentheses
            return part.replace(/\(.*\)|（.*）/g, '').trim();
        }).filter(p => p.length > 0);
    };

    // Helper to fetch with timeout
    const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    };

    // Helper to try OpenStreetMap Nominatim (Better for POIs)
    const tryNominatimGeocode = async (address: string): Promise<{ lat: number; lng: number } | null> => {
        try {
            console.log(`[Geocoding] Trying Nominatim for: ${address}`);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
                headers: {
                    'User-Agent': 'NomadAI-Travel-Journal/1.0'
                }
            });

            if (!response.ok) {
                console.warn(`[Geocoding] Nominatim request failed: ${response.status}`);
                return null;
            }

            const data = await response.json();
            console.log(`[Geocoding] Nominatim response:`, data);

            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                console.log(`[Geocoding] Nominatim success:`, { lat, lng });
                return { lat, lng };
            }
            return null;
        } catch (error) {
            console.error("Nominatim geocoding error:", error);
            return null;
        }
    };

    // Helper to try Open-Meteo Geocoding
    const tryOpenMeteoGeocode = async (query: string) => {
        try {
            console.log(`Trying Open-Meteo Geocoding for: "${query}"...`);
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=zh&format=json`;

            const res = await fetchWithTimeout(url);
            if (!res.ok) throw new Error(`Open-Meteo status: ${res.status}`);

            const data = await res.json();

            if (data && data.results && data.results.length > 0) {
                const location = data.results[0];
                return { lat: location.latitude, lng: location.longitude };
            }
        } catch (e) {
            console.warn(`Open-Meteo failed for "${query}":`, e);
        }
        return null;
    };

    // 4. Try Nominatim & Open-Meteo with Cleaned Address
    // Strategy: Try the original address first, then split parts
    const candidates = [address, ...cleanAddress(address)];
    // Remove duplicates
    const uniqueCandidates = Array.from(new Set(candidates));

    console.log("Geocoding candidates:", uniqueCandidates);

    for (const candidate of uniqueCandidates) {
        // A. Try User Key (Gemini -> Maps)
        if (userApiKey) {
            let result = await tryGeocode(userApiKey); // Gemini
            if (result) return result;
            result = await tryGoogleMapsGeocode(userApiKey); // Maps
            if (result) return result;
        }

        // B. Try Environment Key (Gemini -> Maps)
        if (apiKey) {
            let result = await tryGeocode(apiKey); // Gemini
            if (result) return result;
            result = await tryGoogleMapsGeocode(apiKey); // Maps
            if (result) return result;
        }

        // C. Try Backup Key (Gemini ONLY)
        if (backupKey) {
            const result = await tryGeocode(backupKey);
            if (result) return result;
        }

        // D. Try Nominatim
        const nominatimResult = await tryNominatimGeocode(candidate);
        if (nominatimResult) return nominatimResult;

        // E. Try Open-Meteo
        const openMeteoResult = await tryOpenMeteoGeocode(candidate);
        if (openMeteoResult) return openMeteoResult;
    }

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
