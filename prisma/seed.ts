import { PrismaClient } from '@prisma/client';
import { DEFAULT_INSTANT_REPLY_TEMPLATE } from '../src/lib/ai/autoReply';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // Clean existing data to prevent unique constraint conflicts
    await prisma.aiConfig.deleteMany();
    await prisma.inventoryPricing.deleteMany();
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
            systemPrompt: DEFAULT_INSTANT_REPLY_TEMPLATE,
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

    await prisma.inventoryPricing.createMany({
        data: [
            { orgId: org.id, sku: 'labor_hourly_rate', label: 'Labor Hourly Rate', category: 'LABOR', unitCost: 95, unit: 'hour' },
            { orgId: org.id, sku: 'overhead_rate', label: 'Overhead Rate', category: 'LABOR', unitCost: 0.14, unit: 'ratio' },
            { orgId: org.id, sku: 'margin_good', label: 'Good Tier Margin', category: 'LABOR', unitCost: 0.2, unit: 'ratio' },
            { orgId: org.id, sku: 'margin_better', label: 'Better Tier Margin', category: 'LABOR', unitCost: 0.34, unit: 'ratio' },
            { orgId: org.id, sku: 'margin_best', label: 'Best Tier Margin', category: 'LABOR', unitCost: 0.5, unit: 'ratio' },
            { orgId: org.id, sku: 'pvc_pipe', label: 'PVC Pipe', category: 'MATERIAL', unitCost: 32, unit: 'item' },
            { orgId: org.id, sku: 'breaker_panel', label: 'Breaker Panel', category: 'MATERIAL', unitCost: 520, unit: 'item' },
            { orgId: org.id, sku: 'wire_spool', label: 'Wire Spool', category: 'MATERIAL', unitCost: 140, unit: 'item' },
            { orgId: org.id, sku: 'sealant', label: 'Sealant', category: 'MATERIAL', unitCost: 22, unit: 'item' },
            { orgId: org.id, sku: 'concrete_mix', label: 'Concrete Mix', category: 'MATERIAL', unitCost: 38, unit: 'item' },
        ],
    });

    console.log('Seeded InventoryPricing defaults.');
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
