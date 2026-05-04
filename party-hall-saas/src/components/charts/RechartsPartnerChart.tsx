'use client'

// RechartsPartnerChart.tsx
// This file is a next/dynamic LEAF — recharts lives here at the top level.
// It must ONLY be imported via: next/dynamic(() => import('./RechartsPartnerChart'), { ssr: false })
// Never import this file directly.

import React from 'react'
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts'

interface Props {
    data: any[]
}

export default function RechartsPartnerChart({ data }: Props) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip
                    contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
