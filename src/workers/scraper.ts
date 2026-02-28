import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { chromium } from 'playwright-extra';
// @ts-ignore
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Add stealth plugin to Playwright
chromium.use(stealthPlugin());

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

interface ScrapePayload {
    zipCode: string;
    orgId: string;
}

export const scraperWorker = new Worker(
    'ScrapeQueue',
    async (job: Job<ScrapePayload>) => {
        console.log(`[Worker] Started scraping job ${job.id} for ZIP: ${job.data.zipCode}`);

        const org = await prisma.organization.findUnique({ where: { id: job.data.orgId } });
        if (!org) {
            await job.updateProgress({ phase: 'Job Failed: Organization not found.', percent: 0, error: true });
            throw new Error('Organization not found.');
        }

        await job.updateProgress({ phase: 'Initializing Playwright cluster...', percent: 5 });

        // Prepare launch options
        const launchOptions: any = {
            headless: true, // Run headless in production, false for local debugging
        };

        if (process.env.PLAYWRIGHT_PROXY_SERVER) {
            launchOptions.proxy = {
                server: process.env.PLAYWRIGHT_PROXY_SERVER,
                username: process.env.PLAYWRIGHT_PROXY_USERNAME,
                password: process.env.PLAYWRIGHT_PROXY_PASSWORD,
            };
            console.log(`[Worker] Connecting via proxy: ${process.env.PLAYWRIGHT_PROXY_SERVER}`);
            await job.updateProgress({ phase: 'Authenticating Bright Data Proxy...', percent: 15 });
        }

        // Launch stealth browser
        const browser = await chromium.launch(launchOptions);
        await job.updateProgress({ phase: 'Launching Headless Stealth Browser...', percent: 25 });

        try {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                ignoreHTTPSErrors: true,
            });

            const page = await context.newPage();

            let pageNum = 1;
            const maxPages = 3; // Prevent infinite loops or excessive proxy usage
            const newAddresses: string[] = [];

            await job.updateProgress({ phase: 'Navigating & Bypassing Bot Protection...', percent: 40 });

            while (pageNum <= maxPages && newAddresses.length < 10) {
                // Check if user clicked Stop
                const isCancelled = await redisConnection.get(`cancel-job:${job.id}`);
                if (isCancelled) {
                    console.log(`[Worker] Job ${job.id} was aborted by the user.`);
                    await job.updateProgress({ phase: 'Job Cancelled by User. Extracts Refunded.', percent: 0, error: true });
                    throw new Error('Job Cancelled');
                }

                // Navigate to Redfin's recently sold homes for the target ZIP code
                const pageUrl = pageNum === 1
                    ? `https://www.redfin.com/zipcode/${job.data.zipCode}/filter/include=sold-6mo`
                    : `https://www.redfin.com/zipcode/${job.data.zipCode}/filter/include=sold-6mo/page-${pageNum}`;

                console.log(`[Worker] Scraping ${pageUrl}`);
                await job.updateProgress({ phase: `Scanning Redfin Page ${pageNum}...`, percent: 40 + (pageNum * 5) });

                await page.goto(pageUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                // Wait a few seconds for dynamic React elements to render
                await job.updateProgress({ phase: `Extracting DOM Property Elements (Page ${pageNum})...`, percent: 45 + (pageNum * 5) });
                await page.waitForTimeout(4000 + Math.random() * 2000); // 4-6 seconds random delay

                // Simulate human interaction
                await page.mouse.move(100, 200);

                const html = await page.content();
                const $ = cheerio.load(html);

                const rawAddresses: string[] = [];

                // Extract real addresses from the Redfin DOM
                $('.bp-Homecard__Address').each((i, el) => {
                    rawAddresses.push($(el).text().trim());
                });

                await job.updateProgress({ phase: `Comparing ${rawAddresses.length} properties against CRM Database...`, percent: 60 + (pageNum * 5) });

                // Filter out properties already in the CRM
                if (rawAddresses.length > 0) {
                    console.log(`[Worker] Extracted ${rawAddresses.length} addresses from page ${pageNum}. Checking for duplicates...`);
                    for (const addr of rawAddresses) {
                        const existingLead = await prisma.lead.findFirst({
                            where: {
                                orgId: job.data.orgId,
                                address: addr
                            }
                        });

                        if (!existingLead && !newAddresses.includes(addr)) {
                            newAddresses.push(addr);
                            if (newAddresses.length >= 10) break; // Limit to 10 NEW properties per batch
                        }
                    }
                }

                // Break the loop if Redfin didn't return any raw addresses on this page (reached the end)
                if (rawAddresses.length === 0) {
                    console.log(`[Worker] Scrape yielded no results on page ${pageNum}. Ending extraction phase.`);
                    break;
                }

                console.log(`[Worker] Found ${newAddresses.length} new potential properties so far.`);

                // If we haven't found at least 5 new properties, check the next page
                if (newAddresses.length < 5) {
                    pageNum++;
                } else {
                    break;
                }
            }

            if (newAddresses.length === 0) {
                console.log(`[Worker] All extracted properties across ${pageNum} pages already exist in the CRM database.`);
            }

            console.log(`[Worker] Proceeding to Enrichment with ${newAddresses.length} new properties.`);

            let processed = 0;
            for (const address of newAddresses) {
                // Check if user clicked Stop during insertion
                const isCancelled = await redisConnection.get(`cancel-job:${job.id}`);
                if (isCancelled) {
                    console.log(`[Worker] Job ${job.id} was aborted by the user during enrichment.`);
                    await job.updateProgress({ phase: 'Job Cancelled by User. Extracts Refunded.', percent: 0, error: true });
                    throw new Error('Job Cancelled');
                }

                processed++;
                await job.updateProgress({ phase: `Saving Extracted Property to Database: ${processed}/${newAddresses.length}...`, percent: 75 + Math.floor((processed / newAddresses.length) * 20) });

                await prisma.lead.create({
                    data: {
                        orgId: job.data.orgId,
                        name: 'Unknown',
                        phone: '',
                        address: address,
                        source: 'SCRAPER',
                        status: 'EXTRACTED',
                        leadScore: 85,
                        isRevealed: false
                    }
                });

                console.log(`[Worker] Saved unrevealed lead for ${address}.`);
            }

            console.log(`[Worker] Finished job ${job.id}`);
            await job.updateProgress({ phase: 'Extraction & Enrichment Completed!', percent: 100 });
            return { success: true, count: newAddresses.length };

        } catch (error) {
            console.error(`[Worker] Error in job ${job.id}:`, error);
            await job.updateProgress({ phase: 'Job Failed during execution.', percent: 0, error: true });
            throw error;
        } finally {
            await browser.close();
        }
    },
    { connection: redisConnection as any }
);

scraperWorker.on('completed', (job) => {
    console.log(`[Queue] Job ${job.id} has completed!`);
});

scraperWorker.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job?.id} has failed with ${err.message}`);
});
