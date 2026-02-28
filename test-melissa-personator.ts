async function testPersonator() {
    const apiKey = "h7PnbXZJSo6IXxqebz6w-z**";
    const address = "1505 Elm St, Dallas, TX 75201";

    const endpoints = [
        "https://personator.melissadata.net/v3/WEB/ContactVerify/doContactVerify"
    ];

    for (const url of endpoints) {
        console.log(`\nTesting: ${url}`);

        const getUrl = new URL(url);
        getUrl.searchParams.append('id', apiKey);
        getUrl.searchParams.append('freeform', address);
        // Ask for all data including demographics/owner/phones
        getUrl.searchParams.append('a', 'Demographics,Property'); // Actions
        getUrl.searchParams.append('format', 'json');

        try {
            const getRes = await fetch(getUrl.toString());
            console.log(`GET Status: ${getRes.status}`);
            if (getRes.status === 200) {
                const text = await getRes.json();
                console.log(JSON.stringify(text, null, 2));
            }
        } catch (e: any) {
            console.error("GET Failed:", e.message);
        }
    }
}

testPersonator();
