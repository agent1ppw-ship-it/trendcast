type WebsiteBuildInquiryNotification = {
    name: string;
    email: string;
    phone: string;
    businessName: string;
    industry: string;
    cityState: string;
    currentWebsite: string;
    notes: string;
    logoUrl?: string;
    projectPhotoUrls?: string[];
    intent?: 'inquiry' | 'checkout';
};

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function optionalRow(label: string, value: string) {
    if (!value) return '';
    return `<p style="margin:0 0 10px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}

export async function sendWebsiteBuildInquiryNotification(inquiry: WebsiteBuildInquiryNotification) {
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail =
        process.env.WEBSITE_BUILD_INQUIRY_TO_EMAIL ||
        process.env.CONTACT_NOTIFICATION_EMAIL ||
        'vincent@precisionpropertyworks.com';

    if (!apiKey) {
        console.warn('Website build inquiry email skipped because RESEND_API_KEY is missing.');
        return { sent: false as const, reason: 'missing-config' as const };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Trendcast <onboarding@resend.dev>';
    const subject =
        inquiry.intent === 'checkout'
            ? `Website build checkout started by ${inquiry.businessName}`
            : `New website build inquiry from ${inquiry.businessName}`;

    const projectPhotoList = inquiry.projectPhotoUrls?.length
        ? `<ul style="margin:0 0 12px 18px;padding:0;">${inquiry.projectPhotoUrls.map((url) => `<li style="margin:0 0 8px;"><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></li>`).join('')}</ul>`
        : '';

    const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
            <h2 style="margin:0 0 16px;">${inquiry.intent === 'checkout' ? 'Contractor website checkout started' : 'New contractor website build inquiry'}</h2>
            <p style="margin:0 0 10px;"><strong>Name:</strong> ${escapeHtml(inquiry.name)}</p>
            <p style="margin:0 0 10px;"><strong>Business Name:</strong> ${escapeHtml(inquiry.businessName)}</p>
            <p style="margin:0 0 10px;"><strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>
            <p style="margin:0 0 10px;"><strong>Phone:</strong> ${escapeHtml(inquiry.phone)}</p>
            <p style="margin:0 0 10px;"><strong>Industry:</strong> ${escapeHtml(inquiry.industry)}</p>
            ${optionalRow('City / State', inquiry.cityState)}
            ${optionalRow('Current Website', inquiry.currentWebsite)}
            ${optionalRow('Notes', inquiry.notes)}
            ${optionalRow('Logo URL', inquiry.logoUrl || '')}
            ${projectPhotoList ? `<div style="margin:0 0 10px;"><strong>Project Photos:</strong>${projectPhotoList}</div>` : ''}
        </div>
    `;

    const textLines = [
        inquiry.intent === 'checkout' ? 'Contractor website checkout started' : 'New contractor website build inquiry',
        `Name: ${inquiry.name}`,
        `Business Name: ${inquiry.businessName}`,
        `Email: ${inquiry.email}`,
        `Phone: ${inquiry.phone}`,
        `Industry: ${inquiry.industry}`,
        inquiry.cityState ? `City / State: ${inquiry.cityState}` : null,
        inquiry.currentWebsite ? `Current Website: ${inquiry.currentWebsite}` : null,
        inquiry.notes ? `Notes: ${inquiry.notes}` : null,
        inquiry.logoUrl ? `Logo URL: ${inquiry.logoUrl}` : null,
        inquiry.projectPhotoUrls?.length ? `Project Photos: ${inquiry.projectPhotoUrls.join(', ')}` : null,
    ].filter(Boolean);

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: fromEmail,
            to: [toEmail],
            reply_to: inquiry.email,
            subject,
            html,
            text: textLines.join('\n'),
        }),
    });

    if (!response.ok) {
        const payload = await response.text();
        throw new Error(`Resend request failed: ${payload}`);
    }

    return { sent: true as const };
}
