import { Client } from 'pg';

const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
    'ap-south-1', 'sa-east-1', 'ca-central-1'
];

async function findRegion() {
    console.log("Searching for correct Supabase tenant region...");

    for (let region of regions) {
        // We only test the connection string formulation without the password first, to see if the tenant exists
        // A "password authentication failed" error string means the tenant WAS found!
        // A "Tenant or user not found" error means the region is wrong.

        const testUri = `postgresql://postgres.jttcwvpxzejjcspsyfgu:Agent*Business!1@aws-0-${region}.pooler.supabase.com:6543/postgres`;

        try {
            const client = new Client({ connectionString: testUri, connectionTimeoutMillis: 5000 });
            await client.connect();
            console.log(`\n✅ SUCCESS! EXACT URL FOUND (Region: ${region})\n`);
            console.log(`URL: ${testUri}\n`);
            await client.end();
            return testUri;
        } catch (e: any) {
            if (e.message.includes("password authentication failed")) {
                console.log(`\n✅ SUCCESS! TENANT FOUND IN REGION ${region} (Password auth blocked, but tenant exists!)\n`);
                console.log(`URL: ${testUri}\n`);
                return testUri;
            } else if (!e.message.includes("Tenant or user not found")) {
                console.log(`[${region}] Unexpected Error: ${e.message}`);
            } else {
                console.log(`[${region}] Tenant not found...`);
            }
        }
    }
    console.log("\n❌ Exhausted all regions. Checking IPv4 Transaction Proxy...");
}

findRegion();
