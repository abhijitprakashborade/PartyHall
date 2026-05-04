'use client'

// RechartsRevenueChart.tsx — RECHARTS LEAF FILE
// Loaded ONLY via: dynamic(() => import('./RechartsRevenueChart'), { ssr: false })
// This file is in its own async chunk — recharts here does NOT affect the HMR
// graph of admin/page.tsx or AdminDashboardStats.tsx

import React from 'react'
import {
    ResponsiveContainer, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

interface Props {
    data: any[]
    primaryColor: string
    paperBg: string
    borderColor: string
    gridColor: string
}

export default function RechartsRevenueChart({ data, primaryColor, paperBg, borderColor, gridColor }: Props) {
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                    contentStyle={{ background: paperBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                    formatter={(value: number | undefined) => [`₹${(value ?? 0).toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill={primaryColor} radius={[6, 6, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}
