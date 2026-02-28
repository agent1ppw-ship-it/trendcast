import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const organization = await prisma.organization.create({
            data: {
                name: `Test Business`,
                tier: 'INTRO',
                industry: 'Home Services',
                extracts: 10,
                credits: 50,
                users: {
                    create: {
                        email: `test_${Date.now()}@example.com`,
                        password: 'hashedPassword',
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
        console.log("Success:", organization);
    } catch (e: any) {
        console.error("Database Error:", e);
    }
}

main().finally(() => prisma.$disconnect());
