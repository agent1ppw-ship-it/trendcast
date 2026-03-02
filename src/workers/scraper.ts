import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

import { prisma } from '../lib/prisma';
import {
    buildBrowserLocationQueries,
    extractBusinessesFromYellowPagesHtml,
    fetchZipGeocode,
    getIndustrySearchVariants,
    mapNominatimResultsToBusinessLeads,
    mergeBusinessLeads,
    type NominatimSearchResult,
    searchGooglePlacesBusinessesByZip,
    searchOpenStreetMapBusinessesByZip,
} from '../lib/businessFinder';

// Add stealth plugin to Playwright
chromium.use(stealthPlugin());

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {})
});

interface ScrapePayload {
    zipCode: string;
    orgId: string;
}

interface BusinessFinderPayload {
    orgId: string;
    zipCode: string;
    industry: string;
    batchSize: number;
}

function getBusinessFinderCacheKey(zipCode: string, industry: string) {
    return `business-finder-cache:${zipCode}:${industry.trim().toLowerCase()}`;
}

async function searchBusinessesWithBrowserNominatim(
    context: BrowserContext,
    zipCode: string,
    industry: string,
    batchSize: number,
) {
    const page = await context.newPage();

    try {
        const searchCenter = await fetchZipGeocode(zipCode).catch(() => null);
        const queries = buildBrowserLocationQueries(industry, zipCode, searchCenter);

        const combinedResults: NominatimSearchResult[] = [];

        for (const query of queries) {
            const url = new URL('https://nominatim.openstreetmap.org/search');
            url.searchParams.set('q', query);
            url.searchParams.set('format', 'jsonv2');
            url.searchParams.set('limit', String(Math.min(Math.max(batchSize, 1), 50) * 2));
            url.searchParams.set('countrycodes', 'us');
            url.searchParams.set('addressdetails', '1');
            url.searchParams.set('extratags', '1');

            await page.goto(url.toString(), {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });

            await page.waitForTimeout(1500);

            const bodyText = await page.locator('body').innerText();

            try {
                const parsed = JSON.parse(bodyText) as NominatimSearchResult[];
                combinedResults.push(...parsed);
            } catch (error) {
                console.error('[BusinessFinderWorker] Failed to parse browser Nominatim response:', error);
            }
        }

        return mapNominatimResultsToBusinessLeads(
            combinedResults,
            zipCode,
            industry,
            batchSize,
            'OpenStreetMap Browser Search',
            searchCenter,
        );
    } finally {
        await page.close();
    }
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
        const launchOptions: Parameters<typeof chromium.launch>[0] = {
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
    { connection: redisConnection as never }
);

export const businessFinderWorker = new Worker(
    'BusinessFinderQueue',
    async (job: Job<BusinessFinderPayload>) => {
        console.log(`[BusinessFinderWorker] Started job ${job.id} for ZIP ${job.data.zipCode} / ${job.data.industry}`);

        const org = await prisma.organization.findUnique({ where: { id: job.data.orgId } });
        if (!org) {
            await job.updateProgress({ phase: 'Organization not found.', percent: 0, error: true });
            throw new Error('Organization not found.');
        }

        let browser: Browser | null = null;

        try {
            await job.updateProgress({ phase: 'Searching Google Places...', percent: 12 });

            const googlePlacesResult = await searchGooglePlacesBusinessesByZip(
                job.data.zipCode,
                job.data.industry,
                job.data.batchSize,
            );

            if (googlePlacesResult.leads.length > 0) {
                await redisConnection.set(
                    getBusinessFinderCacheKey(job.data.zipCode, job.data.industry),
                    JSON.stringify({
                        leads: googlePlacesResult.leads,
                        matchStrategy: googlePlacesResult.matchStrategy,
                        sourceLabel: googlePlacesResult.sourceLabel,
                    }),
                    'EX',
                    60 * 60 * 24 * 7,
                );

                await job.updateProgress({
                    phase: `Found ${googlePlacesResult.leads.length} matching businesses.`,
                    percent: 100,
                    finalUrl: 'https://places.googleapis.com/v1/places:searchText',
                    pageTitle: 'Google Places API',
                    blocked: false,
                    usedCache: false,
                    extractionDiagnostics: {
                        jsonLdScriptCount: 0,
                        jsonLdBusinessCount: 0,
                        resultCardCount: 0,
                        textLineCount: 0,
                        exactZipLeadCount: googlePlacesResult.matchStrategy === 'exact_zip' ? googlePlacesResult.leads.length : 0,
                        areaLeadCount: googlePlacesResult.matchStrategy === 'area_results' ? googlePlacesResult.leads.length : 0,
                        textExactLeadCount: 0,
                        textAreaLeadCount: 0,
                    },
                });

                return {
                    leads: googlePlacesResult.leads,
                    matchStrategy: googlePlacesResult.matchStrategy,
                    sourceLabel: googlePlacesResult.sourceLabel,
                    searchUrl: 'https://places.googleapis.com/v1/places:searchText',
                    usedCache: false,
                    finalUrl: 'https://places.googleapis.com/v1/places:searchText',
                    pageTitle: 'Google Places API',
                    blocked: false,
                    diagnostics: {
                        jsonLdScriptCount: 0,
                        jsonLdBusinessCount: 0,
                        resultCardCount: 0,
                        textLineCount: 0,
                        exactZipLeadCount: googlePlacesResult.matchStrategy === 'exact_zip' ? googlePlacesResult.leads.length : 0,
                        areaLeadCount: googlePlacesResult.matchStrategy === 'area_results' ? googlePlacesResult.leads.length : 0,
                        textExactLeadCount: 0,
                        textAreaLeadCount: 0,
                    },
                };
            }

            const launchOptions: Parameters<typeof chromium.launch>[0] = {
                headless: true,
            };

            if (process.env.PLAYWRIGHT_PROXY_SERVER) {
                launchOptions.proxy = {
                    server: process.env.PLAYWRIGHT_PROXY_SERVER,
                    username: process.env.PLAYWRIGHT_PROXY_USERNAME,
                    password: process.env.PLAYWRIGHT_PROXY_PASSWORD,
                };
            }

            browser = await chromium.launch(launchOptions);

            await job.updateProgress({ phase: 'Launching browser fallback...', percent: 22 });

            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                viewport: { width: 1440, height: 2400 },
                ignoreHTTPSErrors: true,
            });

            const page = await context.newPage();

            await page.setExtraHTTPHeaders({
                'accept-language': 'en-US,en;q=0.9',
            });

            await page.route('**/*', async (route) => {
                const resourceType = route.request().resourceType();
                if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
                    await route.abort();
                    return;
                }

                await route.continue();
            });

            const yellowPagesCollections: ReturnType<typeof extractBusinessesFromYellowPagesHtml>[] = [];
            const yellowPagesVariants = getIndustrySearchVariants(job.data.industry).slice(0, 3);
            let searchUrl = '';
            let finalUrl = '';
            let pageTitle = '';
            let yellowPagesBlocked = false;
            let yellowPagesResult = extractBusinessesFromYellowPagesHtml('', job.data.zipCode, job.data.industry, job.data.batchSize);

            await job.updateProgress({ phase: 'Loading directory fallback results...', percent: 35 });

            for (let variantIndex = 0; variantIndex < yellowPagesVariants.length; variantIndex += 1) {
                const searchTerm = yellowPagesVariants[variantIndex];

                for (let pageNumber = 1; pageNumber <= 2; pageNumber += 1) {
                    searchUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(searchTerm)}&geo_location_terms=${encodeURIComponent(job.data.zipCode)}${pageNumber > 1 ? `&page=${pageNumber}` : ''}`;

                    await page.goto(searchUrl, {
                        waitUntil: 'domcontentloaded',
                        timeout: 45000,
                    });

                    await page.waitForTimeout(3500);
                    await job.updateProgress({
                        phase: `Scanning live directory results (${variantIndex + 1}/${yellowPagesVariants.length}, page ${pageNumber})...`,
                        percent: 45 + ((variantIndex * 2 + (pageNumber - 1)) * 8),
                    });

                    finalUrl = page.url();
                    pageTitle = await page.title();
                    const html = await page.content();
                    const bodyText = await page.locator('body').innerText().catch(() => '');
                    const normalizedBodyText = bodyText.replace(/\s+/g, ' ').trim().toLowerCase();
                    yellowPagesBlocked =
                        normalizedBodyText.includes('captcha') ||
                        normalizedBodyText.includes('access denied') ||
                        normalizedBodyText.includes('unusual traffic') ||
                        normalizedBodyText.includes('verify you are human') ||
                        normalizedBodyText.includes('press and hold') ||
                        normalizedBodyText.includes('security check') ||
                        normalizedBodyText.includes('cloudflare') ||
                        pageTitle.toLowerCase().includes('access denied') ||
                        pageTitle.toLowerCase().includes('attention required') ||
                        pageTitle.toLowerCase().includes('cloudflare');

                    if (yellowPagesBlocked) {
                        break;
                    }

                    const pageResult = extractBusinessesFromYellowPagesHtml(
                        html,
                        job.data.zipCode,
                        job.data.industry,
                        job.data.batchSize,
                    );

                    yellowPagesCollections.push(pageResult);

                    const mergedLeads = mergeBusinessLeads(
                        yellowPagesCollections.map((collection) => collection.leads),
                        job.data.batchSize,
                    );

                    yellowPagesResult = {
                        leads: mergedLeads,
                        matchStrategy: yellowPagesCollections.some((collection) => collection.matchStrategy === 'exact_zip')
                            ? 'exact_zip'
                            : 'area_results',
                        diagnostics: pageResult.diagnostics,
                    };

                    if (mergedLeads.length >= job.data.batchSize) {
                        break;
                    }
                }

                if (yellowPagesBlocked || yellowPagesResult.leads.length >= job.data.batchSize) {
                    break;
                }
            }

            let finalResult = yellowPagesResult;
            let sourceLabel = 'Yellow Pages';
            let blocked = false;
            let usedCache = false;
            let blockReason: string | undefined;

            if (yellowPagesBlocked || yellowPagesResult.leads.length === 0) {
                await job.updateProgress({
                    phase: yellowPagesBlocked
                        ? 'Yellow Pages blocked the worker. Falling back to OpenStreetMap...'
                        : 'Yellow Pages returned no results. Falling back to OpenStreetMap...',
                    percent: 82,
                    finalUrl,
                    pageTitle,
                    blocked: yellowPagesBlocked,
                    extractionDiagnostics: yellowPagesResult.diagnostics,
                });

                try {
                    const openStreetMapResult = await searchOpenStreetMapBusinessesByZip(
                        job.data.zipCode,
                        job.data.industry,
                        job.data.batchSize,
                    );

                    if (openStreetMapResult.leads.length > 0) {
                        finalResult = {
                            ...yellowPagesResult,
                            leads: openStreetMapResult.leads,
                            matchStrategy: openStreetMapResult.matchStrategy,
                        };
                        sourceLabel = openStreetMapResult.sourceLabel;
                    } else {
                        const browserFallbackResult = await searchBusinessesWithBrowserNominatim(
                            context,
                            job.data.zipCode,
                            job.data.industry,
                            job.data.batchSize,
                        );

                        if (browserFallbackResult.leads.length > 0) {
                            finalResult = {
                                ...yellowPagesResult,
                                leads: browserFallbackResult.leads,
                                matchStrategy: browserFallbackResult.matchStrategy,
                            };
                            sourceLabel = browserFallbackResult.sourceLabel;
                        } else if (yellowPagesBlocked) {
                            const cachedResults = await redisConnection.get(getBusinessFinderCacheKey(job.data.zipCode, job.data.industry));
                            if (cachedResults) {
                                const parsedCache = JSON.parse(cachedResults) as {
                                    leads: typeof finalResult.leads;
                                    matchStrategy: typeof finalResult.matchStrategy;
                                    sourceLabel: string;
                                };
                                finalResult = {
                                    ...yellowPagesResult,
                                    leads: parsedCache.leads.slice(0, job.data.batchSize),
                                    matchStrategy: parsedCache.matchStrategy,
                                };
                                sourceLabel = parsedCache.sourceLabel || 'Cached Lead List';
                                usedCache = true;
                            } else {
                                blocked = true;
                                blockReason = 'Yellow Pages returned a Cloudflare block page, and both OpenStreetMap fallback paths returned no businesses.';
                            }
                        }
                    }
                } catch (fallbackError) {
                    console.error('[BusinessFinderWorker] OpenStreetMap fallback failed:', fallbackError);
                    try {
                        const browserFallbackResult = await searchBusinessesWithBrowserNominatim(
                            context,
                            job.data.zipCode,
                            job.data.industry,
                            job.data.batchSize,
                        );

                        if (browserFallbackResult.leads.length > 0) {
                            finalResult = {
                                ...yellowPagesResult,
                                leads: browserFallbackResult.leads,
                                matchStrategy: browserFallbackResult.matchStrategy,
                            };
                            sourceLabel = browserFallbackResult.sourceLabel;
                        } else if (yellowPagesBlocked) {
                            const cachedResults = await redisConnection.get(getBusinessFinderCacheKey(job.data.zipCode, job.data.industry));
                            if (cachedResults) {
                                const parsedCache = JSON.parse(cachedResults) as {
                                    leads: typeof finalResult.leads;
                                    matchStrategy: typeof finalResult.matchStrategy;
                                    sourceLabel: string;
                                };
                                finalResult = {
                                    ...yellowPagesResult,
                                    leads: parsedCache.leads.slice(0, job.data.batchSize),
                                    matchStrategy: parsedCache.matchStrategy,
                                };
                                sourceLabel = parsedCache.sourceLabel || 'Cached Lead List';
                                usedCache = true;
                            } else {
                                blocked = true;
                                blockReason = 'Yellow Pages returned a Cloudflare block page, and both OpenStreetMap fallback paths returned no businesses.';
                            }
                        }
                    } catch (browserFallbackError) {
                        console.error('[BusinessFinderWorker] Browser OpenStreetMap fallback failed:', browserFallbackError);
                        if (yellowPagesBlocked) {
                            const cachedResults = await redisConnection.get(getBusinessFinderCacheKey(job.data.zipCode, job.data.industry));
                            if (cachedResults) {
                                const parsedCache = JSON.parse(cachedResults) as {
                                    leads: typeof finalResult.leads;
                                    matchStrategy: typeof finalResult.matchStrategy;
                                    sourceLabel: string;
                                };
                                finalResult = {
                                    ...yellowPagesResult,
                                    leads: parsedCache.leads.slice(0, job.data.batchSize),
                                    matchStrategy: parsedCache.matchStrategy,
                                };
                                sourceLabel = parsedCache.sourceLabel || 'Cached Lead List';
                                usedCache = true;
                            } else {
                                blocked = true;
                                blockReason = 'Yellow Pages returned a Cloudflare block page, and both OpenStreetMap fallback request paths failed.';
                            }
                        }
                    }
                }
            }

            if (finalResult.leads.length > 0 && !usedCache) {
                await redisConnection.set(
                    getBusinessFinderCacheKey(job.data.zipCode, job.data.industry),
                    JSON.stringify({
                        leads: finalResult.leads,
                        matchStrategy: finalResult.matchStrategy,
                        sourceLabel,
                    }),
                    'EX',
                    60 * 60 * 24 * 7,
                );
            }

            await job.updateProgress({
                phase: `Found ${finalResult.leads.length} matching businesses.`,
                percent: 100,
                finalUrl,
                pageTitle,
                blocked,
                usedCache,
                extractionDiagnostics: yellowPagesResult.diagnostics,
            });

            return {
                leads: finalResult.leads,
                matchStrategy: finalResult.matchStrategy,
                sourceLabel,
                searchUrl,
                usedCache,
                finalUrl,
                pageTitle,
                blocked,
                blockReason,
                diagnostics: yellowPagesResult.diagnostics,
            };
        } catch (error) {
            console.error(`[BusinessFinderWorker] Error in job ${job.id}:`, error);
            await job.updateProgress({ phase: 'Live business search failed.', percent: 0, error: true });
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    },
    { connection: redisConnection as never }
);

scraperWorker.on('completed', (job) => {
    console.log(`[Queue] Job ${job.id} has completed!`);
});

scraperWorker.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job?.id} has failed with ${err.message}`);
});

businessFinderWorker.on('completed', (job) => {
    console.log(`[BusinessFinderQueue] Job ${job.id} has completed!`);
});

businessFinderWorker.on('failed', (job, err) => {
    console.error(`[BusinessFinderQueue] Job ${job?.id} has failed with ${err.message}`);
});
