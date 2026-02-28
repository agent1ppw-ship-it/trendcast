import { chromium } from 'playwright-extra';
// @ts-ignore
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

chromium.use(stealthPlugin());

async function testSite(name: string, url: string, selector: string) {
    console.log(`\n--- Testing ${name} ---`);
    console.log(`URL: ${url}`);

    const launchOptions: any = { headless: true };
    if (process.env.PLAYWRIGHT_PROXY_SERVER) {
        launchOptions.proxy = {
            server: process.env.PLAYWRIGHT_PROXY_SERVER,
            username: process.env.PLAYWRIGHT_PROXY_USERNAME,
            password: process.env.PLAYWRIGHT_PROXY_PASSWORD,
        };
    }

    const browser = await chromium.launch(launchOptions);
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ignoreHTTPSErrors: true,
        });

        const page = await context.newPage();

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(5000); // Wait for dynamic content

            console.log("Page Title:", await page.title());

            const html = await page.content();
            const $ = cheerio.load(html);

            const results: string[] = [];
            $(selector).each((i, el) => {
                results.push($(el).text().trim());
            });

            console.log(`Found ${results.length} elements matching '${selector}'.`);
            if (results.length > 0) {
                console.log("Sample results:", results.slice(0, 3));
            } else {
                console.log("No results found. Checking for captcha...");
                if (html.toLowerCase().includes('captcha') || html.toLowerCase().includes('robot') || html.toLowerCase().includes('unusual traffic')) {
                    console.log("⚠️ Possible Captcha/Bot protection detected in HTML.");
                }
            }
        } catch (e: any) {
            console.error(`Error navigating to ${name}:`, e.message);
        }
    } finally {
        await browser.close();
    }
}

async function run() {
    // Test Redfin (Dallas, TX zip 75201 recently sold)
    // Redfin URL format: https://www.redfin.com/zipcode/75201 (need to add sold filter, but let's test general access first)
    await testSite('Redfin', 'https://www.redfin.com/zipcode/75201', '.bp-Homecard__Address');

    // Test Realtor.com
    await testSite('Realtor.com', 'https://www.realtor.com/realestateandhomes-search/75201', 'div[data-testid="card-address"]');

    // Test Compass
    await testSite('Compass', 'https://www.compass.com/homes-for-sale/75201/', '.cx-compass-interactive-address');
}

run();
