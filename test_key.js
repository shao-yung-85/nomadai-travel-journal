
import { GoogleGenAI } from "@google/genai";

const backupKey = 'AIzaSyAOtra718u35-8wCxRrdnq-Lh2P-Y39dow';

async function testKey() {
    console.log("Testing API Key with gemini-2.5-flash-preview-09-2025...");
    try {
        const genAI = new GoogleGenAI({ apiKey: backupKey });

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash-preview-09-2025",
            contents: "Hello, are you working?"
        });

        console.log("Success!");
        console.log("Response keys:", Object.keys(response));
        // console.log("Full response:", JSON.stringify(response, null, 2)); 

        if (typeof response.text === 'function') {
            console.log("response.text() result:", response.text());
        } else {
            console.log("response.text is:", typeof response.text);
            // Try to find where the text is
            if (response.candidates && response.candidates[0].content.parts[0].text) {
                console.log("Found text in candidates:", response.candidates[0].content.parts[0].text);
            }
        }

    } catch (error) {
        console.error("Error testing key:", error);
    }
}

testKey();
