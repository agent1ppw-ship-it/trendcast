import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
    const prisma = new PrismaClient();

    try {
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

        // Create Indexes using IF NOT EXISTS syntax safe for Postgres
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
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
                    ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
                    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
