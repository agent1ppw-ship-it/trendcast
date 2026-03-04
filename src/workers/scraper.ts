import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { chromium } from 'playwright-extra';
import type { BrowserContext } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

import { prisma } from '../lib/prisma';
import { getScraperExtractCost, refundScraperExtractsOnce } from '../lib/scraperCredits';
import {
    buildBrowserLocationQueries,
    extractBusinessesFromYellowPagesHtml,
    fetchZipGeocode,
    getSafeSearchRadiusMiles,
    getIndustrySearchVariants,
    mapNominatimResultsToBusinessLeads,
    mergeBusinessLeads,
    type NominatimSearchResult,
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
    listingType?: 'RECENTLY_SOLD' | 'RECENTLY_LISTED';
}

function normalizeWhitespace(value: string) {
    return value.replace(/\s+/g, ' ').trim();
}

function normalizeAddressForCompare(value: string) {
    return normalizeWhitespace(value)
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ');
}

function sanitizeAddress(value: string) {
    return normalizeWhitespace(value)
        .replace(/\s+,/g, ',')
        .replace(/,+/g, ',')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function looksLikeStreetAddress(value: string) {
    const cleaned = sanitizeAddress(value);
    return /^\d{1,6}\s+[a-z0-9]/i.test(cleaned) && cleaned.length >= 8 && !/redfin|map|save/i.test(cleaned);
}

function collectJsonLdAddresses(node: unknown, results: Set<string>) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
        for (const item of node) collectJsonLdAddresses(item, results);
        return;
    }

    const record = node as Record<string, unknown>;
    const addressNode = record.address;
    if (addressNode && typeof addressNode === 'object' && !Array.isArray(addressNode)) {
        const address = addressNode as Record<string, unknown>;
        const street = typeof address.streetAddress === 'string' ? address.streetAddress : '';
        const city = typeof address.addressLocality === 'string' ? address.addressLocality : '';
        const state = typeof address.addressRegion === 'string' ? address.addressRegion : '';
        const postal = typeof address.postalCode === 'string' ? address.postalCode : '';
        const formatted = sanitizeAddress([street, city, [state, postal].filter(Boolean).join(' ')].filter(Boolean).join(', '));
        if (looksLikeStreetAddress(formatted)) {
            results.add(formatted);
        }
    }

    for (const value of Object.values(record)) {
        collectJsonLdAddresses(value, results);
    }
}

function extractRedfinAddressesFromHtml(html: string) {
    const $ = cheerio.load(html);
    const addresses = new Set<string>();

    const selectors = [
        '.bp-Homecard__Address',
        '[data-rf-test-id="abp-address"]',
        '[data-rf-test-id="homecard-address"]',
        '[data-rf-test-id="home-card-address"]',
        '.homeAddressV2',
        '.HomeCardAddress',
        'span[itemprop="streetAddress"]',
    ];

    for (const selector of selectors) {
        $(selector).each((_, el) => {
            const text = sanitizeAddress($(el).text());
            if (looksLikeStreetAddress(text)) addresses.add(text);
        });
    }

    $('script[type="application/ld+json"]').each((_, el) => {
        const raw = $(el).contents().text();
        if (!raw) return;
        try {
            collectJsonLdAddresses(JSON.parse(raw), addresses);
        } catch {
            // Ignore malformed JSON-LD blocks.
        }
    });

    if (addresses.size === 0) {
        const textBody = normalizeWhitespace($.root().text());
        const inlineMatches = textBody.match(/\d{1,6}\s+[A-Za-z0-9.'#\-/ ]{3,90},\s*[A-Za-z .'-]{2,40},\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/g) || [];
        for (const match of inlineMatches) {
            const text = sanitizeAddress(match);
            if (looksLikeStreetAddress(text)) addresses.add(text);
        }
    }

    return Array.from(addresses);
}

function getScrapeTarget(listingType: ScrapePayload['listingType'], zipCode: string, pageNumber: number) {
    if (listingType === 'RECENTLY_LISTED') {
        return {
            label: 'listed',
            url: pageNumber === 1
                ? `https://www.redfin.com/zipcode/${zipCode}`
                : `https://www.redfin.com/zipcode/${zipCode}/page-${pageNumber}`,
        };
    }

    return {
        label: 'sold',
        url: pageNumber === 1
            ? `https://www.redfin.com/zipcode/${zipCode}/filter/include=sold-6mo`
            : `https://www.redfin.com/zipcode/${zipCode}/filter/include=sold-6mo/page-${pageNumber}`,
    };
}

interface BusinessFinderPayload {
    orgId: string;
    zipCode: string;
    industry: string;
    batchSize: number;
    radiusMiles: number;
}

function getBusinessFinderCacheKey(zipCode: string, industry: string, radiusMiles: number) {
    return `business-finder-cache:${zipCode}:${industry.trim().toLowerCase()}:${getSafeSearchRadiusMiles(radiusMiles)}`;
}

async function searchBusinessesWithBrowserNominatim(
    context: BrowserContext,
    zipCode: string,
    industry: string,
    batchSize: number,
    radiusMiles: number,
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
            radiusMiles,
        );
    } finally {
        await page.close();
    }
}

