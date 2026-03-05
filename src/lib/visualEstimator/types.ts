export interface VisionEstimateResult {
    detected_issue: string;
    estimated_materials: string[];
    complexity_score: number; // 1-10
    estimated_labor_hours: number;
}

export interface QuoteTier {
    tier: 'Good' | 'Better' | 'Best';
    total: number;
    laborCost: number;
    materialsCost: number;
    overheadAndMargin: number;
    summary: string;
}

export interface VisualEstimateResponse {
    issueSummary: string;
    complexityScore: number;
    estimatedLaborHours: number;
    materials: string[];
    squareFootage?: number;
    mapAddress?: string;
    imageUrls: string[];
    quotes: QuoteTier[];
    diagnostics?: string[];
}
