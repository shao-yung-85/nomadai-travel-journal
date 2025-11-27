
import { GoogleGenAI, Type } from "@google/genai";

// Safe API key retrieval for Vite environment
const getApiKey = () => {
    try {
        // 1. Check LocalStorage (User entered key)
        const storedKey = localStorage.getItem('nomad_user_api_key');
        if (storedKey) return storedKey;

        // 2. Check Environment Variable
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env.VITE_API_KEY || '';
        }
    } catch (e) {
        console.warn("Failed to access API key", e);
    }
    return '';
};

// Helper to wrap API calls with fallback
const callAiWithFallback = async (apiCall: (client: GoogleGenAI) => Promise<any>) => {
    // Always get the latest key from storage/env
    const currentKey = getApiKey();

    // 1. Try Primary Key
    if (currentKey) {
        try {
            const client = new GoogleGenAI({ apiKey: currentKey });
            return await apiCall(client);
        } catch (error: any) {
            console.warn("Primary API Key failed", error);
            // If it's a permission error (403), throw immediately to let user know key is invalid
            if (error.message?.includes('403') || error.toString().includes('403')) {
                throw new Error("Invalid API Key (403). Please check your key in Settings.");
            }
        }
    } else {
        throw new Error("API key is missing. Please provide a valid API key in Settings.");
    }

    throw new Error("AI Service Failed. Please check your API Key.");
};



// Helper to strip data:image/png;base64, prefix
const cleanBase64 = (base64Data: string) => {
    return base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

const getMimeType = (base64Data: string) => {
    const match = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    return match ? match[1] : 'image/jpeg';
};

const langMap: { [key: string]: string } = {
    'zh-TW': 'Traditional Chinese (Taiwan) (繁體中文)',
    'en-US': 'English',
    'ja-JP': 'Japanese'
};

// Helper to safely extract text from response
const getResponseText = (response: any): string => {
    if (typeof response.text === 'string') {
        return response.text;
    }
    if (typeof response.text === 'function') {
        return response.text();
    }
    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts[0].text) {
        return response.candidates[0].content.parts[0].text;
    }
    throw new Error("No text found in AI response");
};

const MODEL_NAME = 'gemini-2.0-flash';

// Note: Image generation and editing is not supported by Gemini Flash models
// This function is disabled until we integrate with an image generation API
export const editTravelPhoto = async (
    base64Image: string,
    prompt: string
): Promise<string> => {
    console.warn('Image editing is not supported. Returning original image.');
    return base64Image;
};

/*
// Original implementation (requires image generation model)
export const editTravelPhoto = async (
    base64Image: string,
    prompt: string
): Promise<string> => {
    return callAiWithFallback(async (ai) => {
        const mimeType = getMimeType(base64Image);
        const cleanData = cleanBase64(base64Image);

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: cleanData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: `Edit this image based on the following instruction: ${prompt}. Return the edited image.`,
                    },
                ],
            },
        });

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image generated in response");
    });
};
*/

export const generateCoverImage = async (location: string): Promise<string> => {
    try {
        // Use Pollinations.ai for real AI image generation (Free, No API Key required)
        // Format: https://image.pollinations.ai/prompt/{prompt}
        const prompt = `Cinematic travel photography of ${location}, 4k, high quality, sunny day, vibrant colors, wide angle`;
        const encodedPrompt = encodeURIComponent(prompt);
        // Add random seed to ensure fresh images
        const seed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1600&height=900&nologo=true&seed=${seed}&model=flux`;

        // Return the URL directly
        return imageUrl;
    } catch (error) {
        console.error('Failed to generate cover image:', error);
        // Fallback to placeholder
        return `https://via.placeholder.com/1600x900/D4A574/FFFFFF?text=${encodeURIComponent(location)}`;
    }
}

