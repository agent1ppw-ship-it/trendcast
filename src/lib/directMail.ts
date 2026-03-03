import crypto from 'crypto';

type MergeLead = {
    name: string;
    address: string;
    source?: string | null;
    status?: string | null;
};

type RecipientAddress = {
    name: string;
    address_line1: string;
    address_line2?: string;
    address_city: string;
    address_state: string;
    address_zip: string;
    address_country: 'US';
};

export type SenderProfile = {
    name?: string | null;
    company?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
};

const STATE_ABBREVIATIONS: Record<string, string> = {
    alabama: 'AL',
    alaska: 'AK',
    arizona: 'AZ',
    arkansas: 'AR',
    california: 'CA',
    colorado: 'CO',
    connecticut: 'CT',
    delaware: 'DE',
    florida: 'FL',
    georgia: 'GA',
    hawaii: 'HI',
    idaho: 'ID',
    illinois: 'IL',
    indiana: 'IN',
    iowa: 'IA',
    kansas: 'KS',
    kentucky: 'KY',
    louisiana: 'LA',
    maine: 'ME',
    maryland: 'MD',
    massachusetts: 'MA',
    michigan: 'MI',
    minnesota: 'MN',
    mississippi: 'MS',
    missouri: 'MO',
    montana: 'MT',
    nebraska: 'NE',
    nevada: 'NV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'north carolina': 'NC',
    'north dakota': 'ND',
    ohio: 'OH',
    oklahoma: 'OK',
    oregon: 'OR',
    pennsylvania: 'PA',
    'rhode island': 'RI',
    'south carolina': 'SC',
    'south dakota': 'SD',
    tennessee: 'TN',
    texas: 'TX',
    utah: 'UT',
    vermont: 'VT',
    virginia: 'VA',
    washington: 'WA',
    'west virginia': 'WV',
    wisconsin: 'WI',
    wyoming: 'WY',
};

type LobVerificationResponse = {
    id?: string;
    primary_line?: string;
    components?: {
        primary_number?: string;
        street_name?: string;
        secondary_designator?: string;
        secondary_number?: string;
        city?: string;
        state?: string;
        zip_code?: string;
    };
    deliverability_analysis?: {
        deliverability?: string;
    };
    valid_address?: boolean;
};

type LobMailPieceResponse = {
    id?: string;
    tracking_events?: Array<{ type?: string; time?: string }>;
};

export const MAIL_PRICING = {
    '4X6': { customerCents: 149, vendorCents: 79, label: 'Postcard 4x6' },
    '6X9': { customerCents: 179, vendorCents: 99, label: 'Postcard 6x9' },
    '8_5X11': { customerCents: 249, vendorCents: 129, label: 'Letter 8.5x11' },
} as const;

export const DEFAULT_MAIL_TEMPLATES = [
    {
        name: 'Just Serviced',
        type: 'POSTCARD',
        size: '4X6',
        frontHeadline: 'We were just in your neighborhood',
        frontBody: 'Our crew recently completed exterior service work nearby. If your property needs the same attention, we can quote it quickly.',
        backHeadline: 'Book a fast estimate',
        backBody: 'Hi {{name}}, if you have been thinking about improving {{address}}, this is a simple time to get pricing. We offer clean proposals, clear scheduling, and work built around your property goals.',
        ctaText: 'Call today for a same-week estimate',
        accentColor: '#2563EB',
        imageUrl: null,
        isDefault: true,
    },
    {
        name: 'Seasonal Offer',
        type: 'POSTCARD',
        size: '6X9',
        frontHeadline: 'Seasonal service offer for nearby homeowners',
        frontBody: 'Protect the value and appearance of your property with a local crew that understands the season, timing, and prep work required.',
        backHeadline: 'Limited neighborhood pricing',
        backBody: 'We are opening a new service run in your area and can group nearby jobs for better pricing. If {{address}} needs attention, now is a good time to plan the work.',
        ctaText: 'Ask about current neighborhood pricing',
        accentColor: '#0F766E',
        imageUrl: null,
        isDefault: true,
    },
    {
        name: 'We Missed You',
        type: 'POSTCARD',
        size: '4X6',
        frontHeadline: 'Still thinking about the project?',
        frontBody: 'If you requested pricing before or meant to follow up, we can reopen the conversation without starting from scratch.',
        backHeadline: 'Pick the project back up',
        backBody: 'Projects often stall because timing gets busy, not because the work is no longer needed. If you still want help with {{address}}, reply when you are ready and we can revisit scope, timing, and next steps.',
        ctaText: 'Reply to restart your estimate',
        accentColor: '#7C3AED',
        imageUrl: null,
        isDefault: true,
    },
];

export function getLobEnvironment() {
    const apiKey = process.env.LOB_API_KEY;
    if (!apiKey) return 'demo' as const;
    if (apiKey.startsWith('test_')) return 'test' as const;
    return 'live' as const;
}

export function getDirectMailMode() {
    return getLobEnvironment() === 'demo' ? 'demo' : 'live';
}

