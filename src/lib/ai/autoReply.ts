export const DEFAULT_INSTANT_REPLY_TEMPLATE =
    'Hi! Thanks for contacting {{businessName}}. We got your message: "{{inquiry}}". A team member will follow up shortly. If helpful, reply with your address and requested service.';

interface AutoReplyVariables {
    businessName: string;
    industry: string;
    sender: string;
    inquiry: string;
    timestamp: string;
}

export function normalizePhoneNumber(value: string | null | undefined) {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';

    const hasPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return '';
    return hasPlus ? `+${digits}` : digits;
}

export function buildInstantReplyMessage(
    template: string | null | undefined,
    variables: AutoReplyVariables,
) {
    const rawTemplate = template?.trim() || DEFAULT_INSTANT_REPLY_TEMPLATE;
    const rendered = rawTemplate.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
        const lookup: Record<string, string> = {
            businessName: variables.businessName,
            industry: variables.industry,
            sender: variables.sender,
            inquiry: variables.inquiry,
            timestamp: variables.timestamp,
        };
        return lookup[key] || '';
    });

    return rendered.replace(/\s+/g, ' ').trim().slice(0, 1400);
}

export function xmlEscape(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

