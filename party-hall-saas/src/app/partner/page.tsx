'use client'

import React, { useEffect, useState } from 'react'
import {
    Box, Card, CardContent, Typography, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    alpha, useTheme, CircularProgress, Button, Avatar,
} from '@mui/material'
import { AttachMoney, BookOnline, Star, TrendingUp, Add, Store, FlashOn } from '@mui/icons-material'

import dynamic from 'next/dynamic'

const DashboardStats = dynamic(() => import('@/components/charts/DashboardStats'), {
    ssr: false,
    loading: () => <CircularProgress />
})
import api from '@/lib/api'
import { useRouter } from 'next/navigation'

const earningsData = [
    { week: 'W1', earnings: 8500, bookings: 6 },
    { week: 'W2', earnings: 12400, bookings: 9 },
    { week: 'W3', earnings: 9800, bookings: 7 },
    { week: 'W4', earnings: 16200, bookings: 12 },
]

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
    confirmed: 'success',
    pending: 'warning',
    cancelled: 'error',
    completed: 'default',
}

function MiniCard({ label, value, icon, color }: {
    label: string; value: string | number; icon: React.ReactNode; color: string
}) {
    return (
        <Card sx={{ flex: '1 1 0', minWidth: 0 }}>
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(color, 0.12), color }}>
                        {icon}
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="h5" fontWeight={800}>{value}</Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    )
}

export default function PartnerDashboardPage() {
    const theme = useTheme()
    const router = useRouter()
    const [bookings, setBookings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [totalEarnings, setTotalEarnings] = useState(0)
    const [hallUsage, setHallUsage] = useState<any>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [bkRes, usageRes] = await Promise.all([
                    api.get('/bookings/'),
                    api.get('/subscriptions/hall-status/').catch(() => ({ data: null })),
                ])
                const list: any[] = bkRes.data?.results || bkRes.data || []
                setBookings(list)
                const earned = list
                    .filter((b: any) => b.status === 'confirmed' || b.status === 'completed')
                    .reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0)
                setTotalEarnings(earned)
                if (usageRes.data) setHallUsage(usageRes.data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800}>Partner Dashboard</Typography>
                    <Typography variant="body2" color="text.secondary">Manage your hall and track performance</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button variant="outlined" startIcon={<FlashOn />} href="/partner/bookings/create" size="small"
                        sx={{ fontWeight: 700 }}>
                        Create Booking
                    </Button>
                    <Button variant="contained" startIcon={<Add />} href="/partner/hall" size="small">
                        Manage Hall
                    </Button>
                </Box>

            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* Stat Cards — CSS grid auto-fill: 2 cols on mobile, 4 on desktop (ISSUE #21 fix) */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2 }}>
                        <MiniCard label="Total Earnings" value={`₹${totalEarnings.toLocaleString()}`} icon={<AttachMoney />} color={theme.palette.success.main} />
                        <MiniCard label="Total Bookings" value={bookings.length} icon={<BookOnline />} color={theme.palette.primary.main} />
                        <MiniCard label="Confirmed" value={bookings.filter((b: any) => b.status === 'confirmed').length} icon={<TrendingUp />} color={theme.palette.secondary.main} />
                        <MiniCard label="Avg Rating" value="4.8 ★" icon={<Star />} color={theme.palette.warning.main} />
                        {/* Hall Quota Card */}
                        {hallUsage && (
                            <Card
                                sx={{ flex: '1 1 160px', minWidth: 140, cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}
                                onClick={() => router.push('/partner/hall')}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                                        <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(
                                            hallUsage.halls_remaining === 0 ? theme.palette.error.main :
                                            hallUsage.halls_remaining === 1 ? theme.palette.warning.main : theme.palette.info.main, 0.12),
                                            color: hallUsage.halls_remaining === 0 ? theme.palette.error.main :
                                                   hallUsage.halls_remaining === 1 ? theme.palette.warning.main : theme.palette.info.main,
                                        }}>
                                            <Store />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Hall Slots</Typography>
                                            <Typography variant="h5" fontWeight={800}>
                                                {hallUsage.hall_count}<Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>/{hallUsage.hall_limit}</Typography>
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: alpha(theme.palette.divider, 0.5), overflow: 'hidden' }}>
                                        <Box sx={{
                                            height: '100%', borderRadius: 3,
                                            width: `${Math.min(100, (hallUsage.hall_count / (hallUsage.hall_limit || 1)) * 100)}%`,
                                            bgcolor: hallUsage.halls_remaining === 0 ? 'error.main' : hallUsage.halls_remaining === 1 ? 'warning.main' : 'success.main',
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                        {hallUsage.halls_remaining === 0 ? '⚠ Limit reached' : `${hallUsage.halls_remaining} slot${hallUsage.halls_remaining > 1 ? 's' : ''} left`}
                                        {hallUsage.plan_name ? ` · ${hallUsage.plan_name}` : ''}
                                    </Typography>
                                </CardContent>
                            </Card>
                        )}
                    </Box>

                    {/* Charts Row */}
                    <DashboardStats earningsData={earningsData} />

                    {/* Recent Bookings Table */}
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recent Bookings</Typography>

                            {/* ── Mobile card list (xs / sm) ── */}
                            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                                {bookings.length === 0 ? (
                                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No bookings yet</Typography>
                                ) : bookings.slice(0, 6).map((b: any) => (
                                    <Box key={b.id} sx={{
                                        p: 2, borderRadius: 2, border: '1px solid',
                                        borderColor: 'divider', bgcolor: 'background.paper',
                                        display: 'flex', flexDirection: 'column', gap: 1,
                                    }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2" fontWeight={700} color="primary">{b.booking_ref}</Typography>
                                            <Chip label={b.status} size="small" color={STATUS_COLOR[b.status] || 'default'}
                                                sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 11 }} />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: 'primary.main' }}>
                                                {(b.customer_name || 'U').charAt(0)}
                                            </Avatar>
                                            <Typography variant="body2" noWrap sx={{ flex: 1 }}>{b.customer_name || '—'}</Typography>
                                            <Typography variant="body2" fontWeight={700}>₹{Number(b.total_amount || 0).toLocaleString()}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary"><Store sx={{ fontSize: 12, mr: 0.25, verticalAlign: 'middle' }} />{b.hall?.name || '—'}</Typography>
                                            <Typography variant="caption" color="text.secondary">{b.slot_date || '—'}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>

                            {/* ── Desktop table (md+) ── */}
                            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ '& th': { fontWeight: 700, background: alpha(theme.palette.primary.main, 0.05) } }}>
                                            <TableCell>Ref</TableCell>
                                            <TableCell>Venue</TableCell>
                                            <TableCell>Customer</TableCell>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Package</TableCell>
                                            <TableCell>Amount</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {bookings.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No bookings yet</TableCell>
                                            </TableRow>
                                        ) : bookings.slice(0, 6).map((b: any) => (
                                            <TableRow key={b.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600} color="primary">{b.booking_ref}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Store sx={{ fontSize: 14 }} />
                                                        {b.hall?.name || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: 'primary.main' }}>
                                                            {(b.customer_name || 'U').charAt(0)}
                                                        </Avatar>
                                                        {b.customer_name || '—'}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{b.slot_date || '—'}</TableCell>
                                                <TableCell>{b.package_name || '—'}</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>₹{Number(b.total_amount || 0).toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Chip label={b.status} size="small" color={STATUS_COLOR[b.status] || 'default'}
                                                        sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 11 }} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Box>
            )}
        </Box>
    )
}
