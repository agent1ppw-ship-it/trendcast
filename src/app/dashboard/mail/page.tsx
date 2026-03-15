export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { ensureOrganization } from '@/app/actions/auth';
import { getDirectMailMode, getLobEnvironment } from '@/lib/directMail';
import { DirectMailDashboardClient } from '@/components/DirectMailDashboardClient';

export default async function DirectMailPage() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    return (
        <DirectMailDashboardClient
            mailMode={getDirectMailMode()}
            lobEnvironment={getLobEnvironment()}
            senderProfile={{
                mailFromName: '',
                mailFromCompany: '',
                mailAddressLine1: '',
                mailAddressLine2: '',
                mailCity: '',
                mailState: '',
                mailZip: '',
            }}
            leads={[]}
            templates={[]}
            campaigns={[]}
        />
    );
}
