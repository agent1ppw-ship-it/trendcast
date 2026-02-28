import { chromium } from 'playwright-extra';
// @ts-ignore
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

chromium.use(stealthPlugin());

async function run() {
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
        await page.goto('https://www.homes.com/zip-code/75201/recently-sold/', { waitUntil: 'domcontentloaded' });

        await page.waitForTimeout(3000);
        console.log("Page Title:", await page.title());
        const html = await page.content();
        const $ = cheerio.load(html);

        const addresses: string[] = [];
        $('.property-name').each((i, el) => {
            addresses.push($(el).text().trim());
        });

        console.log("Addresses found:", addresses);
    } finally {
        await browser.close();
    }
}

run();
