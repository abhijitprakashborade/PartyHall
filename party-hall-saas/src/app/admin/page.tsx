'use client'

import React, { useEffect, useState } from 'react'
import {
    Box, Grid, Card, CardContent, Typography, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, alpha, useTheme, CircularProgress, Avatar,
    IconButton, Tooltip,
} from '@mui/material'
import {
    TrendingUp, BookOnline, People, Store,
    AttachMoney, Refresh,
} from '@mui/icons-material'
import dynamic from 'next/dynamic'

const AdminDashboardStats = dynamic(() => import('@/components/charts/AdminDashboardStats'), {
    ssr: false,
    loading: () => (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={32} />
        </Box>
    )
})
import api from '@/lib/api'

// ── Stat Card ─────────────────────────────────────────
function StatCard({
    title, value, subtitle, icon, color, trend,
}: {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ReactNode
    color: string
    trend?: number
}) {
    const theme = useTheme()
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                        {trend !== undefined && (
                            <Chip
                                label={`${trend > 0 ? '+' : ''}${trend}%`}
                                size="small"
                                color={trend >= 0 ? 'success' : 'error'}
                                sx={{ mt: 0.5, height: 20, fontSize: 11 }}
                            />
                        )}
                    </Box>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 2,
                            background: alpha(color, 0.12),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Box sx={{ color }}>{icon}</Box>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    )
}

// ── Real chart data derived from bookings ─────────────
function buildChartData(bookings: any[]) {
    const monthMap: Record<string, { revenue: number; bookings: number }> = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    bookings.forEach((b: any) => {
        const date = b.created_at || b.slot_date
        if (!date) return
        const d = new Date(date)
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
        if (!monthMap[key]) monthMap[key] = { revenue: 0, bookings: 0 }
        monthMap[key].bookings += 1
        if (['confirmed', 'completed'].includes(b.status)) {
            monthMap[key].revenue += parseFloat(b.total_amount || '0')
        }
    })

    // Last 6 months
    const result = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
        result.push({
            month: monthNames[d.getMonth()],
            revenue: monthMap[key]?.revenue || 0,
            bookings: monthMap[key]?.bookings || 0,
        })
    }
    return result
}

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
    confirmed: 'success',
    pending: 'warning',
    cancelled: 'error',
    completed: 'default',
}

export default function AdminDashboardPage() {
    const theme = useTheme()
    const [bookings, setBookings] = useState<any[]>([])
    const [stats, setStats] = useState({
        total_halls: 0,
        total_bookings: 0,
        total_users: 0,
        total_revenue: '₹0',
    })
    const [chartData, setChartData] = useState<{ month: string; revenue: number; bookings: number }[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [bookingsRes, usersRes, hallsRes] = await Promise.allSettled([
                api.get('/bookings/?page_size=1000'),
                api.get('/auth/users/'),
                api.get('/halls/'),
            ])

            let allBookings: any[] = []
            if (bookingsRes.status === 'fulfilled') {
                allBookings = bookingsRes.value.data?.results || bookingsRes.value.data?.users || bookingsRes.value.data || []
                setBookings(allBookings.slice(0, 8))
            }

            // Real revenue from confirmed/completed bookings
            const totalRevenue = allBookings
                .filter(b => ['confirmed', 'completed'].includes(b.status))
                .reduce((sum: number, b: any) => sum + parseFloat(b.total_amount || '0'), 0)

            const revenueStr = totalRevenue >= 100000
                ? `₹${(totalRevenue / 100000).toFixed(1)}L`
                : totalRevenue >= 1000
                    ? `₹${(totalRevenue / 1000).toFixed(0)}K`
                    : `₹${totalRevenue.toLocaleString('en-IN')}`

            // Halls: prefer count field, else use array length
            const hallsData = hallsRes.status === 'fulfilled' ? hallsRes.value.data : null
            const hallCount = hallsData?.count ?? (hallsData?.results || hallsData || []).length

            // Users: the API returns { stats: { total, ... }, users: [...] }
            const usersData = usersRes.status === 'fulfilled' ? usersRes.value.data : null
            const userCount = usersData?.stats?.total ?? usersData?.count ?? (usersData?.users || usersData || []).length

            setStats({
                total_halls: hallCount,
                total_bookings: bookingsRes.status === 'fulfilled'
                    ? (bookingsRes.value.data?.count || allBookings.length)
                    : 0,
                total_users: userCount,
                total_revenue: revenueStr || '₹0',
            })

            // Build real chart from booking history
            setChartData(buildChartData(allBookings))
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])


    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800}>
                        Admin Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Welcome back! Here&apos;s what&apos;s happening today.
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchData} disabled={loading}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {/* Stat Cards */}
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <StatCard
                            title="Party Halls" value={stats.total_halls}
                            subtitle="Active venues" trend={12}
                            icon={<Store />} color={theme.palette.primary.main}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <StatCard
                            title="Total Bookings" value={stats.total_bookings}
                            subtitle="All time" trend={8}
                            icon={<BookOnline />} color={theme.palette.secondary.main}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <StatCard
                            title="Total Users" value={stats.total_users}
                            subtitle="Registered accounts" trend={5}
                            icon={<People />} color={theme.palette.success.main}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <StatCard
                            title="Revenue" value={stats.total_revenue}
                            subtitle="Confirmed bookings" trend={18}
                            icon={<AttachMoney />} color={theme.palette.warning.main}
                        />
                    </Grid>

                    {/* Charts Row */}
                    <AdminDashboardStats revenueData={chartData} />

                    {/* Recent Bookings Table */}
                    <Grid size={{ xs: 12 }}>
                        <Card>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                                    Recent Bookings
                                </Typography>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ '& th': { fontWeight: 700, background: alpha(theme.palette.primary.main, 0.05) } }}>
                                                <TableCell>Booking Ref</TableCell>
                                                <TableCell>Hall</TableCell>
                                                <TableCell>Customer</TableCell>
                                                <TableCell>Date</TableCell>
                                                <TableCell>Amount</TableCell>
                                                <TableCell>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {bookings.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                        No bookings yet
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                bookings.slice(0, 8).map((b: any) => (
                                                    <TableRow key={b.id} hover>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight={600} sx={{ color: 'primary.main' }}>
                                                                {b.booking_ref}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>{b.hall_name || '—'}</TableCell>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                                                                    {(b.customer_name || 'U').charAt(0)}
                                                                </Avatar>
                                                                {b.customer_name || '—'}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>{b.slot_date || '—'}</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>₹{Number(b.total_amount || 0).toLocaleString()}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={b.status}
                                                                size="small"
                                                                color={STATUS_COLOR[b.status] || 'default'}
                                                                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    )
}
