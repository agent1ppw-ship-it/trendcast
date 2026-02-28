import { PrismaClient } from '@prisma/client';

// Force the client to use the exact variable Vercel uses in production
process.env.POSTGRES_URL = "postgresql://postgres:Agent*Business!1@db.jttcwvpxzejjcspsyfgu.supabase.co:5432/postgres";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.POSTGRES_URL
        }
    }
});

async function main() {
    console.log("Simulating Vercel production signup payload...\n");
    try {
        const organization = await prisma.organization.create({
            data: {
                name: `Production Test Business`,
                tier: 'INTRO',
                industry: 'Home Services',
                users: {
                    create: {
                        email: `prod_test_${Date.now()}@example.com`,
                        role: 'ADMIN',
                    }
                },
                aiSettings: {
                    create: {
                        systemPrompt: 'You are a helpful home service estimator assistant.',
                        autoReplySMS: false,
                        autoSchedule: false,
                    }
                }
            },
            include: { users: true }
        });
        console.log("✅ SUCCESS - Created Organization:", organization.id);
    } catch (e: any) {
        console.error("\n❌ DATABASE ERROR ENCOUNTERED ❌");
        console.error("Message:", e.message);
        console.error("Meta:", e.meta);
        console.error("Code:", e.code);
    }
}

main().finally(() => prisma.$disconnect());
