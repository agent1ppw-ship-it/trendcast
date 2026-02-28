import { chromium } from 'playwright-extra';
// @ts-ignore
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

chromium.use(stealthPlugin());

async function testSearch(name: string, url: string, selector: string) {
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
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ignoreHTTPSErrors: true,
        });

        const page = await context.newPage();

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(5000);

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
                if (html.toLowerCase().includes('captcha') || html.toLowerCase().includes('cloudflare') || html.toLowerCase().includes('robot')) {
                    console.log("⚠️ Bot protection detected.");
                } else {
                    console.log("No results, but no obvious bot protection. Might be wrong selector.");
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
    // 1. Test US Phone Book (less strict than FastPeopleSearch sometimes)
    await testSearch('USPhoneBook', 'https://www.usphonebook.com/1505-elm-st/dallas/tx', '.ls_name a');

    // 2. Test That's Them
    await testSearch('ThatsThem', 'https://thatsthem.com/address/1505-Elm-St-Dallas-TX-75201', '.name');

    // 3. Test ClustrMaps (often has good directory SEO and accessible pages)
    await testSearch('ClustrMaps', 'https://clustrmaps.com/a/15h7lb/', '.peoples-list-item h2, .person-name');

    // 4. Test DuckDuckGo search for the address and "owner"
    await testSearch('DuckDuckGo', 'https://html.duckduckgo.com/html/?q="1505+Elm+St"+Dallas+"owner"', '.result__snippet');
}

run();
