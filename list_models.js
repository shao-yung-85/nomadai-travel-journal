
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const apiKey = 'AIzaSyBXnKuqh2CBcnSWsDt1rMKTHxnQ3LlNxSA';
const client = new GoogleGenAI({ apiKey: apiKey });

async function listModels() {
    try {
        const response = await client.models.list();
        let output = '';
        if (Array.isArray(response)) {
            response.forEach(model => output += model.name + '\n');
        } else if (response.models) {
            response.models.forEach(model => output += model.name + '\n');
        } else {
            output = JSON.stringify(response, null, 2);
        }
        console.log(output);
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