export const scraperWorker = new Worker(
    'ScrapeQueue',
    async (job: Job<ScrapePayload>) => {
        console.log(`[Worker] Started scraping job ${job.id} for ZIP: ${job.data.zipCode}`);
        const listingType = job.data.listingType || 'RECENTLY_SOLD';

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
            const queuedAddressKeys = new Set<string>();

            await job.updateProgress({ phase: 'Navigating & Bypassing Bot Protection...', percent: 40 });

            while (pageNum <= maxPages && newAddresses.length < 10) {
                // Check if user clicked Stop
                const isCancelled = await redisConnection.get(`cancel-job:${job.id}`);
                if (isCancelled) {
                    console.log(`[Worker] Job ${job.id} was aborted by the user.`);
                    await job.updateProgress({ phase: 'Job Cancelled by User. Extracts Refunded.', percent: 0, error: true });
                    throw new Error('Job Cancelled');
                }

                const scrapeTarget = getScrapeTarget(listingType, job.data.zipCode, pageNum);
                const pageUrl = scrapeTarget.url;

                console.log(`[Worker] Scraping ${pageUrl}`);
                await job.updateProgress({
                    phase: `Scanning ${scrapeTarget.label} Redfin page ${pageNum}...`,
                    percent: 40 + (pageNum * 5),
                });

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
                const rawAddresses = extractRedfinAddressesFromHtml(html);

                await job.updateProgress({ phase: `Comparing ${rawAddresses.length} properties against CRM Database...`, percent: 60 + (pageNum * 5) });

                // Filter out properties already in the CRM
                if (rawAddresses.length > 0) {
                    console.log(`[Worker] Extracted ${rawAddresses.length} addresses from page ${pageNum}. Checking for duplicates...`);
                    for (const addr of rawAddresses) {
                        const normalizedAddress = normalizeAddressForCompare(addr);
                        if (!normalizedAddress || queuedAddressKeys.has(normalizedAddress)) continue;

                        const existingLead = await prisma.lead.findFirst({
                            where: {
                                orgId: job.data.orgId,
                                address: {
                                    equals: addr,
                                    mode: 'insensitive',
                                }
                            }
                        });

                        if (!existingLead) {
                            newAddresses.push(addr);
                            queuedAddressKeys.add(normalizedAddress);
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
                const refunded = await refundScraperExtractsOnce(redisConnection, String(job.id), job.data.orgId);
                await job.updateProgress({
                    phase: refunded
                        ? 'No new properties found. Extracts refunded.'
                        : 'No new properties found.',
                    percent: 100,
                    error: false,
                });
                return { success: true, count: 0, refundedExtracts: refunded ? getScraperExtractCost() : 0 };
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
                        source: listingType === 'RECENTLY_LISTED' ? 'SCRAPER_LISTED' : 'SCRAPER',
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
            try {
                const refunded = await refundScraperExtractsOnce(redisConnection, String(job.id), job.data.orgId);
                await job.updateProgress({
                    phase: refunded ? 'Job Failed during execution. Extracts refunded.' : 'Job Failed during execution.',
                    percent: 0,
                    error: true,
                });
            } catch (refundError) {
                console.error(`[Worker] Failed to refund extracts for job ${job.id}:`, refundError);
                await job.updateProgress({ phase: 'Job Failed during execution.', percent: 0, error: true });
            }
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
        const searchRadiusMiles = getSafeSearchRadiusMiles(job.data.radiusMiles);

        const org = await prisma.organization.findUnique({ where: { id: job.data.orgId } });
        if (!org) {
            await job.updateProgress({ phase: 'Organization not found.', percent: 0, error: true });
            throw new Error('Organization not found.');
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

        const browser = await chromium.launch(launchOptions);

        try {
            await job.updateProgress({ phase: 'Launching browser...', percent: 10 });

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

            await job.updateProgress({ phase: 'Loading live directory results...', percent: 35 });

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
                        searchRadiusMiles,
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
                            searchRadiusMiles,
                        );

                        if (browserFallbackResult.leads.length > 0) {
                            finalResult = {
                                ...yellowPagesResult,
                                leads: browserFallbackResult.leads,
                                matchStrategy: browserFallbackResult.matchStrategy,
                            };
                            sourceLabel = browserFallbackResult.sourceLabel;
                        } else if (yellowPagesBlocked) {
                            const cachedResults = await redisConnection.get(
                                getBusinessFinderCacheKey(job.data.zipCode, job.data.industry, searchRadiusMiles)
                            );
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
                            searchRadiusMiles,
                        );

                        if (browserFallbackResult.leads.length > 0) {
                            finalResult = {
                                ...yellowPagesResult,
                                leads: browserFallbackResult.leads,
                                matchStrategy: browserFallbackResult.matchStrategy,
                            };
                            sourceLabel = browserFallbackResult.sourceLabel;
                        } else if (yellowPagesBlocked) {
                            const cachedResults = await redisConnection.get(
                                getBusinessFinderCacheKey(job.data.zipCode, job.data.industry, searchRadiusMiles)
                            );
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
                            const cachedResults = await redisConnection.get(
                                getBusinessFinderCacheKey(job.data.zipCode, job.data.industry, searchRadiusMiles)
                            );
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
                    getBusinessFinderCacheKey(job.data.zipCode, job.data.industry, searchRadiusMiles),
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
            await browser.close();
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
