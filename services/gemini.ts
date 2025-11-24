
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
    if (!aiClient) {
        if (!apiKey) {
            console.warn("Gemini API Key is missing!");
            // We don't throw here to avoid crashing the app on load, 
            // but calls will fail later.
        }
        aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
};

// Helper to strip data:image/png;base64, prefix
const cleanBase64 = (base64Data: string) => {
    return base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

const getMimeType = (base64Data: string) => {
    const match = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    return match ? match[1] : 'image/jpeg';
};

export const editTravelPhoto = async (
    base64Image: string,
    prompt: string
): Promise<string> => {
    try {
        const mimeType = getMimeType(base64Image);
        const cleanData = cleanBase64(base64Image);

        // Using gemini-2.5-flash-image (Nano Banana) for image editing tasks
        const model = 'gemini-2.5-flash-image';

        const response = await getAiClient().models.generateContent({
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

        // Extract image from response parts
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    // Construct a usable data URI
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }

        throw new Error("No image generated in response");
    } catch (error) {
        console.error("Error editing travel photo:", error);
        throw error;
    }
};

export const generateCoverImage = async (location: string): Promise<string> => {
    try {
        const response = await getAiClient().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        text: `A beautiful, cinematic travel photography shot of ${location}. High quality, 4k, sunny day, inspiring travel vibes.`,
                    },
                ],
            },
        });

        // Extract image from response parts
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image generated");
    } catch (error) {
        console.error("Error generating cover image:", error);
        throw error;
    }
}

export const generateTripPlan = async (userPrompt: string, language: string = 'zh-TW') => {
    const langMap: { [key: string]: string } = {
        'zh-TW': 'Traditional Chinese (Taiwan) (繁體中文)',
        'en-US': 'English',
        'ja-JP': 'Japanese'
    };
    const targetLang = langMap[language] || langMap['zh-TW'];

    try {
        const response = await getAiClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Help me plan a trip. ${userPrompt}`,
            config: {
                systemInstruction: `You are a professional travel agent AI. 
                Create a detailed itinerary based on the user's request. 
                
                CRITICAL PLANNING RULES:
                1. **Distance & Logic**: Group attractions that are geographically close to each other on the same day to minimize travel time. Do not jump between distant locations in one day.
                2. **Feasibility**: Ensure the schedule is realistic. Allow enough time for travel and meals. Do not pack too many activities.
                3. **Language**: All content MUST be in ${targetLang}.
                
                FORMAT REQUIREMENTS:
                Return response in JSON format matching the schema.
                Ensure 'itinerary' items include the 'day' field (e.g., 1, 2, 3).
                Dates should be relative to now if not specified.
                Include realistic mock budget data in local currency.
                `,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Trip title" },
                        startDate: { type: Type.STRING, description: "YYYY-MM-DD" },
                        endDate: { type: Type.STRING, description: "YYYY-MM-DD" },
                        itinerary: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    day: { type: Type.INTEGER, description: "Day number of the trip (1, 2, 3...)" },
                                    time: { type: Type.STRING, description: "HH:MM" },
                                    activity: { type: Type.STRING },
                                    location: { type: Type.STRING },
                                    notes: { type: Type.STRING, description: "Transport info or tips" }
                                }
                            }
                        },
                        budget: {
                            type: Type.OBJECT,
                            properties: {
                                total: { type: Type.NUMBER },
                                currency: { type: Type.STRING, enum: ["TWD", "JPY", "USD", "EUR"] },
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
                                    date: { type: Type.STRING, description: "MM/DD" },
                                    tempHigh: { type: Type.NUMBER },
                                    tempLow: { type: Type.NUMBER },
                                    condition: { type: Type.STRING, description: "Sunny, Rainy, Cloudy etc" },
                                    icon: { type: Type.STRING, description: "Single emoji representing weather" }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("Empty response from AI");
    } catch (error) {
        console.error("Error generating trip plan:", error);
        throw error;
    }
}

export const getVisaRequirements = async (passport: string, destination: string) => {
    try {
        const response = await getAiClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `I hold a ${passport} passport and want to travel to ${destination}. 
            What are the visa requirements, entry rules, and any vaccination requirements? 
            Provide a concise summary in Markdown format. 
            Include a 'Difficulty Level' (Easy, Moderate, Hard) at the top.`
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching visa info:", error);
        throw error;
    }
};

export const getCulturalEtiquette = async (location: string) => {
    try {
        const response = await getAiClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `I am currently in (or planning to go to) ${location}. 
            Give me a quick guide on:
            1. Tipping customs (Restaurants, Taxis, Hotels).
            2. Major cultural taboos (Do's and Don'ts).
            3. Dress code advice.
            Keep it short, fun, and formatted in Markdown.`
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching cultural tips:", error);
        throw error;
    }
};

export const getAttractionGuide = async (location: string, activity: string) => {
    try {
        const response = await getAiClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Tell me about "${activity}" at "${location}". 
            Provide a very short fun fact, the best photo spot, and one "pro tip" for visiting.
            Format as simple Markdown (bold keys). Keep it under 100 words.`
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching attraction guide:", error);
        return "暫時無法取得導覽資訊，請稍後再試。";
    }
};

export const getEmergencyInfo = async (country: string) => {
    try {
        const response = await getAiClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `I am travelling in ${country}. 
            List the emergency phone numbers for: Police, Ambulance, Fire.
            Also list the address and phone number of the nearest major hospital in the capital city.
            Format as a clear list.`
        });
        return response.text;
    } catch (error) {
        return "無法取得緊急資訊。請直接撥打國際通用緊急電話 112。";
    }
}

export const getCreditCardAdvice = async (destination: string) => {
    try {
        const response = await getAiClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `I am travelling to ${destination}. 
            What kind of credit cards are best to use there (Visa, Mastercard, Amex, JCB)?
            Are cash payments preferred?
            Any tips on currency exchange or dynamic currency conversion (DCC)?
            Keep it concise.`
        });
        return response.text;
    } catch (error) {
        return "無法取得建議。一般建議攜帶 Visa/Mastercard 並準備少量當地現金。";
    }
}
