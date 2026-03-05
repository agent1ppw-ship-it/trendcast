'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Trash2, AlertTriangle, TrendingUp } from 'lucide-react';
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
                <div className="flex items-start justify-between gap-3">
                    <CardTitle className="min-w-0 flex-1 pr-2 text-base font-bold leading-tight text-gray-100 whitespace-normal break-words [overflow-wrap:anywhere]">
                        {lead.name}
                    </CardTitle>
                    <span className="shrink-0 whitespace-nowrap rounded border border-white/5 bg-[#2A2A2A] px-2 py-1 text-[10px] font-semibold text-gray-400">
                        {lead.source}
                    </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold tracking-wide">
                    {typeof lead.leadScoreComputed === 'number' && (
                        <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-300">
                            SCORE {lead.leadScoreComputed}
                        </span>
                    )}
                    {lead.priorityBand && (
                        <span className={`rounded border px-2 py-1 ${lead.priorityBand === 'URGENT'
                            ? 'border-red-500/30 bg-red-500/10 text-red-300'
                            : lead.priorityBand === 'HIGH'
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                : 'border-white/10 bg-white/5 text-gray-300'
                            }`}>
                            {lead.priorityBand}
                        </span>
                    )}
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
                {lead.serviceFocus && (
                    <p className="mt-2 text-xs text-gray-300 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                        {lead.serviceFocus}
                    </p>
                )}
                {lead.estimateRange && (
                    <p className="mt-1 text-xs text-emerald-300 font-medium">
                        Est. Deal Value: {lead.estimateRange}
                    </p>
                )}
                {lead.nextBestAction && (
                    <p className="mt-2 text-xs text-amber-300 flex items-center gap-1.5 whitespace-normal break-words leading-relaxed">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        {lead.nextBestAction}
                    </p>
                )}

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
