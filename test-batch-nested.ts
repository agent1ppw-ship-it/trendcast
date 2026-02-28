async function testBatch2() {
    const apiKey = "EVMHFKlfwRK35TNuRkKXnOb3juKsY8AFzVo9lI7m";
    const url = "https://api.batchdata.com/api/v1/property/skip-trace";

    const payload = {
        requests: [
            {
                // BatchData often requires the address to be split, or fullAddress property
                propertyAddress: {
                    street: "1505 Elm St",
                    city: "Dallas",
                    state: "TX",
                    zip: "75201"
                }
            }
        ]
    };

    console.log(`\nTesting POST: ${url}`);
    try {
        const postRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
        });
        console.log(`Status: ${postRes.status}`);
        const text = await postRes.text();
        console.log(`Response: ${text.substring(0, 1000)}`);

    } catch (e: any) {
        console.error("POST Failed:", e.message);
    }
}

testBatch2();
