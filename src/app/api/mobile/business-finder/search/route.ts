import { NextResponse } from 'next/server';
import { getMobileAuthFromRequest } from '@/lib/mobileAuth';
import { startBusinessSearchJobForOrg } from '@/lib/businessFinderQueue';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await getMobileAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      zipCode?: string;
      industry?: string;
      batchSize?: number;
      radiusMiles?: number;
    };

    const result = await startBusinessSearchJobForOrg(auth.orgId, {
      zipCode: body.zipCode || '',
      industry: body.industry || '',
      batchSize: Number(body.batchSize || 25),
      radiusMiles: Number(body.radiusMiles || 50),
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, jobId: result.jobId });
  } catch (error) {
    console.error('Mobile business finder start failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to start business search.' }, { status: 500 });
  }
}
