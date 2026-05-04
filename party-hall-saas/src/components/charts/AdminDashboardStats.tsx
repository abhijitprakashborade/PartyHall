'use client'

// AdminDashboardStats.tsx
// Only MUI + react here — ZERO recharts. Theme colors are extracted here and
// passed as plain string props to the recharts leaf files below.
// This breaks the HMR chain: MUI changes never trigger recharts re-instantiation.

import React from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { Grid, Card, CardContent, Typography, Box, CircularProgress, alpha, useTheme } from '@mui/material'

const Spinner = () => (
    <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
    </Box>
)

// next/dynamic creates a TRUE async chunk boundary.
// Leaf files only depend on recharts + react — no MUI, no project deps.
interface RevenueChartProps { data: any[]; primaryColor: string; paperBg: string; borderColor: string }
interface BookingsChartProps { data: any[]; secondaryColor: string; paperBg: string; borderColor: string; gridColor: string }

const RevenueChart = dynamic(
    () => import('./RechartsRevenueChart'),
    { ssr: false, loading: Spinner }
) as ComponentType<RevenueChartProps>

const BookingsChart = dynamic(
    () => import('./RechartsBookingsChart'),
    { ssr: false, loading: Spinner }
) as ComponentType<BookingsChartProps>

interface AdminDashboardStatsProps {
    revenueData: any[]
}

export default function AdminDashboardStats({ revenueData }: AdminDashboardStatsProps) {
    const theme = useTheme()

    // Extract all theme colors here so the leaf files don't need @mui at all
    const primaryColor = theme.palette.primary.main
    const secondaryColor = theme.palette.secondary.main
    const paperBg = theme.palette.background.paper
    const borderColor = alpha(primaryColor, 0.2)
    const gridColor = alpha(primaryColor, 0.1)

    return (
        <Grid container spacing={3} sx={{ width: '100%', mb: 3 }}>
            {/* Revenue Bar Chart */}
            <Grid size={{ xs: 12, md: 8 }}>
                <Card>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                            Revenue Overview
                        </Typography>
                        <RevenueChart
                            data={revenueData}
                            primaryColor={primaryColor}
                            paperBg={paperBg}
                            borderColor={borderColor}
                        />
                    </CardContent>
                </Card>
            </Grid>

            {/* Bookings Trend */}
            <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                            Bookings Trend
                        </Typography>
                        <BookingsChart
                            data={revenueData}
                            secondaryColor={secondaryColor}
                            paperBg={paperBg}
                            borderColor={borderColor}
                            gridColor={gridColor}
                        />
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    )
}
