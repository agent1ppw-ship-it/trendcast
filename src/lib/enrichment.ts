import { faker } from '@faker-js/faker';

/**
 * Enrichment Pipeline
 * Takes a raw address from the scraper and queries a Skip Tracing API
 * to find the real homeowner's name and mobile phone number.
 */

interface EnrichmentResult {
    ownerName: string;
    mobileNumber: string;
    carrierType: 'mobile' | 'landline' | 'voip';
    confidenceScore: number;
}

export async function enrichLead(address: string): Promise<EnrichmentResult | null> {
    // Defensive Check: Don't spend money checking empty/malformed addresses
    if (!address || address.length < 5) return null;

    console.log(`[Enrichment] Looking up data for: ${address}`);

    const apiKey = process.env.SKIP_TRACING_API_KEY;
    const apiUrl = process.env.SKIP_TRACING_API_URL || 'https://api.batchskiptracing.com/v1/enrich';

    // If the user hasn't provided an API key yet, fallback to "Unknown"
    if (!apiKey) {
        console.warn(`[Enrichment] No SKIP_TRACING_API_KEY found in .env. Falling back to Unknown for ${address}.`);
        return {
            ownerName: 'Unknown',
            mobileNumber: '',
            carrierType: 'mobile',
            confidenceScore: 0,
        };
    }

    try {
        // Attempt to parse out the address (Expected Zillow/Redfin format: "1505 Elm St, Dallas, TX 75201")
        const addressParts = address.split(',');
        let batchDataPayload: any = { requests: [{ address: address }] }; // Safe default

        if (addressParts.length >= 3) {
            const street = addressParts[0].trim();
            const city = addressParts[1].trim();
            const stateZip = addressParts[2].trim().split(' ');

            if (stateZip.length >= 2) {
                batchDataPayload = {
                    requests: [{
                        propertyAddress: {
                            street: street,
                            city: city,
                            state: stateZip[0],
                            zip: stateZip[1]
                        }
                    }]
                };
            }
        }

        // Constructing a standard BatchData / BatchSkipTracing payload
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

        // Handle explicit BatchData error statuses
        if (!response.ok) {
            console.warn(`[Enrichment] BatchData API Error (${response.status}): ${textResponse.substring(0, 100)}... Falling back to Unknown.`);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = JSON.parse(textResponse);

        // Parse BatchData response structure
        // BatchData returns: { status: {...}, results: { persons: [...] } }
        const persons = data?.data?.results?.persons || data?.results?.persons;

        if (!persons || !Array.isArray(persons) || persons.length === 0) {
            console.log(`[Enrichment] No match found or zero records returned for: ${address}`);
            return {
                ownerName: 'Unknown',
                mobileNumber: '',
                carrierType: 'mobile',
                confidenceScore: 0,
            };
        }

        const person = persons[0];

        // BatchData sometimes returns a person object but leaves "name": {} empty if it couldn't find the owner
        if (!person?.name || Object.keys(person.name).length === 0) {
            console.log(`[Enrichment] Record traced but name is empty for: ${address}`);
            return {
                ownerName: 'Unknown',
                mobileNumber: '',
                carrierType: 'mobile',
                confidenceScore: 0,
            };
        }

        const ownerName = person.name.full || (person.name.first ? `${person.name.first} ${person.name.last || ''}`.trim() : 'Unknown');

        // Find best phone (mobile preferred)
        let mobileNumber = '';
        if (person.phoneNumbers && Array.isArray(person.phoneNumbers)) {
            const bestPhone = person.phoneNumbers.find((p: any) => p.type?.toLowerCase() === 'mobile' || p.type?.toLowerCase() === 'wireless') || person.phoneNumbers[0];
            mobileNumber = bestPhone?.number || '';
        }



        const enrichedData: EnrichmentResult = {
            ownerName: ownerName || 'Unknown',
            mobileNumber: mobileNumber || '',
            carrierType: 'mobile',
            confidenceScore: 99,
        };

        console.log(`[Enrichment] Live Match Found: ${enrichedData.ownerName} (${enrichedData.mobileNumber})`);

        return enrichedData;

    } catch (error) {
        console.warn(`[Enrichment] Skip tracing API network request failed for ${address}. Falling back to Unknown. Error:`, (error as Error).message);
        return {
            ownerName: 'Unknown',
            mobileNumber: '',
            carrierType: 'mobile',
            confidenceScore: 0,
        };
    }
}
