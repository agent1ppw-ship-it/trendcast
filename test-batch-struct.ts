async function verifyStructure() {
    const apiKey = "EVMHFKlfwRK35TNuRkKXnOb3juKsY8AFzVo9lI7m";
    const url = "https://api.batchdata.com/api/v1/property/skip-trace";

    const payload = {
        requests: [
            {
                propertyAddress: {
                    street: "1505 Elm St",
                    city: "Dallas",
                    state: "TX",
                    zip: "75201"
                }
            }
        ]
    };

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
        const json = await postRes.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e: any) {
        console.error("POST Failed:", e.message);
    }
}

verifyStructure();
