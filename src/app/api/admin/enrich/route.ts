import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') || '1505 Elm St, Dallas, TX 75201';

    const apiKey = process.env.SKIP_TRACING_API_KEY;
    const apiUrl = process.env.SKIP_TRACING_API_URL || 'https://api.batchdata.com/api/v1/property/skip-trace';

    if (!apiKey) {
        return NextResponse.json({ success: false, error: "No API key" });
    }

    try {
        const addressParts = address.split(',');
        let batchDataPayload: any = { requests: [{ address: address }] };

        if (addressParts.length >= 3) {
            const street = addressParts[0].trim();
            const city = addressParts[1].trim();
            const stateZip = addressParts[2].trim().split(' ');

            if (stateZip.length >= 2) {
                batchDataPayload = {
                    requests: [{
                        address: {
                            street: street,
                            city: city,
                            state: stateZip[0],
                            zip: stateZip[1]
                        }
                    }]
                };
            }
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(batchDataPayload),
        });

        const textResponse = await response.text();

        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (e) {
            data = textResponse;
        }

        return NextResponse.json({
            success: true,
            status: response.status,
            payloadSent: batchDataPayload,
            rawResponse: data
        });
    } catch (e: any) {
        return NextResponse.json({
            success: false,
            error: e.message || String(e)
        });
    }
}
