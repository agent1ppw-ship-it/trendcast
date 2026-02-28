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
                if (html.toLowerCase().includes('captcha') || html.toLowerCase().includes('robot') || html.toLowerCase().includes('unusual traffic') || html.toLowerCase().includes('access denied')) {
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
    const address = "1505 Elm St";
    const cityStateZip = "Dallas, TX 75201";

    // Test TruePeopleSearch
    const tpsUrl = `https://www.truepeoplesearch.com/results?streetaddress=${encodeURIComponent(address)}&citystatezip=${encodeURIComponent(cityStateZip)}`;
    await testSite('TruePeopleSearch', tpsUrl, '.h4'); // names are usually in .h4 elements or .card-title

    // Test FastPeopleSearch
    const fpsUrl = `https://www.fastpeoplesearch.com/address/${encodeURIComponent(address)}-${encodeURIComponent(cityStateZip)}`;
    await testSite('FastPeopleSearch', fpsUrl, 'h2, .name, .card-title, h1');

    // Test NJParcels (if we were in NJ, but we are in TX)
    // Dallas Central Appraisal District (DCAD) search uses a form, hard to scrape via simple URL.
}

run();