export function calculateMailCost(size: keyof typeof MAIL_PRICING, quantity: number) {
    const safeQuantity = Math.max(quantity, 0);
    const price = MAIL_PRICING[size] || MAIL_PRICING['4X6'];

    return {
        unitCustomerCents: price.customerCents,
        unitVendorCents: price.vendorCents,
        totalCustomerCents: price.customerCents * safeQuantity,
        totalVendorCents: price.vendorCents * safeQuantity,
        quantity: safeQuantity,
        label: price.label,
    };
}

export function replaceMailMergeTags(content: string | null | undefined, lead: MergeLead) {
    if (!content) return '';

    const parsed = parseAddressString(lead.address);
    const serviceContext = [lead.source, lead.status].filter(Boolean).join(' / ');

    return content
        .replaceAll('{{name}}', lead.name || 'Homeowner')
        .replaceAll('{{address}}', lead.address || 'your property')
        .replaceAll('{{city}}', parsed.city || 'your area')
        .replaceAll('{{state}}', parsed.state || '')
        .replaceAll('{{zip}}', parsed.zip || '')
        .replaceAll('{{source}}', lead.source || 'local lead')
        .replaceAll('{{status}}', lead.status || 'new opportunity')
        .replaceAll('{{service}}', serviceContext || 'home service work');
}

export function renderMailPreview(template: {
    frontHeadline: string;
    frontBody: string;
    backHeadline?: string | null;
    backBody: string;
    ctaText?: string | null;
    accentColor?: string | null;
}, lead: MergeLead) {
    const accentColor = template.accentColor || '#2563EB';

    return {
        frontHtml: `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:40px;background:${accentColor};color:white;font-family:Helvetica,Arial,sans-serif;">
                <div>
                    <div style="font-size:14px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85;">Trendcast Direct Mail</div>
                    <h1 style="font-size:40px;line-height:1.1;margin:18px 0 12px;">${escapeHtml(replaceMailMergeTags(template.frontHeadline, lead))}</h1>
                    <p style="font-size:20px;line-height:1.5;max-width:80%;">${escapeHtml(replaceMailMergeTags(template.frontBody, lead))}</p>
                </div>
                <div style="font-size:16px;opacity:0.9;">Built for local service businesses</div>
            </div>
        `.trim(),
        backHtml: `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:40px;background:#0F172A;color:white;font-family:Helvetica,Arial,sans-serif;">
                <div>
                    <div style="font-size:14px;letter-spacing:0.2em;text-transform:uppercase;color:${accentColor};">Message</div>
                    ${template.backHeadline ? `<h2 style="font-size:30px;line-height:1.2;margin:16px 0 10px;">${escapeHtml(replaceMailMergeTags(template.backHeadline, lead))}</h2>` : ''}
                    <p style="font-size:18px;line-height:1.65;max-width:75%;">${escapeHtml(replaceMailMergeTags(template.backBody, lead))}</p>
                </div>
                ${template.ctaText ? `<div style="display:inline-block;padding:14px 18px;border-radius:999px;background:${accentColor};font-size:16px;font-weight:700;">${escapeHtml(replaceMailMergeTags(template.ctaText, lead))}</div>` : ''}
            </div>
        `.trim(),
    };
}

export function parseAddressString(address: string | null | undefined) {
    if (!address) {
        return { line1: '', city: '', state: '', zip: '' };
    }

    const normalized = address.replace(/\s+/g, ' ').trim();
    const match = normalized.match(/^(.*?)(?:,\s*([^,]+))?(?:,\s*([A-Z]{2}))?\s+(\d{5}(?:-\d{4})?)?$/i);

    if (!match) {
        return parseOpenStreetMapAddress(normalized);
    }

    return {
        line1: (match[1] || '').trim(),
        city: (match[2] || '').trim(),
        state: ((match[3] || '').trim().toUpperCase()),
        zip: (match[4] || '').trim(),
    };
}

function parseOpenStreetMapAddress(normalized: string) {
    const parts = normalized
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .filter((part) => part.toLowerCase() !== 'united states');

    if (parts.length < 4) {
        return { line1: normalized, city: '', state: '', zip: '' };
    }

    const zip = /^\d{5}(?:-\d{4})?$/.test(parts[parts.length - 1]) ? parts.pop() || '' : '';
    const stateToken = parts.pop() || '';
    const state = normalizeStateToken(stateToken);

    // Drop county/admin-area token if present.
    if (parts.length > 0 && /county|parish|borough|municipio|census area/i.test(parts[parts.length - 1])) {
        parts.pop();
    }

    const city = parts.pop() || '';
    const streetParts = parts.filter((part) => !looksLikeBusinessName(part));
    let line1 = streetParts.join(' ');

    if (streetParts.length >= 2 && /^\d+[A-Z\-]*$/i.test(streetParts[0])) {
        line1 = `${streetParts[0]} ${streetParts.slice(1).join(' ')}`.trim();
    }

    if (!line1 && parts.length >= 2 && /^\d+[A-Z\-]*$/i.test(parts[0])) {
        line1 = `${parts[0]} ${parts[1]}`.trim();
    }

    return {
        line1,
        city,
        state,
        zip,
    };
}

