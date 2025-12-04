
import fetch from 'node-fetch';

const queries = [
    "那霸機場",
    "沖繩豬肉蛋飯糰 (那霸機場店) 或飯店check in（美榮橋站）",
    "沖繩豬肉蛋飯糰",
    "琉球新麵 通堂拉麵 小祿本店",
    "琉球新麵",
    "通堂拉麵",
    "波上宮",
    "奧武島"
];

const searchNominatim = async (query: string) => {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        console.log(`Searching: ${query}`);
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'NomadAI-Travel-Journal-Test/1.0'
            }
        });
        const data = await res.json();
        if (data && data.length > 0) {
            console.log(`✅ Found: ${query} -> ${data[0].lat}, ${data[0].lon}`);
        } else {
            console.log(`❌ Not Found: ${query}`);
        }
    } catch (e) {
        console.error(`Error searching ${query}:`, e);
    }
};

const run = async () => {
    for (const q of queries) {
        await searchNominatim(q);
        // Respect Nominatim rate limits (1 sec absolute minimum, being polite with 1.5s)
        await new Promise(r => setTimeout(r, 1500));
    }
};

run();
