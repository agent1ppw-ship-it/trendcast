import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres.jttcwvpxzejjcspsyfgu:Agent%2ABusiness%211@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" }
    }
});

async function main() {
    try {
        const user = await prisma.user.create({
            data: {
                id: 'test-oauth-uuid-123',
                email: 'test@example.com',
                name: 'Test OAuth',
                image: 'http://example.com/test.png'
            }
        });
        console.log("Successfully created User:", user);
    } catch (e: any) {
        console.error("Failed to create User:", e.message);
    }
}

main().finally(() => prisma.$disconnect());
