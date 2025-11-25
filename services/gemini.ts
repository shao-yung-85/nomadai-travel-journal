
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const backupKey = 'AIzaSyAOtra718u35-8wCxRrdnq-Lh2P-Y39dow';

// Helper to wrap API calls with fallback
const callAiWithFallback = async (apiCall: (client: GoogleGenAI) => Promise<any>) => {
    try {
        // Try primary key (or backup if primary is missing)
        const client = new GoogleGenAI({ apiKey: apiKey || backupKey });
        return await apiCall(client);
    } catch (error: any) {
        console.warn("Primary API Key failed, trying backup...", error);
        // If primary failed, try backup explicitly
        try {
            const client = new GoogleGenAI({ apiKey: backupKey });
            return await apiCall(client);
        } catch (backupError) {
            console.error("Backup API Key also failed:", backupError);
            throw backupError;
        }
    }
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

export const editTravelPhoto = async (
    base64Image: string,
    prompt: string
): Promise<string> => {
    return callAiWithFallback(async (ai) => {
        const mimeType = getMimeType(base64Image);
        const cleanData = cleanBase64(base64Image);
        const model = 'gemini-1.5-flash';

        const response = await ai.models.generateContent({
            model: model,
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

export const generateCoverImage = async (location: string): Promise<string> => {
    return callAiWithFallback(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: {
                parts: [
                    {
                        text: `A beautiful, cinematic travel photography shot of ${location}. High quality, 4k, sunny day, inspiring travel vibes.`,
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
        throw new Error("No image generated");
    });
}

export const generateTripPlan = async (userPrompt: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];

    return callAiWithFallback(async (ai) => {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: `Help me plan a trip. ${userPrompt}`,
            config: {
                systemInstruction: `You are a professional travel agent AI. 
                Create a detailed itinerary based on the user's request. 
                
                CRITICAL PLANNING RULES:
                1. **Distance & Logic**: Group attractions that are geographically close to each other on the same day.
                2. **Feasibility**: Ensure the schedule is realistic.
                3. **Language**: All content MUST be in ${targetLang}.
                4. **Travel Info**: You MUST estimate the travel mode and duration to the NEXT activity.
                
                FORMAT REQUIREMENTS:
                Return response in JSON format matching the schema.
                Ensure 'itinerary' items include the 'day' field.
                Include 'travelToNext' for each item (except the last one of the day) describing how to get to the next spot.
                `,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        startDate: { type: Type.STRING },
                        endDate: { type: Type.STRING },
                        itinerary: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    day: { type: Type.INTEGER },
                                    time: { type: Type.STRING },
                                    activity: { type: Type.STRING },
                                    location: { type: Type.STRING },
                                    notes: { type: Type.STRING },
                                    travelToNext: {
                                        type: Type.OBJECT,
                                        properties: {
                                            mode: { type: Type.STRING, enum: ['WALK', 'TRAIN', 'BUS', 'CAR', 'FLIGHT'] },
                                            duration: { type: Type.STRING, description: "e.g. 15 min" },
                                            details: { type: Type.STRING, description: "e.g. JR Yamanote Line" }
                                        },
                                        nullable: true
                                    }
                                }
                            }
                        },
                        budget: {
                            type: Type.OBJECT,
                            properties: {
                                total: { type: Type.NUMBER },
                                currency: { type: Type.STRING },
                                spent: { type: Type.NUMBER },
                                categories: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            amount: { type: Type.NUMBER },
                                            color: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        },
                        packingList: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    item: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                    checked: { type: Type.BOOLEAN }
                                }
                            }
                        },
                        weather: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    date: { type: Type.STRING },
                                    tempHigh: { type: Type.NUMBER },
                                    tempLow: { type: Type.NUMBER },
                                    condition: { type: Type.STRING },
                                    icon: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text());
        }
        throw new Error("Empty response from AI");
    });
}

export const getVisaRequirements = async (passport: string, destination: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];
    return callAiWithFallback(async (ai) => {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: `I hold a ${passport} passport and want to travel to ${destination}. 
            What are the visa requirements, entry rules, and any vaccination requirements? 
            Provide a concise summary in Markdown format. 
            Include a 'Difficulty Level' (Easy, Moderate, Hard) at the top.
            Response MUST be in ${targetLang}.`
        });
        return response.text();
    });
};

export const getCulturalEtiquette = async (location: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];
    return callAiWithFallback(async (ai) => {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: `I am currently in (or planning to go to) ${location}. 
            Give me a quick guide on:
            1. Tipping customs (Restaurants, Taxis, Hotels).
            2. Major cultural taboos (Do's and Don'ts).
            3. Dress code advice.
            Keep it short, fun, and formatted in Markdown.
            Response MUST be in ${targetLang}.`
        });
        return response.text();
    });
};

export const getAttractionGuide = async (location: string, activity: string, language: string = 'zh-TW') => {
    const targetLang = langMap[language] || langMap['zh-TW'];
    return callAiWithFallback(async (ai) => {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: `Tell me about "${activity}" at "${location}". 
                Provide a very short fun fact, the best photo spot, and one "pro tip" for visiting.
                Format as simple Markdown (bold keys). Keep it under 100 words.
                Response MUST be in ${targetLang}.`
            });
            return response.text();
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
                model: "gemini-1.5-flash",
                contents: `I am travelling in ${country}. 
                List the emergency phone numbers for: Police, Ambulance, Fire.
                Also list the address and phone number of the nearest major hospital in the capital city.
                Format as a clear list.
                Response MUST be in ${targetLang}.`
            });
            return response.text();
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
                model: "gemini-1.5-flash",
                contents: `I am travelling to ${destination}. 
                What kind of credit cards are best to use there (Visa, Mastercard, Amex, JCB)?
                Are cash payments preferred?
                Any tips on currency exchange or dynamic currency conversion (DCC)?
                Keep it concise.
                Response MUST be in ${targetLang}.`
            });
            return response.text();
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
            model: "gemini-1.5-flash",
            contents: `I have a list of activities for one day. Reorder them to create the most efficient geographical route.
            
            Current Items: ${JSON.stringify(simplifiedItems)}
            
            Return ONLY a JSON array of strings, where each string is the 'id' of the activity in the new order.
            Do not change the time, just the order of visiting.
            Example response: ["id1", "id3", "id2"]`,
            config: {
                responseMimeType: "application/json"
            }
        });

        if (response.text) {
            return JSON.parse(response.text());
        }
        throw new Error("Empty response");
    });
};

export const getTranslation = async (text: string, targetLang: string, userLang: string = 'zh-TW'): Promise<string | null> => {
    return callAiWithFallback(async (ai) => {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: `Translate the following text to ${targetLang}.
                Text: "${text}"
                
                Only provide the translated text.`
            });
            return response.text();
        } catch (error) {
            console.error("Translation Error:", error);
            return null;
        }
    });
};
