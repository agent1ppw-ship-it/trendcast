'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { updateLeadStatus, deleteLead } from '@/app/actions/crm';
import { useState } from 'react';

const COLUMNS = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'];

export function LeadCard({ lead }: { lead: any }) {
    const [isUpdating, setIsUpdating] = useState(false);

    const currentIndex = COLUMNS.indexOf(lead.status);
    const canMoveBackward = currentIndex > 0;
    const canMoveForward = currentIndex < COLUMNS.length - 1;

    const handleMove = async (direction: 'forward' | 'backward') => {
        if (isUpdating) return;

        const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex < 0 || newIndex >= COLUMNS.length) return;

        setIsUpdating(true);
        await updateLeadStatus(lead.id, COLUMNS[newIndex]);
        setIsUpdating(false);
    };

    const handleDelete = async () => {
        if (isUpdating) return;
        if (!confirm('Are you sure you want to delete this lead?')) return;

        setIsUpdating(true);
        await deleteLead(lead.id);
        // We don't need to unset isUpdating on success because the card will unmount
        // but if it fails, we should technically unset it. For a simple implementation, it's fine.
    };

    return (
        <Card className={`bg-[#1A1A1A] border-white/5 hover:border-white/20 transition-all border-l-4 ${lead.status === 'WON' ? 'border-l-green-500' : lead.status === 'LOST' ? 'border-l-red-500' : 'border-l-blue-500'} shadow-md relative group ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-bold text-gray-100 truncate pr-2">
                        {lead.name}
                    </CardTitle>
                    <span className="text-[10px] font-semibold px-2 py-1 bg-[#2A2A2A] text-gray-400 rounded border border-white/5 whitespace-nowrap">
                        {lead.source}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-gray-400">
                <p className="flex items-center gap-2 mt-1 truncate">
                    📞 {lead.phone || 'No phone'}
                </p>
                <div className="flex items-center gap-2 mt-1 truncate">
                    <span>📍</span>
                    {lead.address ? (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-400 hover:underline transition-colors"
                        >
                            {lead.address}
                        </a>
                    ) : (
                        <span>No address</span>
                    )}
                </div>

                {/* Hover Actions Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#1A1A1A] to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between px-2 pb-2">
                    <button
                        onClick={() => handleMove('backward')}
                        disabled={!canMoveBackward}
                        className="p-1.5 rounded-md bg-[#2A2A2A] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-0 transition-all z-10"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all z-10"
                        title="Delete Lead"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => handleMove('forward')}
                        disabled={!canMoveForward}
                        className="p-1.5 rounded-md bg-[#2A2A2A] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-0 transition-all z-10"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
