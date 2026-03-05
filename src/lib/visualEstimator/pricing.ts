import { prisma } from '@/lib/prisma';
import type { QuoteTier, VisionEstimateResult } from '@/lib/visualEstimator/types';

type PricingLookup = {
    laborHourlyRate: number;
    overheadRate: number;
    marginGood: number;
    marginBetter: number;
    marginBest: number;
    materials: Record<string, number>;
};

const DEFAULT_PRICING: PricingLookup = {
    laborHourlyRate: 95,
    overheadRate: 0.14,
    marginGood: 0.2,
    marginBetter: 0.34,
    marginBest: 0.5,
    materials: {
        default_material: 45,
        pvc_pipe: 32,
        copper_fitting: 18,
        pressure_hose: 65,
        breaker_panel: 520,
        wire_spool: 140,
        sealant: 22,
        concrete_mix: 38,
        mulch: 30,
        sod: 58,
        roofing_shingle_bundle: 42,
    },
};

function normalizeKey(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function toUsd(value: number) {
    return Math.round(value * 100) / 100;
}

async function loadPricing(orgId: string): Promise<PricingLookup> {
    try {
        const rows = await prisma.inventoryPricing.findMany({
            where: {
                isActive: true,
                OR: [{ orgId }, { orgId: null }],
            },
        });

        const lookup: PricingLookup = {
            ...DEFAULT_PRICING,
            materials: { ...DEFAULT_PRICING.materials },
        };

        for (const row of rows) {
            const key = normalizeKey(row.sku || row.label);
            if (!key) continue;

            if (row.category === 'LABOR') {
                if (key === 'labor_hourly_rate') lookup.laborHourlyRate = row.unitCost;
                if (key === 'overhead_rate') lookup.overheadRate = row.unitCost;
                if (key === 'margin_good') lookup.marginGood = row.unitCost;
                if (key === 'margin_better') lookup.marginBetter = row.unitCost;
                if (key === 'margin_best') lookup.marginBest = row.unitCost;
                continue;
            }

            lookup.materials[key] = row.unitCost;
        }

        return lookup;
    } catch {
        // Database may not yet have this table in some environments; use safe defaults.
        return DEFAULT_PRICING;
    }
}

function resolveMaterialCost(materialName: string, priceBook: PricingLookup) {
    const key = normalizeKey(materialName);
    if (!key) return priceBook.materials.default_material;
    if (priceBook.materials[key]) return priceBook.materials[key];

    const fuzzyMatch = Object.entries(priceBook.materials).find(([materialKey]) => key.includes(materialKey) || materialKey.includes(key));
    return fuzzyMatch ? fuzzyMatch[1] : priceBook.materials.default_material;
}

function buildTierQuote(params: {
    tier: QuoteTier['tier'];
    baseLabor: number;
    baseMaterials: number;
    overheadRate: number;
    marginRate: number;
    premiumMaterialsMultiplier?: number;
    laborMultiplier?: number;
    summary: string;
}): QuoteTier {
    const laborCost = params.baseLabor * (params.laborMultiplier || 1);
    const materialsCost = params.baseMaterials * (params.premiumMaterialsMultiplier || 1);
    const subtotal = laborCost + materialsCost;
    const overheadAndMargin = subtotal * (params.overheadRate + params.marginRate);
    const total = subtotal + overheadAndMargin;

    return {
        tier: params.tier,
        total: toUsd(total),
        laborCost: toUsd(laborCost),
        materialsCost: toUsd(materialsCost),
        overheadAndMargin: toUsd(overheadAndMargin),
        summary: params.summary,
    };
}

export async function generateGoodBetterBestQuote(params: {
    orgId: string;
    vision: VisionEstimateResult;
}) {
    const priceBook = await loadPricing(params.orgId);
    const complexityFactor = 0.85 + params.vision.complexity_score * 0.09;

    const baseLabor = params.vision.estimated_labor_hours * priceBook.laborHourlyRate * complexityFactor;
    const baseMaterials = params.vision.estimated_materials.reduce((sum, material) => {
        return sum + resolveMaterialCost(material, priceBook);
    }, 0) * Math.max(1, Math.round(complexityFactor));

    const good = buildTierQuote({
        tier: 'Good',
        baseLabor,
        baseMaterials,
        overheadRate: priceBook.overheadRate,
        marginRate: priceBook.marginGood,
        summary: 'Core repair/installation scope with standard materials.',
    });

    const better = buildTierQuote({
        tier: 'Better',
        baseLabor,
        baseMaterials,
        overheadRate: priceBook.overheadRate,
        marginRate: priceBook.marginBetter,
        premiumMaterialsMultiplier: 1.18,
        laborMultiplier: 1.08,
        summary: 'Enhanced durability materials with expanded workmanship scope.',
    });

    const best = buildTierQuote({
        tier: 'Best',
        baseLabor,
        baseMaterials,
        overheadRate: priceBook.overheadRate,
        marginRate: priceBook.marginBest,
        premiumMaterialsMultiplier: 1.35,
        laborMultiplier: 1.18,
        summary: 'Premium materials, higher service depth, and strongest outcome package.',
    });

    return [good, better, best] satisfies QuoteTier[];
}

