async function testProperty() {
    const apiKey = "h7PnbXZJSo6IXxqebz6w-z**";
    const address = "1505 Elm St, Dallas, TX 75201";

    const endpoints = [
        "https://property.melissadata.net/v4/WEB/LookupProperty"
    ];

    for (const url of endpoints) {
        console.log(`\nTesting: ${url}`);

        const getUrl = new URL(url);
        getUrl.searchParams.append('id', apiKey);
        getUrl.searchParams.append('ff', address); // Property v4 uses 'ff' for freeform, or sometimes 'AddressKey'. Actually let's use AddressLine1
        getUrl.searchParams.append('Address', "1505 Elm St");
        getUrl.searchParams.append('City', "Dallas");
        getUrl.searchParams.append('State', "TX");
        getUrl.searchParams.append('Zip', "75201");
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

testProperty();
