import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres:Agent*Business!1@db.jttcwvpxzejjcspsyfgu.supabase.co:5432/postgres" }
    }
});

async function main() {
    const orgs = await prisma.organization.findMany();
    console.log("All orgs in Direct DB (5432):", orgs.length);
    orgs.forEach(o => console.log(o.id, o.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
