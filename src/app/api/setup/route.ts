import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        console.log("Starting forced Prisma schema push...");
        // Run Prisma push using the standard package binary
        const { stdout, stderr } = await execPromise('npx prisma db push --accept-data-loss');

        return NextResponse.json({
            success: true,
            message: "Database Setup Complete",
            stdout,
            stderr
        });
    } catch (error: any) {
        console.error("Setup Error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || String(error),
            stdout: error.stdout,
            stderr: error.stderr
        }, { status: 500 });
    }
}
