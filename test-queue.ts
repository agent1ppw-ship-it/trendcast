import { startScraperJob } from './src/app/actions/scraper';

async function main() {
    console.log("Adding job to queue...");
    const result = await startScraperJob('75201');
    console.log("Result:", result);
    process.exit(0);
}

main();
