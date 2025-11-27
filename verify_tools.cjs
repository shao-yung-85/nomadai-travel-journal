
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        // 1. Navigate to Home
        await page.goto('http://localhost:5173/nomadai-travel-journal/', { waitUntil: 'domcontentloaded' });
        console.log("Navigated to Home");

        // 2. Click "Start" (Login)
        await page.waitForSelector('button');
        const buttons = await page.$$('button');
        let startBtn = null;
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('開始規劃')) {
                startBtn = btn;
                break;
            }
        }
        if (startBtn) {
            await startBtn.click();
            console.log("Clicked Start");
        } else {
            console.log("Start button not found, maybe already logged in?");
        }

        await new Promise(r => setTimeout(r, 2000));

        // 3. Navigate to Tools (Menu)
        // Find the "Tools" or "工具" button in the bottom nav or home
        // Actually, based on previous knowledge, there is a "工具百寶箱" button on the main dashboard
        await page.waitForSelector('h2'); // Wait for dashboard

        // Find "工具百寶箱"
        const h2s = await page.$$('h2');
        let toolsBtn = null;
        for (const h2 of h2s) {
            const text = await page.evaluate(el => el.textContent, h2);
            if (text.includes('工具百寶箱')) {
                // The parent div is clickable
                toolsBtn = await page.evaluateHandle(el => el.closest('div').parentElement, h2);
                break;
            }
        }

        if (toolsBtn) {
            await toolsBtn.click();
            console.log("Clicked Tools Dashboard");
        } else {
            // Try finding by text in all divs if h2 fails
            const divs = await page.$$('div');
            for (const div of divs) {
                const text = await page.evaluate(el => el.textContent, div);
                if (text === '工具百寶箱') {
                    toolsBtn = div;
                    await toolsBtn.click();
                    console.log("Clicked Tools Dashboard (div match)");
                    break;
                }
            }
            if (!toolsBtn) {
                console.error("Tools button not found");
                // Take screenshot for debug
                await page.screenshot({ path: '/Users/tese/.gemini/antigravity/brain/415d864a-fa4b-4921-b984-d2dda87dcdc3/tools_not_found.png' });
                process.exit(1);
            }
        }

        await new Promise(r => setTimeout(r, 1000));

        // 4. Test Currency Converter
        console.log("Testing Currency Converter...");
        const currencyBtn = await page.evaluateHandle(() => {
            const elements = Array.from(document.querySelectorAll('h3'));
            return elements.find(el => el.textContent.includes('匯率計算'));
        });

        if (currencyBtn) {
            await currencyBtn.click();
            console.log("Opened Currency Converter");

            await new Promise(r => setTimeout(r, 1000));

            // Input amount
            await page.waitForSelector('input[type="number"]');
            await page.type('input[type="number"]', '100');
            console.log("Entered amount: 100");

            // Click Convert
            const convertBtn = await page.evaluateHandle(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                return btns.find(b => b.textContent.includes('轉換為台幣'));
            });

            if (convertBtn) {
                await convertBtn.click();
                console.log("Clicked Convert");
                await new Promise(r => setTimeout(r, 2000)); // Wait for API

                // Check result
                const result = await page.evaluate(() => {
                    const el = document.querySelector('.text-3xl.font-black');
                    return el ? el.textContent : null;
                });
                console.log("Currency Result:", result);

                if (!result) throw new Error("Currency conversion failed");

                // Go back
                const backBtn = await page.$('button'); // First button is usually back
                await backBtn.click();
                console.log("Went back to Tools Menu");
            }
        } else {
            console.error("Currency tool not found");
        }

        await new Promise(r => setTimeout(r, 1000));

        // 5. Test Translator Input
        console.log("Testing Translator Input...");
        const translatorBtn = await page.evaluateHandle(() => {
            const elements = Array.from(document.querySelectorAll('h3'));
            return elements.find(el => el.textContent.includes('隨身翻譯'));
        });

        if (translatorBtn) {
            await translatorBtn.click();
            console.log("Opened Translator");

            await new Promise(r => setTimeout(r, 1000));

            // Check for textarea
            const textarea = await page.$('textarea');
            if (textarea) {
                console.log("Textarea found!");
                await textarea.type("Hello World");
                const val = await page.evaluate(el => el.value, textarea);
                console.log("Input value:", val);
                if (val !== "Hello World") throw new Error("Textarea input failed");
            } else {
                throw new Error("Textarea not found in Translator");
            }
        } else {
            console.error("Translator tool not found");
        }

        console.log("All tests passed!");
        await page.screenshot({ path: '/Users/tese/.gemini/antigravity/brain/415d864a-fa4b-4921-b984-d2dda87dcdc3/tools_verified.png' });

    } catch (e) {
        console.error("Test failed:", e);
        const fs = require('fs');
        fs.writeFileSync('/Users/tese/.gemini/antigravity/brain/415d864a-fa4b-4921-b984-d2dda87dcdc3/error.log', e.stack || String(e));
        await page.screenshot({ path: '/Users/tese/.gemini/antigravity/brain/415d864a-fa4b-4921-b984-d2dda87dcdc3/tools_failed.png' });
    } finally {
        await browser.close();
    }
})();