function normalizeStateToken(token: string) {
    const cleaned = token.trim();
    if (/^[A-Z]{2}$/i.test(cleaned)) {
        return cleaned.toUpperCase();
    }

    return STATE_ABBREVIATIONS[cleaned.toLowerCase()] || cleaned.toUpperCase();
}

function looksLikeBusinessName(token: string) {
    return /llc|inc|landscaping|roofing|plumbing|hvac|services|service|company|contractor|care/i.test(token);
}

export function buildRecipientAddress(lead: MergeLead): RecipientAddress | null {
    if (!lead.address) return null;

    const parsed = parseAddressString(lead.address);
    if (!parsed.line1 || !parsed.city || !parsed.state || !parsed.zip) {
        return null;
    }

    return {
        name: lead.name || 'Homeowner',
        address_line1: parsed.line1,
        address_city: parsed.city,
        address_state: parsed.state,
        address_zip: parsed.zip,
        address_country: 'US',
    };
}

export function hasCompleteSenderProfile(profile: SenderProfile | null | undefined) {
    return Boolean(
        profile?.addressLine1 &&
        profile?.city &&
        profile?.state &&
        profile?.zip &&
        (profile?.name || profile?.company)
    );
}

export function getSenderAddress(profile: SenderProfile | null | undefined) {
    if (!hasCompleteSenderProfile(profile)) return null;

    return {
        name: profile?.name || profile?.company || 'Trendcast',
        address_line1: profile?.addressLine1 as string,
        address_line2: profile?.addressLine2 || undefined,
        address_city: profile?.city as string,
        address_state: profile?.state as string,
        address_zip: profile?.zip as string,
        address_country: 'US' as const,
    };
}

async function lobRequest<T>(path: string, body: Record<string, unknown>) {
    const apiKey = process.env.LOB_API_KEY;
    if (!apiKey) {
        throw new Error('LOB_API_KEY is not configured.');
    }

    const response = await fetch(`https://api.lob.com/v1${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
    });

    if (!response.ok) {
        const responseText = await response.text();
        let detail = responseText;

        try {
            const parsed = JSON.parse(responseText) as {
                error?: {
                    message?: string;
                    name?: string;
                };
            };
            detail = parsed.error?.message || parsed.error?.name || responseText;
        } catch {
            // Keep raw text when Lob does not return JSON.
        }

        throw new Error(`Lob request failed (${response.status}): ${detail}`);
    }

    return response.json() as Promise<T>;
}

export async function verifyAddressWithLob(recipient: RecipientAddress) {
    const payload = await lobRequest<LobVerificationResponse>('/us_verifications?case=proper', {
        primary_line: recipient.address_line1,
        city: recipient.address_city,
        state: recipient.address_state,
        zip_code: recipient.address_zip,
    });

    return {
        lobId: payload.id || null,
        standardizedAddress: [
            payload.primary_line || recipient.address_line1,
            payload.components?.city || recipient.address_city,
            payload.components?.state || recipient.address_state,
            payload.components?.zip_code || recipient.address_zip,
        ].filter(Boolean).join(', '),
        deliverable: payload.valid_address === true || payload.deliverability_analysis?.deliverability?.startsWith('deliverable') === true,
        parsed: {
            line1: payload.primary_line || recipient.address_line1,
            city: payload.components?.city || recipient.address_city,
            state: payload.components?.state || recipient.address_state,
            zip: payload.components?.zip_code || recipient.address_zip,
        },
        raw: payload,
    };
}

export async function createLobPostcard(options: {
    sender: SenderProfile;
    recipient: RecipientAddress;
    frontHtml: string;
    backHtml: string;
    size: '4X6' | '6X9';
    mailType: 'MARKETING' | 'FIRST_CLASS';
    description: string;
}) {
    const sender = getSenderAddress(options.sender);
    if (!sender) {
        throw new Error('Organization sender profile is incomplete.');
    }

    const response = await lobRequest<LobMailPieceResponse>('/postcards', {
        description: options.description.slice(0, 255),
        to: options.recipient,
        from: sender,
        front: options.frontHtml,
        back: options.backHtml,
        size: options.size.toLowerCase(),
        mail_type: options.mailType === 'FIRST_CLASS' ? 'usps_first_class' : 'usps_standard',
        use_type: 'marketing',
    });

    return {
        id: response.id || null,
        trackingId: response.id || null,
        raw: response,
    };
}

export function verifyLobWebhookSignature(rawBody: string, signature: string | null, timestamp: string | null, secret: string | null) {
    if (!signature || !timestamp || !secret) return false;

    const payload = `${timestamp}.${rawBody}`;
    const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function inferMailOrderStatusFromLobEvent(eventType: string) {
    if (eventType.includes('delivered')) return 'DELIVERED';
    if (eventType.includes('mailed')) return 'MAILED';
    if (eventType.includes('failed')) return 'FAILED';
    return 'PRINTING';
}

function escapeHtml(input: string) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
