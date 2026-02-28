import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // Clean existing data to prevent unique constraint conflicts
    await prisma.aiConfig.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.job.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    console.log('Cleared existing database records.');

    // Create an initial Organization
    const org = await prisma.organization.create({
        data: {
            name: 'TrendCast Demo User',
            tier: 'ENTERPRISE',
            industry: 'Pressure Washing',
        }
    });

    console.log(`Created Organization: ${org.name}`);

    // Create an Admin User
    const user = await prisma.user.create({
        data: {
            orgId: org.id,
            email: 'admin@trendcast.local',
            name: 'Admin',
            role: 'ADMIN',
        }
    });

    console.log(`Created User: ${user.email}`);

    // Set up AI Config
    await prisma.aiConfig.create({
        data: {
            orgId: org.id,
            systemPrompt: 'You are an expert sales rep...',
            autoReplySMS: true,
            autoSchedule: true,
            twilioNumber: '+15555555555',
        }
    });

    // Seed Leads
    const leadsData = [
        { name: 'Sarah Connor', phone: '555-123-4567', address: '12 Tech Blvd, Austin TX', source: 'SCRAPER', status: 'NEW', leadScore: 90 },
        { name: 'John Matrix', phone: '555-987-6543', address: '88 Commando Dr, Dallas TX', source: 'ORGANIC', status: 'CONTACTED', leadScore: 65 },
        { name: 'Dutch Schaefer', phone: '555-555-0000', address: '1 Jungle Way, Houston TX', source: 'MANUAL', status: 'QUOTED', leadScore: 40 },
    ];

    for (const lead of leadsData) {
        await prisma.lead.create({
            data: {
                orgId: org.id,
                ...lead
            }
        });
    }

    console.log(`Seeded ${leadsData.length} leads.`);
    console.log('Seeding finished.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
