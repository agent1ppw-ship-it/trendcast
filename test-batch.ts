async function testBatch() {
    const apiKey = "EVMHFKlfwRK35TNuRkKXnOb3juKsY8AFzVo9lI7m";
    const address = "1505 Elm St, Dallas, TX 75201";

    const endpoints = [
        { url: "https://api.batchdata.com/api/v1/property/skip-trace", payload: { requests: [{ address: "1505 Elm St", city: "Dallas", state: "TX", zip: "75201" }] } },
        { url: "https://api.batchdata.com/api/v1/property/skip-trace", payload: { address: address } },
        { url: "https://api.batchskiptracing.com/v1/enrich", payload: { address: address } }
    ];

    for (const ep of endpoints) {
        console.log(`\nTesting POST: ${ep.url}`);
        try {
            const postRes = await fetch(ep.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(ep.payload),
            });
            console.log(`Status: ${postRes.status}`);
            if (postRes.status === 200 || postRes.status === 400 || postRes.status === 401 || postRes.status === 403 || postRes.status === 404) {
                const text = await postRes.text();
                console.log(`Response: ${text.substring(0, 300)}`);
            }
        } catch (e: any) {
            console.error("POST Failed:", e.message);
        }
    }
}

testBatch();
