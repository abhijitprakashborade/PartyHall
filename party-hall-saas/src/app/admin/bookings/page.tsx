'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Box, Card, Typography, Chip, TextField, Select, MenuItem,
    FormControl, InputLabel, IconButton, Tooltip, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TablePagination,
    CircularProgress, Button, Dialog, DialogTitle, DialogContent,
    DialogActions,
} from '@mui/material'
import { Search, Cancel, CheckCircle, Refresh, Visibility, CurrencyRupee } from '@mui/icons-material'
import api from '@/lib/api'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
    pending: 'warning', confirmed: 'success', cancelled: 'error',
    refunded: 'info', completed: 'success',
}

interface Booking {
    id: string
    booking_ref: string
    hall_name: string
    customer_name: string
    customer_phone: string
    slot_date: string
    slot_start_time: string
    total_amount: string
    status: string
    created_at: string
}

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(0)
    const [rowsPerPage] = useState(15)
    const [total, setTotal] = useState(0)
    const [cancelDialog, setCancelDialog] = useState<Booking | null>(null)
    const [cancelReason, setCancelReason] = useState('')

    const fetchBookings = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = { page: String(page + 1) }
            if (statusFilter) params.status = statusFilter
            const res = await api.get('/bookings/', { params })
            setBookings(res.data.results || res.data)
            setTotal(res.data.count || (res.data.results || res.data).length)
        } catch { toast.error('Failed to load bookings') }
        finally { setLoading(false) }
    }, [page, statusFilter])

    useEffect(() => { fetchBookings() }, [fetchBookings])

    const confirmBooking = async (id: string) => {
        try {
            await api.patch(`/bookings/${id}/`, { status: 'confirmed' })
            toast.success('Booking confirmed')
            fetchBookings()
        } catch { toast.error('Failed') }
    }

    const cancelBooking = async () => {
        if (!cancelDialog) return
        try {
            await api.post(`/bookings/${cancelDialog.id}/cancel/`, { reason: cancelReason })
            toast.success('Booking cancelled')
            setCancelDialog(null)
            fetchBookings()
        } catch { toast.error('Cancel failed') }
    }

    const filtered = bookings.filter(b =>
        !search || b.booking_ref?.includes(search) ||
        b.hall_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.customer_name?.toLowerCase().includes(search.toLowerCase())
    )


    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Bookings</Typography>
                    <Typography variant="body2" color="text.secondary">{total} total bookings</Typography>
                </Box>
                <Button startIcon={<Refresh />} size="small" onClick={fetchBookings} variant="outlined">Refresh</Button>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                    size="small" placeholder="Search booking ref, hall, customer…"
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <Search sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
                    sx={{ flexGrow: 1, maxWidth: 380 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="confirmed">Confirmed</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="refunded">Refunded</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase' } }}>
                                <TableCell>Ref</TableCell>
                                <TableCell>Hall</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Date & Time</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.disabled' }}>No bookings found</TableCell></TableRow>
                            ) : filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((b) => (
                                <TableRow key={b.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600} color="primary.main">{b.booking_ref}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{b.hall_name || '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{b.customer_name || '—'}</Typography>
                                        <Typography variant="caption" color="text.secondary">{b.customer_phone}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {b.slot_date ? new Date(b.slot_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">{b.slot_start_time?.slice(0, 5)}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                            <CurrencyRupee sx={{ fontSize: 13, color: 'text.secondary' }} />
                                            <Typography variant="body2" fontWeight={600}>{parseFloat(b.total_amount || '0').toLocaleString('en-IN')}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={b.status} color={STATUS_COLORS[b.status] || 'default'} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                            {b.status === 'pending' && (
                                                <Tooltip title="Confirm">
                                                    <IconButton size="small" color="success" onClick={() => confirmBooking(b.id)}>
                                                        <CheckCircle fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {['pending', 'confirmed'].includes(b.status) && (
                                                <Tooltip title="Cancel">
                                                    <IconButton size="small" color="error" onClick={() => setCancelDialog(b)}>
                                                        <Cancel fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div" count={filtered.length} page={page}
                    rowsPerPage={rowsPerPage} rowsPerPageOptions={[15]}
                    onPageChange={(_, p) => setPage(p)}
                />
            </Card>

            {/* Cancel Dialog */}
            <Dialog open={!!cancelDialog} onClose={() => setCancelDialog(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Cancel Booking</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Cancelling booking <strong>{cancelDialog?.booking_ref}</strong> for {cancelDialog?.customer_name}. A refund will be calculated based on the hall's policy.
                    </Typography>
                    <TextField
                        fullWidth size="small" label="Cancellation Reason (optional)"
                        multiline rows={3} value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelDialog(null)}>Back</Button>
                    <Button color="error" variant="contained" onClick={cancelBooking}>Confirm Cancel</Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
