import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const users = await prisma.user.findMany();
    console.log('All Users in DB:');
    users.forEach(u => console.log(u.email));
}
run().finally(() => prisma.$disconnect());
