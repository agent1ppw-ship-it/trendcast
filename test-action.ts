import { PrismaClient } from '@prisma/client';
import { revealLeadContact } from './src/app/actions/credits';

const prisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres.jttcwvpxzejjcspsyfgu:Agent%2ABusiness%211@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" }
    }
});

async function main() {
    const lead = await prisma.lead.findFirst({ where: { isRevealed: false } });
    if (!lead) return console.log("No leads to test.");

    console.log("Testing Server Action natively with ID:", lead.id);
    const result = await revealLeadContact(lead.id);
    console.log("Result:", result);
}
main().finally(() => prisma.$disconnect());
