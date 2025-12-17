
import { GoogleGenAI } from "@google/genai";

const apiKey = 'AIzaSyBvNFuwIk0XCcmAacR02zVCwHsDQHLIgn4';

async function testKey() {
    console.log(`Testing API Key: ${apiKey}`);
    try {
        const client = new GoogleGenAI({ apiKey: apiKey });
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Hello, are you working?'
        });
        console.log('Success! Response:', response.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.toString().includes('403')) {
            console.error('Key is invalid or has no permissions.');
        }
    }
}

testKey();
