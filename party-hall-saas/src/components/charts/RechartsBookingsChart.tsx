'use client'

// RechartsBookingsChart.tsx — RECHARTS LEAF FILE
// Loaded ONLY via: dynamic(() => import('./RechartsBookingsChart'), { ssr: false })

import React from 'react'
import {
    ResponsiveContainer, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

interface Props {
    data: any[]
    secondaryColor: string
    paperBg: string
    borderColor: string
    gridColor: string
}

export default function RechartsBookingsChart({ data, secondaryColor, paperBg, borderColor, gridColor }: Props) {
    return (
        <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{ background: paperBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="bookings" stroke={secondaryColor} strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
        </ResponsiveContainer>
    )
}
