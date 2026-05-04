'use client'

// PartnerAnalyticsCharts.tsx
// ZERO recharts imports here — chart is wired via next/dynamic to a leaf file.

import React from 'react'
import dynamic from 'next/dynamic'
import { CircularProgress } from '@mui/material'

const PartnerChart = dynamic(
    () => import('./RechartsPartnerChart'),
    {
        ssr: false,
        loading: () => (
            <div className="h-[300px] w-full flex items-center justify-center">
                <CircularProgress size={28} />
            </div>
        ),
    }
)

interface PartnerAnalyticsChartsProps {
    chartData: any[]
}

export default function PartnerAnalyticsCharts({ chartData }: PartnerAnalyticsChartsProps) {
    return (
        <div className="h-[300px] w-full">
            <PartnerChart data={chartData} />
        </div>
    )
}
