import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
if (!dbUrl.includes("pgbouncer=true")) {
    dbUrl += (dbUrl.includes("?") ? "&" : "?") + "pgbouncer=true";
}

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        datasources: {
            db: { url: dbUrl }
        }
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
