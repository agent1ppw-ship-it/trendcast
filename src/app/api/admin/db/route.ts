import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        success: true,
        postgresUrl: process.env.POSTGRES_URL ? `${process.env.POSTGRES_URL.substring(0, 45)}...` : 'undefined',
        databaseUrl: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 45)}...` : 'undefined',
    });
}
