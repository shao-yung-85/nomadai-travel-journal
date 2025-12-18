
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.VITE_API_KEY || '';
const MODEL_NAME = 'gemini-2.5-flash-lite';

const generateTripPlan = async (userPrompt) => {
    const client = new GoogleGenAI({ apiKey: apiKey });

    const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: `Help me plan a trip. ${userPrompt}`,
        config: {
            systemInstruction: `You are a professional travel agent AI. 
            Create a detailed itinerary based on the user's request. 
            
            CRITICAL PLANNING RULES:
            1. **Distance & Logic**: Group attractions that are geographically close to each other on the same day.
            2. **Feasibility**: Ensure the schedule is realistic.
            3. **Language**: All content MUST be in Traditional Chinese (Taiwan).
            4. **Travel Info**: You MUST estimate the travel mode and duration to the NEXT activity.
            5. **Completeness**: You MUST generate a FULL itinerary with at least 3 activities per day. Do not leave the itinerary empty.
            
            FORMAT REQUIREMENTS:
            Return response in JSON format matching the schema.
            Ensure 'itinerary' items include the 'day' field.
            Include 'travelToNext' for each item (except the last one of the day) describing how to get to the next spot.
            Fill ALL fields: title, startDate, endDate, itinerary, budget, packingList, weather.
            `,
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    startDate: { type: "STRING" },
                    endDate: { type: "STRING" },
                    itinerary: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                id: { type: "STRING" },
                                day: { type: "INTEGER" },
                                time: { type: "STRING" },
                                activity: { type: "STRING" },
                                location: { type: "STRING" },
                                notes: { type: "STRING" },
                                travelToNext: {
                                    type: "OBJECT",
                                    properties: {
                                        mode: { type: "STRING", enum: ['WALK', 'TRAIN', 'BUS', 'CAR', 'FLIGHT'] },
                                        duration: { type: "STRING" },
                                        details: { type: "STRING" }
                                    },
                                    nullable: true
                                }
                            }
                        }
                    },
                    budget: {
                        type: "OBJECT",
                        properties: {
                            total: { type: "NUMBER" },
                            currency: { type: "STRING" },
                            spent: { type: "NUMBER" },
                            categories: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        name: { type: "STRING" },
                                        amount: { type: "NUMBER" },
                                        color: { type: "STRING" }
                                    }
                                }
                            }
                        }
                    },
                    packingList: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                id: { type: "STRING" },
                                item: { type: "STRING" },
                                category: { type: "STRING" },
                                checked: { type: "BOOLEAN" }
                            }
                        }
                    },
                    weather: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                date: { type: "STRING" },
                                tempHigh: { type: "NUMBER" },
                                tempLow: { type: "NUMBER" },
                                condition: { type: "STRING" },
                                icon: { type: "STRING" }
                            }
                        }
                    }
                }
            }
        }
    });

    let text = "";
    if (typeof response.text === 'string') {
        text = response.text;
    } else if (typeof response.text === 'function') {
        text = response.text();
    } else if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
    }

    console.log(JSON.stringify(JSON.parse(text), null, 2));
};

generateTripPlan("去東京玩五天");
