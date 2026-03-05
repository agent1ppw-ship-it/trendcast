import OpenAI from 'openai';
import type { VisionEstimateResult } from '@/lib/visualEstimator/types';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-api-key',
});

export const VISUAL_ESTIMATOR_SYSTEM_PROMPT = `
You are a master tradesman and senior field estimator for home service projects.
You are analyzing customer-provided jobsite photos to produce an instant preliminary estimate.

Rules:
1. Be practical and conservative. This is a PRELIMINARY estimate only.
2. Infer visible scope and dimensions using visual context clues (doors, windows, fixtures, driveway width, fencing, appliances, etc.).
3. Identify the most likely visible issue in plain contractor language.
4. Estimate realistic labor hours for a professional crew.
5. List likely materials needed for the visible scope.
6. Output STRICT JSON only (no markdown, no prose).

Return exactly this schema:
{
  "detected_issue": "string",
  "estimated_materials": ["string", "string"],
  "complexity_score": 1,
  "estimated_labor_hours": 1
}

Validation:
- complexity_score must be integer 1-10.
- estimated_labor_hours must be a positive number.
- estimated_materials must be an array of short material names.
`.trim();

function extractJsonObject(text: string) {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('Vision response did not contain a JSON object.');
    }
    return trimmed.slice(start, end + 1);
}

function coerceVisionResult(value: unknown): VisionEstimateResult {
    const fallback: VisionEstimateResult = {
        detected_issue: 'General visible wear requiring onsite inspection.',
        estimated_materials: ['General service materials'],
        complexity_score: 5,
        estimated_labor_hours: 3,
    };

    if (!value || typeof value !== 'object') return fallback;
    const record = value as Record<string, unknown>;

    const materials = Array.isArray(record.estimated_materials)
        ? record.estimated_materials.filter((entry): entry is string => typeof entry === 'string').slice(0, 12)
        : fallback.estimated_materials;

    const complexityRaw = Number(record.complexity_score);
    const complexity = Number.isFinite(complexityRaw) ? Math.max(1, Math.min(10, Math.round(complexityRaw))) : fallback.complexity_score;

    const laborRaw = Number(record.estimated_labor_hours);
    const labor = Number.isFinite(laborRaw) ? Math.max(1, Math.min(160, Math.round(laborRaw * 10) / 10)) : fallback.estimated_labor_hours;

    const detectedIssue = typeof record.detected_issue === 'string' && record.detected_issue.trim()
        ? record.detected_issue.trim()
        : fallback.detected_issue;

    return {
        detected_issue: detectedIssue,
        estimated_materials: materials.length ? materials : fallback.estimated_materials,
        complexity_score: complexity,
        estimated_labor_hours: labor,
    };
}

export async function analyzeProjectImagesWithVision(params: {
    imageUrls: string[];
    industry: string;
    customerContext?: string;
}) {
    const { imageUrls, industry, customerContext } = params;
    if (!imageUrls.length) {
        throw new Error('At least one image URL is required for visual analysis.');
    }

    if (!process.env.OPENAI_API_KEY) {
        return coerceVisionResult({
            detected_issue: `${industry} issue visible from uploaded photos. Onsite validation recommended.`,
            estimated_materials: ['Primary service materials', 'Consumables', 'Fasteners/adhesives'],
            complexity_score: 5,
            estimated_labor_hours: 3.5,
        });
    }

    const userPrompt = [
        `Industry: ${industry}`,
        customerContext ? `Customer Context: ${customerContext}` : 'Customer Context: Not provided.',
        'Analyze all provided images together and produce one consolidated estimate JSON object.',
    ].join('\n');

    const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
        { type: 'text', text: userPrompt },
        ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
    ];

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: VISUAL_ESTIMATOR_SYSTEM_PROMPT },
            { role: 'user', content },
        ],
        temperature: 0.2,
        max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(extractJsonObject(raw));
    return coerceVisionResult(parsed);
}

