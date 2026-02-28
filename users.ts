import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres.jttcwvpxzejjcspsyfgu:Agent%2ABusiness%211@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" }
    }
});

async function main() {
    const users = await prisma.user.findMany();
    console.log("Users in Production DB:", users.length);
    users.forEach(u => console.log(u.email));

    const orgs = await prisma.organization.findMany();
    console.log("Orgs in Production DB:", orgs.length);
    orgs.forEach(o => console.log(o.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
