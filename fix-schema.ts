import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres.jttcwvpxzejjcspsyfgu:Agent%2ABusiness%211@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" }
    }
});

async function main() {
    console.log("Altering User table...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "orgId" DROP NOT NULL;`);
    console.log("Dropped NOT NULL on orgId!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
