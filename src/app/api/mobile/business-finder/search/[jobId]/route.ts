import { NextResponse } from 'next/server';
import { getMobileAuthFromRequest } from '@/lib/mobileAuth';
import { getBusinessSearchStatusForOrg } from '@/lib/businessFinderQueue';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await getMobileAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;

  try {
    const result = await getBusinessSearchStatusForOrg(auth.orgId, jobId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Mobile business finder status failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch business search status.' }, { status: 500 });
  }
}
