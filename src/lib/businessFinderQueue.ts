import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type {
  BusinessFinderExtractionDiagnostics,
  BusinessFinderLead,
  BusinessFinderMatchStrategy,
} from '@/lib/businessFinder';
import { getSafeSearchRadiusMiles } from '@/lib/businessFinder';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
});

const businessFinderQueue = new Queue('BusinessFinderQueue', { connection: redisConnection as never });

export interface BusinessFinderProgress {
  phase: string;
  percent: number;
  finalUrl?: string;
  pageTitle?: string;
  blocked?: boolean;
  usedCache?: boolean;
  extractionDiagnostics?: BusinessFinderExtractionDiagnostics;
}

export interface BusinessFinderJobResult {
  leads: BusinessFinderLead[];
  matchStrategy: BusinessFinderMatchStrategy;
  sourceLabel: string;
  searchUrl: string;
  usedCache?: boolean;
  finalUrl?: string;
  pageTitle?: string;
  blocked?: boolean;
  blockReason?: string;
  diagnostics?: BusinessFinderExtractionDiagnostics;
}

export async function startBusinessSearchJobForOrg(orgId: string, input: {
  zipCode: string;
  industry: string;
  batchSize: number;
  radiusMiles: number;
}) {
  const normalizedZip = input.zipCode.trim();
  const normalizedIndustry = input.industry.trim();
  const safeBatchSize = Math.min(Math.max(input.batchSize, 1), 100);
  const safeRadiusMiles = getSafeSearchRadiusMiles(input.radiusMiles);

  if (!/^\d{5}$/.test(normalizedZip)) {
    return { success: false as const, error: 'Enter a valid 5-digit ZIP code.' };
  }

  if (!normalizedIndustry) {
    return { success: false as const, error: 'Choose an industry to search.' };
  }

  const job = await businessFinderQueue.add('business-search-job', {
    orgId,
    zipCode: normalizedZip,
    industry: normalizedIndustry,
    batchSize: safeBatchSize,
    radiusMiles: safeRadiusMiles,
  });

  return { success: true as const, jobId: String(job.id) };
}

export async function getBusinessSearchStatusForOrg(orgId: string, jobId: string) {
  const job = await businessFinderQueue.getJob(jobId);
  if (!job) {
    return { success: false as const, status: 404, error: 'Job not found.' };
  }

  const data = job.data as { orgId?: string };
  if (!data.orgId || data.orgId !== orgId) {
    return { success: false as const, status: 404, error: 'Job not found.' };
  }

  const state = await job.getState();
  const progress = (job.progress as BusinessFinderProgress) || { phase: 'Queued', percent: 0 };
  const returnValue = (job.returnvalue as BusinessFinderJobResult | undefined) || undefined;

  return {
    success: true as const,
    state,
    progress,
    results: returnValue?.leads,
    matchStrategy: returnValue?.matchStrategy,
    sourceLabel: returnValue?.sourceLabel,
    searchUrl: returnValue?.searchUrl,
    usedCache: returnValue?.usedCache,
    finalUrl: returnValue?.finalUrl,
    pageTitle: returnValue?.pageTitle,
    blocked: returnValue?.blocked,
    blockReason: returnValue?.blockReason,
    diagnostics: returnValue?.diagnostics,
  };
}
