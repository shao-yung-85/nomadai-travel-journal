
import { GoogleGenAI } from "@google/genai";

const API_KEY = 'AIzaSyC_5wGQU-rJCj4A8La4q9BloT0PiYwc_TY';

const MODEL_LIST = [
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-flash-latest'
];

async function testKey() {
    console.log(`Testing API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 5)}`);
    const client = new GoogleGenAI({ apiKey: API_KEY });

    for (const model of MODEL_LIST) {
        console.log(`\nTesting model: ${model}`);
        try {
            const response = await client.models.generateContent({
                model: model,
                contents: "Say 'Hello, World!'",
            });

            let text = '';
            if (typeof response.text === 'function') {
                text = response.text();
            } else if (response.candidates && response.candidates[0].content.parts[0].text) {
                text = response.candidates[0].content.parts[0].text;
            }

            console.log(`[SUCCESS] Model ${model} responded: "${text.trim()}"`);
            // If one works, the key is valid for at least one model.
        } catch (error: any) {
            console.error(`[FAILURE] Model ${model} failed:`, error.message || error);
        }
    }
}

testKey().catch(console.error);
