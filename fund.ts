import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://postgres.qssrlsbtuoxkndwmdszn:eG2Qn4jH3VunH7aQ@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" }
  }
});

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'agent1ppw@gmail.com' }
  });

  if (!user || !user.orgId) {
    console.log('User or Organization not found!');
    return;
  }

  const updatedOrg = await prisma.organization.update({
    where: { id: user.orgId },
    data: { extracts: 1000, credits: 5000 }
  });

  console.log(`Successfully funded ${updatedOrg.name} with ${updatedOrg.extracts} extracts and ${updatedOrg.credits} credits!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
