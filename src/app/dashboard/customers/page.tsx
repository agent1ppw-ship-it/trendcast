import { redirect } from 'next/navigation';
import { ensureOrganization } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import { CustomersClient } from '@/components/CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    const customers = await prisma.lead.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
    });

    return (
        <CustomersClient
            initialCustomers={customers.map((customer) => ({
                ...customer,
                createdAt: customer.createdAt.toISOString(),
            }))}
        />
    );
}

