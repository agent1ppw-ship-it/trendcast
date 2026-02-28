

async function testMelissa() {
    const apiKey = process.env.SKIP_TRACING_API_KEY;
    const apiUrl = process.env.SKIP_TRACING_API_URL || 'https://dataretriever.melissadata.net/web/V1';

    console.log(`Using Key: ${apiKey?.substring(0, 10)}...`);
    console.log(`Using URL: ${apiUrl}`);

    const address = "1505 Elm St, Dallas, TX 75201";

    try {
        console.log("1. Testing GET Request (some Melissa endpoints use GET)");
        const getUrl = new URL(apiUrl);
        // Try guessing common parameters
        getUrl.searchParams.append('id', apiKey || '');
        getUrl.searchParams.append('freeform', address);
        getUrl.searchParams.append('format', 'json');

        console.log(`GET URL: ${getUrl.toString()}`);

        try {
            const getRes = await fetch(getUrl.toString());
            console.log(`GET Status: ${getRes.status}`);
            const getText = await getRes.text();
            console.log(`GET Response: ${getText.substring(0, 200)}`);
        } catch (e: any) {
            console.error("GET Failed:", e.message);
        }

        console.log("\n2. Testing POST Request with standard Melissa Payload");
        try {
            const postRes = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    TransmissionReference: `TC-Test-${Date.now()}`,
                    CustomerID: apiKey,
                    Records: [{
                        RecordID: "1",
                        FreeForm: address
                    }]
                }),
            });
            console.log(`POST Status: ${postRes.status}`);
            const postText = await postRes.text();
            console.log(`POST Response: ${postText.substring(0, 500)}`);
        } catch (e: any) {
            console.error("POST Failed:", e.message);
        }

    } catch (e) {
        console.error("Test error:", e);
    }
}

testMelissa();
