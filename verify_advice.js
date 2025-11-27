
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // 1. Navigate
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

        // 2. Login
        // Check if login needed
        const loginBtn = await page.$('button ::-p-text(登入)');
        if (loginBtn) {
            await page.type('input[type="text"]', 'ai_test_user');
            await page.type('input[type="password"]', '123');
            await loginBtn.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
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
        await page.waitForSelector('button ::-p-text(穿搭建議)');
        const adviceBtn = await page.$('button ::-p-text(穿搭建議)');
        await adviceBtn.click();

        // 5. Wait for advice
        await page.waitForSelector('.bg-sand\\/30'); // Advice card
        await new Promise(r => setTimeout(r, 2000));

        // 6. Screenshot
        await page.screenshot({ path: '/Users/tese/.gemini/antigravity/brain/415d864a-fa4b-4921-b984-d2dda87dcdc3/puppeteer_advice_check.png' });
        console.log("Screenshot saved");

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