export const generateTripPlan = async (userPrompt: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];

    return callAiWithFallback(async (ai) => {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Help me plan a trip. ${userPrompt}`,
            config: {
                systemInstruction: `You are a professional travel agent AI. 
                Create a detailed itinerary based on the user's request. 
                
                CRITICAL PLANNING RULES:
                1. **Distance & Logic**: Group attractions that are geographically close to each other on the same day.
                2. **Feasibility**: Ensure the schedule is realistic.
                3. **Language**: All content MUST be in ${targetLang}.
                4. **Travel Info**: You MUST estimate the travel mode and duration to the NEXT activity. This is mandatory for all items except the last one of the day.
                5. **Completeness**: You MUST generate a FULL itinerary with at least 3 activities per day. Do not leave the itinerary empty.
                
                FORMAT REQUIREMENTS:
                Return response in valid JSON format. Do not use Markdown code blocks.
                The JSON must strictly follow this structure:
                {
                    "title": "Trip Title",
                    "startDate": "YYYY-MM-DD",
                    "endDate": "YYYY-MM-DD",
                    "itinerary": [
                        {
                            "id": "unique_id",
                            "day": 1,
                            "time": "09:00",
                            "activity": "Activity Name",
                            "location": "Location Address",
                            "notes": "Tips",
                            "travelToNext": {
                                "mode": "WALK/TRAIN/BUS/CAR",
                                "duration": "15 min",
                                "details": "Route details"
                            }
                        }
                    ],
                    "budget": {
                        "total": 10000,
                        "currency": "TWD",
                        "expenses": []
                    },
                    "packingList": [],
                    "weather": [
                        {
                            "date": "YYYY-MM-DD",
                            "condition": "Sunny",
                            "tempLow": 20,
                            "tempHigh": 30,
                            "icon": "☀️"
                        }
                    ]
                }
                `,
                responseMimeType: "application/json"
            }
        });

        const text = getResponseText(response);
        if (text) {
            // Clean markdown code blocks if present (though we asked not to use them)
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        }
        throw new Error("Empty response from AI");
    });
}

export const getVisaRequirements = async (passport: string, destination: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];
    return callAiWithFallback(async (ai) => {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `I hold a ${passport} passport and want to travel to ${destination}. 
            What are the visa requirements, entry rules, and any vaccination requirements? 
            Provide a concise summary in Markdown format. 
            Include a 'Difficulty Level' (Easy, Moderate, Hard) at the top.
            Response MUST be in ${targetLang}.`
        });
        return getResponseText(response);
    });
};

export const getCulturalEtiquette = async (location: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];
    return callAiWithFallback(async (ai) => {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `I am currently in (or planning to go to) ${location}. 
            Give me a quick guide on:
            1. Tipping customs (Restaurants, Taxis, Hotels).
            2. Major cultural taboos (Do's and Don'ts).
            3. Dress code advice.
            Keep it short, fun, and formatted in Markdown.
            Response MUST be in ${targetLang}.`
        });
        return getResponseText(response);
    });
};

export const getAttractionGuide = async (location: string, activity: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];
    return callAiWithFallback(async (ai) => {
        try {
            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: `Tell me about "${activity}" at "${location}". 
                Provide a very short fun fact, the best photo spot, and one "pro tip" for visiting.
                Format as simple Markdown (bold keys). Keep it under 100 words.
                Response MUST be in ${targetLang}.`
            });
            return getResponseText(response);
        } catch (error) {
            console.error("Error fetching attraction guide:", error);
            return "暫時無法取得導覽資訊，請稍後再試。";
        }
    });
};

export const getEmergencyInfo = async (country: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];
    return callAiWithFallback(async (ai) => {
        try {
            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: `I am travelling in ${country}. 
                List the emergency phone numbers for: Police, Ambulance, Fire.
                Also list the address and phone number of the nearest major hospital in the capital city.
                Format as a clear list.
                Response MUST be in ${targetLang}.`
            });
            return getResponseText(response);
        } catch (error) {
            return "無法取得緊急資訊。請直接撥打國際通用緊急電話 112。";
        }
    });
}

export const getCreditCardAdvice = async (destination: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];
    return callAiWithFallback(async (ai) => {
        try {
            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: `I am travelling to ${destination}. 
                What kind of credit cards are best to use there (Visa, Mastercard, Amex, JCB)?
                Are cash payments preferred?
                Any tips on currency exchange or dynamic currency conversion (DCC)?
                Keep it concise.
                Response MUST be in ${targetLang}.`
            });
            return getResponseText(response);
        } catch (error) {
            return "無法取得建議。一般建議攜帶 Visa/Mastercard 並準備少量當地現金。";
        }
    });
}

export const optimizeRoute = async (items: any[], language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];
    return callAiWithFallback(async (ai) => {
        // Simplify items for the prompt to save tokens
        const simplifiedItems = items.map((item: any) => ({
            id: item.id,
            activity: item.activity,
            location: item.location,
            time: item.time
        }));

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `I have a list of activities for one day. Reorder them to create the most efficient geographical route.
            
            Current Items: ${JSON.stringify(simplifiedItems)}
            
            Return ONLY a JSON array of strings, where each string is the 'id' of the activity in the new order.
            Do not change the time, just the order of visiting.
            Example response: ["id1", "id3", "id2"]`,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = getResponseText(response);
        if (text) {
            return JSON.parse(text);
        }
        throw new Error("Empty response");
    });
};

export const getTranslation = async (text: string, targetLang: string, userLang: string = 'zh-TW'): Promise<string | null> => {
    return callAiWithFallback(async (ai) => {
        try {
            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: `Translate the following text to ${targetLang}.
                Text: "${text}"
                
                Only provide the translated text.`
            });
            return getResponseText(response);
        } catch (error) {
            console.error("Translation Error:", error);
            return null;
        }
    });
};

export const getClothingAdvice = async (weather: any[], location: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];
    return callAiWithFallback(async (ai) => {
        try {
            const weatherSummary = weather.map(w => `${w.date}: ${w.condition}, ${w.tempLow}°C - ${w.tempHigh}°C`).join('\n');
            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: `I am travelling to ${location}. Here is the weather forecast:
                ${weatherSummary}
                
                Based on this weather, give me a VERY SHORT, ONE-LINE clothing advice summary.
                Example: "It's rainy and cold, so bring a heavy coat and umbrella."
                Keep it under 20 words.
                Response MUST be in ${targetLang}.`
            });
            return getResponseText(response);
        } catch (error) {
            console.error("Clothing Advice Error:", error);
            return "暫時無法取得穿搭建議。";
        }
    });
};
