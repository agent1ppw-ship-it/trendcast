export const dynamic = 'force-dynamic';
import { AddLeadModal } from '@/components/AddLeadModal';
import { LeadCard } from '@/components/LeadCard';

import { ensureOrganization } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';

async function getLeads(orgId: string) {
    try {
        return await prisma.lead.findMany({
            where: { orgId },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error("Database connection failed. Serving mock leads instead.", error);
        return [];
    }
}

export default async function CrmDashboard() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    const leads = await getLeads(orgId);

    const columns = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'];

    const displayLeads = leads;

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Pipeline Management</h1>
                    <p className="text-gray-400 mt-2 font-light">Drag and drop leads to update their status or click to view details.</p>
                </div>
                <AddLeadModal />
            </div>

            <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
                {columns.map(status => (
                    <div key={status} className="w-80 flex-shrink-0 flex flex-col gap-4">
                        <div className="bg-[#1C1C1C] px-4 py-3 rounded-t-xl border-t border-x border-white/10 shadow-sm flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                            <h3 className="font-semibold text-gray-200">{status}</h3>
                            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full font-bold">
                                {displayLeads.filter(l => l.status === status).length}
                            </span>
                        </div>

                        <div className="flex flex-col gap-3 min-h-[500px] bg-[#111] p-2 rounded-b-xl border border-white/10 border-t-0 shadow-inner">
                            {displayLeads
                                .filter(lead => lead.status === status)
                                .map(lead => (
                                    <LeadCard key={lead.id} lead={{ ...lead, createdAt: lead.createdAt.toISOString() }} />
                                ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
