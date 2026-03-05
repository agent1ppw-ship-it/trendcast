'use client';

import { useMemo, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Users, UserCheck, Target, Building2, X, Save } from 'lucide-react';
import { updateLeadDetails } from '@/app/actions/crm';

interface CustomerRecord {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    source: string;
    status: string;
    leadScore: number;
    createdAt: string;
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function CustomersClient({ initialCustomers }: { initialCustomers: CustomerRecord[] }) {
    const [customers, setCustomers] = useState(initialCustomers);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
    const [editError, setEditError] = useState('');
    const [isSaving, startSaving] = useTransition();

    const sourceOptions = useMemo(() => {
        return ['ALL', ...Array.from(new Set(customers.map((customer) => customer.source))).sort((a, b) => a.localeCompare(b))];
    }, [customers]);

    const filteredCustomers = useMemo(() => {
        const search = query.trim().toLowerCase();
        return customers.filter((customer) => {
            if (statusFilter !== 'ALL' && customer.status !== statusFilter) return false;
            if (sourceFilter !== 'ALL' && customer.source !== sourceFilter) return false;

            if (!search) return true;
            const haystack = `${customer.name} ${customer.phone || ''} ${customer.address || ''} ${customer.source} ${customer.status}`.toLowerCase();
            return haystack.includes(search);
        });
    }, [customers, query, sourceFilter, statusFilter]);

    const stats = useMemo(() => {
        const total = customers.length;
        const won = customers.filter((customer) => customer.status === 'WON').length;
        const active = customers.filter((customer) => customer.status !== 'LOST').length;
        const averageScore = total
            ? Math.round(customers.reduce((sum, customer) => sum + (customer.leadScore || 0), 0) / total)
            : 0;

        return { total, won, active, averageScore };
    }, [customers]);

    const handleRowClick = (customer: CustomerRecord) => {
        setEditError('');
        setEditingCustomer(customer);
    };

    const handleSave = () => {
        if (!editingCustomer) return;
        setEditError('');

        startSaving(async () => {
            const result = await updateLeadDetails(editingCustomer.id, {
                name: editingCustomer.name,
                phone: editingCustomer.phone,
                address: editingCustomer.address,
                source: editingCustomer.source,
                status: editingCustomer.status,
                leadScore: editingCustomer.leadScore,
            });

            if (!result.success) {
                setEditError(result.error || 'Failed to update customer.');
                return;
            }

            setCustomers((current) =>
                current.map((entry) => (entry.id === editingCustomer.id ? { ...editingCustomer } : entry))
            );
            setEditingCustomer(null);
        });
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-4 text-gray-100 md:p-8">
            <div className="mb-8">
                <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Customers</h1>
                <p className="text-sm font-light text-gray-400">
                    Complete list of all customer and lead records in your organization.
                </p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-400">
                            Total Records
                            <Users className="h-4 w-4 text-blue-400" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-400">
                            Closed Customers
                            <UserCheck className="h-4 w-4 text-emerald-400" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{stats.won}</div>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-400">
                            Active Pipeline
                            <Building2 className="h-4 w-4 text-amber-400" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{stats.active}</div>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-400">
                            Avg Lead Score
                            <Target className="h-4 w-4 text-indigo-400" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{stats.averageScore}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="mb-6 border-white/5 bg-[#111]">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="relative md:col-span-2">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search by name, phone, address..."
                                className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] py-2.5 pl-10 pr-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2.5 text-sm text-gray-200 focus:border-blue-500/50 focus:outline-none"
                            >
                                <option value="ALL">All Status</option>
                                <option value="NEW">NEW</option>
                                <option value="CONTACTED">CONTACTED</option>
                                <option value="QUOTED">QUOTED</option>
                                <option value="WON">WON</option>
                                <option value="LOST">LOST</option>
                                <option value="EXTRACTED">EXTRACTED</option>
                            </select>
                            <select
                                value={sourceFilter}
                                onChange={(event) => setSourceFilter(event.target.value)}
                                className="rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2.5 text-sm text-gray-200 focus:border-blue-500/50 focus:outline-none"
                            >
                                {sourceOptions.map((source) => (
                                    <option key={source} value={source}>
                                        {source === 'ALL' ? 'All Source' : source}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                        Showing {filteredCustomers.length} of {customers.length} records
                    </p>
                </CardContent>
            </Card>

            <Card className="border-white/5 bg-[#111] shadow-md">
                <div className="border-b border-white/5 px-5 py-3 text-xs text-gray-400">
                    Click any customer row to edit details.
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-[#161616] text-xs uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-5 py-4">Name</th>
                                <th className="px-5 py-4">Phone</th>
                                <th className="px-5 py-4">Address</th>
                                <th className="px-5 py-4">Source</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4">Score</th>
                                <th className="px-5 py-4">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-14 text-center text-gray-500">
                                        No customer records match your current filters.
                                    </td>
                                </tr>
                            )}

                            {filteredCustomers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    onClick={() => handleRowClick(customer)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleRowClick(customer);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    className="cursor-pointer transition-colors hover:bg-[#161616]"
                                >
                                    <td className="px-5 py-4 font-medium text-gray-100">{customer.name}</td>
                                    <td className="px-5 py-4 text-gray-300">{customer.phone || 'N/A'}</td>
                                    <td className="px-5 py-4 text-gray-300">{customer.address || 'N/A'}</td>
                                    <td className="px-5 py-4 text-gray-400">{customer.source}</td>
                                    <td className="px-5 py-4">
                                        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${customer.status === 'WON'
                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                            : customer.status === 'LOST'
                                                ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                                : 'border-white/10 bg-[#1A1A1A] text-gray-300'
                                            }`}>
                                            {customer.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 font-mono text-gray-300">{customer.leadScore || 0}</td>
                                    <td className="px-5 py-4 text-gray-400">{formatDate(customer.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {editingCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingCustomer(null)} />

                    <div className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-[#111] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                            <h2 className="text-lg font-semibold text-white">Edit Customer</h2>
                            <button
                                type="button"
                                onClick={() => setEditingCustomer(null)}
                                className="rounded-md p-1 text-gray-400 hover:bg-white/5 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4 px-5 py-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Name</label>
                                    <input
                                        type="text"
                                        value={editingCustomer.name}
                                        onChange={(event) => setEditingCustomer({ ...editingCustomer, name: event.target.value })}
                                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2.5 text-white focus:border-blue-500/50 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Phone</label>
                                    <input
                                        type="text"
                                        value={editingCustomer.phone || ''}
                                        onChange={(event) => setEditingCustomer({ ...editingCustomer, phone: event.target.value || null })}
                                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2.5 text-white focus:border-blue-500/50 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Address</label>
                                <input
                                    type="text"
                                    value={editingCustomer.address || ''}
                                    onChange={(event) => setEditingCustomer({ ...editingCustomer, address: event.target.value || null })}
                                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2.5 text-white focus:border-blue-500/50 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Source</label>
                                    <input
                                        type="text"
                                        value={editingCustomer.source}
                                        onChange={(event) => setEditingCustomer({ ...editingCustomer, source: event.target.value })}
                                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2.5 text-white focus:border-blue-500/50 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Status</label>
                                    <select
                                        value={editingCustomer.status}
                                        onChange={(event) => setEditingCustomer({ ...editingCustomer, status: event.target.value })}
                                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2.5 text-white focus:border-blue-500/50 focus:outline-none"
                                    >
                                        <option value="NEW">NEW</option>
                                        <option value="CONTACTED">CONTACTED</option>
                                        <option value="QUOTED">QUOTED</option>
                                        <option value="WON">WON</option>
                                        <option value="LOST">LOST</option>
                                        <option value="EXTRACTED">EXTRACTED</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Lead Score</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={editingCustomer.leadScore}
                                        onChange={(event) => setEditingCustomer({ ...editingCustomer, leadScore: Number(event.target.value) || 0 })}
                                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2.5 text-white focus:border-blue-500/50 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {editError && (
                                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                    {editError}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4">
                            <button
                                type="button"
                                onClick={() => setEditingCustomer(null)}
                                className="rounded-lg border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm text-gray-300 hover:bg-[#202020]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_12px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-500 disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
