import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        DATABASE_URL: process.env.DATABASE_URL ? "SET (Hidden for security)" : "NOT SET",
        DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length,
        POSTGRES_URL: process.env.POSTGRES_URL ? "SET (Hidden for security)" : "NOT SET",
        POSTGRES_URL_LENGTH: process.env.POSTGRES_URL?.length,
        POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? "SET" : "NOT SET",
        NODE_ENV: process.env.NODE_ENV,
        // Print the first 15 characters of the mapped URL to see WHICH database/host Vercel is actually using
        MAPPED_POSTGRES_URL_START: process.env.POSTGRES_URL?.substring(0, 45) || 'none',
        MAPPED_DATABASE_URL_START: process.env.DATABASE_URL?.substring(0, 45) || 'none',
    });
}
