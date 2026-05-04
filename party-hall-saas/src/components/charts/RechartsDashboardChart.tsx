'use client'

// RechartsDashboardChart.tsx — RECHARTS LEAF FILE for partner dashboard
// Dependencies: recharts + react ONLY. No @mui, no other project files.
// Loaded ONLY via: dynamic(() => import('./RechartsDashboardChart'), { ssr: false })

import React from 'react'
import {
    ResponsiveContainer, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar,
} from 'recharts'

interface Props {
    data: any[]
    // All theme colors passed as props — no @mui dependency
    primaryColor: string
    secondaryColor: string
    paperBg: string
    borderColor: string
    gridColor: string
}

export default function RechartsDashboardChart({
    data, primaryColor, secondaryColor, paperBg, borderColor, gridColor,
}: Props) {
    return (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', width: '100%' }}>
            {/* Weekly Earnings Area Chart */}
            <div style={{ flex: '2 1 340px' }}>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={primaryColor} stopOpacity={0.01} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis
                            tick={{ fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{ background: paperBg, borderRadius: 8, border: `1px solid ${borderColor}` }}
                        />
                        <Area type="monotone" dataKey="earnings" stroke={primaryColor} strokeWidth={2.5} fill="url(#earnGrad)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Bookings / Week Bar Chart */}
            <div style={{ flex: '1 1 220px' }}>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={{ background: paperBg, borderRadius: 8, border: `1px solid ${borderColor}` }}
                        />
                        <Bar dataKey="bookings" fill={secondaryColor} radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
