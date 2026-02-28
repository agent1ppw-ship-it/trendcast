import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres.jttcwvpxzejjcspsyfgu:Agent%2ABusiness%211@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" }
    }
});

async function main() {
    console.log("Starting test...");
    const lead = await prisma.lead.findFirst({ where: { status: 'EXTRACTED' } });

    if (!lead) {
        console.log("No leads to test.");
        return;
    }

    console.log("Found lead:", lead.id);

    try {
        await prisma.$transaction([
            prisma.organization.update({
                where: { id: lead.orgId },
                data: { credits: { decrement: 50 } }
            }),
            prisma.lead.update({
                where: { id: lead.id },
                data: { name: "Test Name", phone: "123-456-7890", isRevealed: true }
            })
        ]);
        console.log("Transaction succeeded!");
    } catch (e: any) {
        console.error("TRANSACTION FAILED:", e.message);
    }
}
main().finally(() => prisma.$disconnect());
