'use client';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface AnalyticsClientProps {
    initialChartData: { month: string; leads: number }[];
    initialStatusData: { name: string; value: number }[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsClient({ initialChartData, initialStatusData }: AnalyticsClientProps) {
    // Provide visually appealing placeholder mock data if the user's DB is completely empty.
    const chartData = initialChartData.length > 0 ? initialChartData : [
        { month: 'Jan', leads: 40 },
        { month: 'Feb', leads: 65 },
        { month: 'Mar', leads: 85 },
        { month: 'Apr', leads: 120 },
        { month: 'May', leads: 90 },
        { month: 'Jun', leads: 155 }
    ];

    const statusData = initialStatusData.length > 0 ? initialStatusData : [
        { name: 'NEW', value: 40 },
        { name: 'CONTACTED', value: 30 },
        { name: 'QUOTED', value: 20 },
        { name: 'WON', value: 10 },
        { name: 'LOST', value: 5 },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Lead Volume Area Chart */}
            <div className="lg:col-span-2">
                <Card className="bg-[#111] border-white/5 shadow-md h-full">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-lg font-semibold text-white">Lead Volume Over Time</CardTitle>
                        <p className="text-xs text-gray-500 mt-1">Total scraped and aggregated contacts</p>
                    </CardHeader>
                    <CardContent className="pt-6 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#60A5FA' }}
                                />
                                <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Status Distribution Pie Chart */}
            <div className="lg:col-span-1">
                <Card className="bg-[#111] border-white/5 shadow-md h-full flex flex-col">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-lg font-semibold text-white">Pipeline Distribution</CardTitle>
                        <p className="text-xs text-gray-500 mt-1">Breakdown of leads by current status</p>
                    </CardHeader>
                    <CardContent className="pt-6 flex-1 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
