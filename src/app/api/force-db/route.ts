import { NextResponse } from 'next/server';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET() {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        return NextResponse.json({ success: false, error: "No database URL found in environment variables." });
    }

    const client = new Client({ connectionString });

    try {
        await client.connect();

        const sql = `
            -- CreateTable
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

            -- CreateTable
            CREATE TABLE IF NOT EXISTS "Session" (
                "id" TEXT NOT NULL,
                "sessionToken" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
            );

            -- CreateTable
            CREATE TABLE IF NOT EXISTS "VerificationToken" (
                "identifier" TEXT NOT NULL,
                "token" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL
            );

            -- Indexes and constraints setup (Ignored if they already exist)
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Account_provider_providerAccountId_key') THEN
                    CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Session_sessionToken_key') THEN
                    CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'VerificationToken_token_key') THEN
                    CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'VerificationToken_identifier_token_key') THEN
                    CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
                END IF;
            END
            $$;

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
        `;

        await client.query(sql);
        await client.end();

        return NextResponse.json({ success: true, message: "OAuth tables successfully created in the active Vercel database!" });
    } catch (e: any) {
        return NextResponse.json({
            success: false,
            error: "SQL Execution failed",
            details: e.message || String(e)
        }, { status: 500 });
    }
}
