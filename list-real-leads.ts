import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres.jttcwvpxzejjcspsyfgu:Agent%2ABusiness%211@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" }
    }
});

async function main() {
    console.log("Fetching real leads from Production DB...");
    const leads = await prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { address: true, name: true, phone: true }
    });
    console.log(JSON.stringify(leads, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
