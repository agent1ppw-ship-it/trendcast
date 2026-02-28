import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const output = execSync('npx prisma db push --accept-data-loss', { encoding: 'utf-8' });
        return NextResponse.json({ success: true, message: "Prisma schema pushed successfully!", output });
    } catch (e: any) {
        return NextResponse.json({
            success: false,
            error: "Prisma CLI push failed",
            details: e.stderr || e.message || String(e)
        }, { status: 500 });
    }
}
