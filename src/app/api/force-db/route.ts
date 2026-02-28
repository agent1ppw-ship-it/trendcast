import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
    let dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
    if (!dbUrl.includes("pgbouncer=true")) {
        dbUrl += (dbUrl.includes("?") ? "&" : "?") + "pgbouncer=true";
    }

    const prisma = new PrismaClient({
        datasources: {
            db: { url: dbUrl }
        }
    });

    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Organization" (
                "id" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "tier" TEXT NOT NULL DEFAULT 'INTRO',
                "industry" TEXT NOT NULL,
                "stripeCustomerId" TEXT,
                "credits" INTEGER NOT NULL DEFAULT 50,
                "extracts" INTEGER NOT NULL DEFAULT 10,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "User" (
                "id" TEXT NOT NULL,
                "orgId" TEXT,
                "email" TEXT,
                "emailVerified" TIMESTAMP(3),
                "image" TEXT,
                "name" TEXT,
                "role" TEXT NOT NULL DEFAULT 'USER',
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "User_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Account" (
                "id" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "type" TEXT NOT NULL,
                "provider" TEXT NOT NULL,
                "providerAccountId" TEXT NOT NULL,
                "refresh_token" TEXT,
                "access_token" TEXT,
                "expires_at" INTEGER,
                "token_type" TEXT,
                "scope" TEXT,
                "id_token" TEXT,
                "session_state" TEXT,
                CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Session" (
                "id" TEXT NOT NULL,
                "sessionToken" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "VerificationToken" (
                "identifier" TEXT NOT NULL,
                "token" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Lead" (
                "id" TEXT NOT NULL,
                "orgId" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "phone" TEXT,
                "address" TEXT,
                "source" TEXT NOT NULL DEFAULT 'SCRAPER',
                "leadScore" INTEGER NOT NULL DEFAULT 0,
                "status" TEXT NOT NULL DEFAULT 'NEW',
                "isRevealed" BOOLEAN NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "AiConfig" (
                "id" TEXT NOT NULL,
                "orgId" TEXT NOT NULL,
                "systemPrompt" TEXT NOT NULL,
                "autoReplySMS" BOOLEAN NOT NULL DEFAULT false,
                "autoSchedule" BOOLEAN NOT NULL DEFAULT false,
                "twilioNumber" TEXT,
                CONSTRAINT "AiConfig_pkey" PRIMARY KEY ("id")
            );
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Job" (
                "id" TEXT NOT NULL,
                "orgId" TEXT NOT NULL,
                "title" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'PENDING',
                "scheduledFor" TIMESTAMP(3),
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
            );
        `);

        // Create Indexes using IF NOT EXISTS syntax safe for Postgres
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "AiConfig_orgId_key" ON "AiConfig"("orgId");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
        `);

        // Add constraints inside exception handling blocks natively
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_orgId_fkey') THEN
                    ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
                    ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
                    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lead_orgId_fkey') THEN
                    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiConfig_orgId_fkey') THEN
                    ALTER TABLE "AiConfig" ADD CONSTRAINT "AiConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Job_orgId_fkey') THEN
                    ALTER TABLE "Job" ADD CONSTRAINT "Job_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
                END IF;
            END
            $$;
        `);

        return NextResponse.json({ success: true, message: "Prisma executeRaw deployed tables perfectly to Vercel!" });
    } catch (e: any) {
        return NextResponse.json({
            success: false,
            error: "Prisma Execution failed",
            details: e.message || String(e)
        }, { status: 500 });
    }
}
