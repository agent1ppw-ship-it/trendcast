async function testEndpoints() {
    const apiKey = "h7PnbXZJSo6IXxqebz6w-z**";
    const address = "1505 Elm St, Dallas, TX 75201";

    const endpoints = [
        "https://dataretriever.melissadata.net/v3/WEB/ContactVerify/doContactVerify",
        "https://personator.melissadata.net/v3/WEB/ContactVerify/doContactVerify",
        "https://property.melissadata.net/v4/WEB/LookupProperty",
        "https://globalproperty.melissadata.net/V1/WEB/doGlobalProperty",
        "https://dataretriever.melissadata.net/web/V1/Property",
        "https://dataretriever.melissadata.net/web/V1/Personator"
    ];

    for (const url of endpoints) {
        console.log(`\nTesting: ${url}`);

        const getUrl = new URL(url);
        getUrl.searchParams.append('id', apiKey);
        getUrl.searchParams.append('freeform', address);
        getUrl.searchParams.append('format', 'json');

        try {
            const getRes = await fetch(getUrl.toString());
            console.log(`GET Status: ${getRes.status}`);
            if (getRes.status === 200) {
                const text = await getRes.text();
                console.log(text.substring(0, 300));
            }
        } catch (e: any) {
            console.error("GET Failed:", e.message);
        }
    }
}

testEndpoints();
