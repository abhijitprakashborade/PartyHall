'use client'

// DashboardStats.tsx — ZERO recharts imports here.
// Uses next/dynamic to load the recharts leaf file.

import React from 'react'
import dynamic from 'next/dynamic'
import { Box, Card, CardContent, Typography, alpha, useTheme, CircularProgress } from '@mui/material'

const Spinner = () => (
    <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
    </Box>
)

const DashboardChart = dynamic(
    () => import('./RechartsDashboardChart'),
    { ssr: false, loading: Spinner }
)

interface DashboardStatsProps {
    earningsData: any[]
}

export default function DashboardStats({ earningsData }: DashboardStatsProps) {
    const theme = useTheme()

    // Extract all theme colors here so the leaf file has NO @mui dependency
    const primaryColor = theme.palette.primary.main
    const secondaryColor = theme.palette.secondary.main
    const paperBg = theme.palette.background.paper
    const borderColor = alpha(primaryColor, 0.2)
    const gridColor = alpha(primaryColor, 0.1)

    return (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', width: '100%' }}>
            <Card sx={{ flex: '1 1 100%', p: 0 }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                        Weekly Earnings &amp; Bookings
                    </Typography>
                    <DashboardChart
                        data={earningsData}
                        primaryColor={primaryColor}
                        secondaryColor={secondaryColor}
                        paperBg={paperBg}
                        borderColor={borderColor}
                        gridColor={gridColor}
                    />
                </CardContent>
            </Card>
        </Box>
    )
}
