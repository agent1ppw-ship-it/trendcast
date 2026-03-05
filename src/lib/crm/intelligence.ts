export type PipelineStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST';
export type PriorityBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface CrmLeadInput {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    source: string;
    status: string;
    isRevealed: boolean;
    createdAt: Date | string;
}

export interface CrmLeadIntelligence {
    leadScore: number;
    priorityBand: PriorityBand;
    estimatedLow: number;
    estimatedHigh: number;
    estimatedMid: number;
    serviceFocus: string;
    nextBestAction: string;
    dueSoon: boolean;
}

const BASE_SOURCE_WEIGHT: Record<string, number> = {
    BUSINESS_FINDER: 14,
    SCRAPER: 10,
    SCRAPER_LISTED: 12,
    MANUAL: 16,
    ORGANIC: 18,
    REFERRAL: 20,
};

const STATUS_WEIGHT: Record<PipelineStatus, number> = {
    NEW: 8,
    CONTACTED: 12,
    QUOTED: 18,
    WON: 22,
    LOST: 0,
};

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function daysSince(date: Date) {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function normalizeSource(source: string) {
    return source.trim().toUpperCase().replace(/\s+/g, '_');
}

function safeStatus(status: string): PipelineStatus {
    const normalized = status.trim().toUpperCase() as PipelineStatus;
    if (normalized === 'NEW' || normalized === 'CONTACTED' || normalized === 'QUOTED' || normalized === 'WON' || normalized === 'LOST') {
        return normalized;
    }
    return 'NEW';
}

function inferServiceFocus(lead: CrmLeadInput) {
    const lowerAddress = (lead.address || '').toLowerCase();
    const lowerName = lead.name.toLowerCase();
    const source = normalizeSource(lead.source);

    if (lowerName.includes('plumb') || source.includes('PLUMB')) return 'Plumbing Service';
    if (lowerName.includes('hvac') || lowerName.includes('air') || lowerName.includes('heat')) return 'HVAC Service';
    if (lowerName.includes('roof') || source.includes('ROOF')) return 'Roofing';
    if (lowerName.includes('land') || lowerName.includes('lawn') || lowerAddress.includes('acre')) return 'Landscaping';
    if (lowerName.includes('paint')) return 'Painting';
    if (lowerName.includes('clean') || lowerName.includes('wash')) return 'Cleaning / Pressure Washing';
    return 'General Home Service';
}

function estimateValue(serviceFocus: string, score: number) {
    const baseByService: Record<string, number> = {
        'HVAC Service': 1700,
        Plumbing: 1300,
        Roofing: 3200,
        Landscaping: 2200,
        Painting: 2600,
        'Cleaning / Pressure Washing': 750,
        'General Home Service': 1400,
    };

    const base = baseByService[serviceFocus] || baseByService['General Home Service'];
    const multiplier = 0.75 + score / 120;
    const mid = Math.round(base * multiplier);
    const low = Math.max(250, Math.round(mid * 0.72));
    const high = Math.round(mid * 1.35);
    return { low, high, mid };
}

function getPriorityBand(score: number): PriorityBand {
    if (score >= 86) return 'URGENT';
    if (score >= 72) return 'HIGH';
    if (score >= 54) return 'MEDIUM';
    return 'LOW';
}

function inferNextBestAction(status: PipelineStatus, priorityBand: PriorityBand) {
    if (status === 'NEW') return priorityBand === 'URGENT' ? 'Call in 15 minutes' : 'Send intro SMS and call';
    if (status === 'CONTACTED') return 'Book on-site estimate';
    if (status === 'QUOTED') return 'Follow up on quote + close';
    if (status === 'WON') return 'Confirm schedule and dispatch';
    return 'Archive or recycle in 30 days';
}

export function enrichCrmLead(lead: CrmLeadInput): CrmLeadIntelligence {
    const source = normalizeSource(lead.source);
    const status = safeStatus(lead.status);
    const createdAt = lead.createdAt instanceof Date ? lead.createdAt : new Date(lead.createdAt);
    const ageDays = daysSince(createdAt);

    let score = 35;
    score += BASE_SOURCE_WEIGHT[source] || 8;
    score += STATUS_WEIGHT[status];
    score += lead.phone ? 8 : -8;
    score += lead.address ? 6 : -6;
    score += lead.isRevealed ? 10 : 0;

    if (status === 'NEW' && ageDays <= 2) score += 10;
    if (status === 'CONTACTED' && ageDays > 6) score -= 8;
    if (status === 'QUOTED' && ageDays <= 5) score += 10;
    if (status === 'WON') score += 12;
    if (status === 'LOST') score = 20;

    score = clamp(Math.round(score), 5, 99);

    const serviceFocus = inferServiceFocus(lead);
    const priorityBand = getPriorityBand(score);
    const nextBestAction = inferNextBestAction(status, priorityBand);
    const estimate = estimateValue(serviceFocus, score);

    const dueSoon = (status === 'NEW' || status === 'CONTACTED' || status === 'QUOTED') && ageDays >= 2;

    return {
        leadScore: score,
        priorityBand,
        estimatedLow: estimate.low,
        estimatedHigh: estimate.high,
        estimatedMid: estimate.mid,
        serviceFocus,
        nextBestAction,
        dueSoon,
    };
}

