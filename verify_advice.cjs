
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // 1. Navigate
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

        // 2. Login
        // Wait for button to be available
        try {
            await page.waitForSelector('button', { timeout: 2000 });
            const buttons = await page.$$('button');
            let loginBtn = null;
            for (const btn of buttons) {
                const text = await page.evaluate(el => el.textContent, btn);
                if (text.includes('登入')) {
                    loginBtn = btn;
                    break;
                }
            }

            if (loginBtn) {
                await page.type('input[type="text"]', 'ai_test_user');
                await page.type('input[type="password"]', '123');
                await loginBtn.click();
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
            }
        } catch (e) {
            // Already logged in or different page
        }

        // 3. Find Trip
        await page.waitForSelector('.bg-white.rounded-3xl'); // Trip card
        const tripCards = await page.$$('.bg-white.rounded-3xl');
        if (tripCards.length > 0) {
            await tripCards[0].click();
        } else {
            console.log("No trips found");
            process.exit(1);
        }

        // 4. Click Advice
        await page.waitForSelector('button');
        const allButtons = await page.$$('button');
        let adviceBtn = null;
        for (const btn of allButtons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('穿搭建議')) {
                adviceBtn = btn;
                break;
            }
        }

        if (adviceBtn) {
            await adviceBtn.click();
        } else {
            console.log("Advice button not found");
            process.exit(1);
        }

        // 5. Wait for advice
        // Wait for text that is NOT "穿搭建議" (the button) but in the advice area
        await new Promise(r => setTimeout(r, 5000));

        // 6. Screenshot
        await page.screenshot({ path: '/Users/tese/.gemini/antigravity/brain/415d864a-fa4b-4921-b984-d2dda87dcdc3/puppeteer_advice_check.png', fullPage: true });
        console.log("Screenshot saved");

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
