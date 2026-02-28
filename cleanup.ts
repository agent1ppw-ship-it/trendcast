import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres.jttcwvpxzejjcspsyfgu:Agent%2ABusiness%211@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" }
    }
});

async function main() {
    await prisma.user.deleteMany({ where: { id: 'test-oauth-uuid-123' } });
    console.log("Cleanup done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
