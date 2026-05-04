'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Box, Card, Typography, Chip, Avatar, TextField, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TablePagination, CircularProgress, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Tab, Tabs,
} from '@mui/material'
import { Search, Cancel, Refresh, Store } from '@mui/icons-material'
import api from '@/lib/api'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    suspended: 'default',
    subscription_expired: 'default',
}

interface Hall {
    id: string
    slug: string
    name: string
    city: string
    pincode: string
    status: string
    is_active: boolean
    price_per_slot: string
    capacity_min: number
    capacity_max: number
    partner_name: string
    partner_email: string
    created_at: string
}

export default function AdminPartnersPage() {
    const [halls, setHalls] = useState<Hall[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState('all')
    const [page, setPage] = useState(0)
    const rowsPerPage = 12
    const [rejectDialog, setRejectDialog] = useState<Hall | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [rejecting, setRejecting] = useState(false)

    const fetchHalls = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get('/halls/')
            const all: Hall[] = res.data.results || res.data
            setHalls(all)
        } catch { toast.error('Failed to load halls') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchHalls() }, [fetchHalls])

    // Admin can only REJECT bad halls, not approve — partners publish their own halls
    const reject = async () => {
        if (!rejectDialog || !rejectReason.trim()) return
        setRejecting(true)
        try {
            await api.post(`/halls/${rejectDialog.slug}/reject/`, { reason: rejectReason })
            toast.success(`"${rejectDialog.name}" has been rejected`)
            setRejectDialog(null)
            setRejectReason('')
            fetchHalls()
        } catch { toast.error('Failed to reject hall') }
        finally { setRejecting(false) }
    }

    const displayHalls = halls
        .filter(h => tab === 'all' || h.status === tab)
        .filter(h => !search ||
            h.name.toLowerCase().includes(search.toLowerCase()) ||
            h.partner_email?.toLowerCase().includes(search.toLowerCase()) ||
            h.partner_name?.toLowerCase().includes(search.toLowerCase()) ||
            h.city?.toLowerCase().includes(search.toLowerCase())
        )

    const counts = {
        pending: halls.filter(h => h.status === 'pending').length,
        approved: halls.filter(h => h.status === 'approved').length,
        rejected: halls.filter(h => h.status === 'rejected').length,
        all: halls.length,
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Halls &amp; Partners</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {halls.length} halls total · Partners publish their own halls via subscription
                    </Typography>
                </Box>
                <Button startIcon={<Refresh />} size="small" onClick={fetchHalls} variant="outlined">Refresh</Button>
            </Box>

            {/* Info notice: admin cannot approve */}
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 2, border: '1px solid', borderColor: 'info.light', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="info.dark" sx={{ fontWeight: 500 }}>
                    ℹ️ <strong>Admin view only.</strong> Partners publish/unpublish their own halls. You can only <strong>reject</strong> inappropriate halls.
                </Typography>
            </Box>

            {/* Status tabs */}
            <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0) }} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                {[
                    { value: 'all', label: `All (${counts.all})` },
                    { value: 'pending', label: `Pending (${counts.pending})` },
                    { value: 'approved', label: `Active (${counts.approved})` },
                    { value: 'rejected', label: `Rejected (${counts.rejected})` },
                ].map(t => <Tab key={t.value} value={t.value} label={t.label} sx={{ fontSize: 13 }} />)}
            </Tabs>

            {/* Search */}
            <Box sx={{ mb: 3 }}>
                <TextField
                    size="small" placeholder="Search hall name, partner name, email or city…"
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <Search sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
                    sx={{ width: 400 }}
                />
            </Box>

            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase' } }}>
                                <TableCell>Hall</TableCell>
                                <TableCell>Partner</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Capacity</TableCell>
                                <TableCell>Price / Slot</TableCell>
                                <TableCell>Hall Status</TableCell>
                                <TableCell>Live?</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell></TableRow>
                            ) : displayHalls.length === 0 ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.disabled' }}>
                                    {tab === 'pending' ? 'No halls awaiting review 🎉' : 'No halls found'}
                                </TableCell></TableRow>
                            ) : displayHalls.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((h) => (
                                <TableRow key={h.id} hover sx={{ '&:last-child td': { border: 0 } }}>

                                    {/* Hall */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                                                <Store fontSize="small" sx={{ color: 'primary.main' }} />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>{h.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {h.created_at
                                                        ? new Date(h.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                                                        : '—'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>

                                    {/* Partner — real name + email */}
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>{h.partner_name || '—'}</Typography>
                                        <Typography variant="caption" color="text.secondary">{h.partner_email || '—'}</Typography>
                                    </TableCell>

                                    {/* Location */}
                                    <TableCell>
                                        <Typography variant="body2">{h.city}</Typography>
                                        <Typography variant="caption" color="text.secondary">Pin: {h.pincode}</Typography>
                                    </TableCell>

                                    {/* Capacity */}
                                    <TableCell>
                                        <Typography variant="body2">{h.capacity_min}–{h.capacity_max} people</Typography>
                                    </TableCell>

                                    {/* Price */}
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>
                                            ₹{parseFloat(h.price_per_slot || '0').toLocaleString('en-IN')}
                                        </Typography>
                                    </TableCell>

                                    {/* Hall Status — pending/approved/rejected */}
                                    <TableCell>
                                        <Chip
                                            label={h.status}
                                            color={STATUS_COLORS[h.status] || 'default'}
                                            size="small"
                                            sx={{ fontWeight: 600, fontSize: 11, textTransform: 'capitalize' }}
                                        />
                                    </TableCell>

                                    {/* Live status — is_active flag shows if partner published it */}
                                    <TableCell>
                                        <Chip
                                            label={h.is_active ? '🟢 Live' : '⚫ Offline'}
                                            size="small"
                                            sx={{
                                                fontWeight: 600, fontSize: 11,
                                                bgcolor: h.is_active ? 'success.lighter' : 'grey.100',
                                                color: h.is_active ? 'success.dark' : 'text.secondary',
                                            }}
                                        />
                                    </TableCell>

                                    {/* Actions — only Reject (admin cannot approve) */}
                                    <TableCell align="center">
                                        {h.status !== 'rejected' ? (
                                            <Tooltip title="Reject this hall">
                                                <IconButton size="small" color="error" onClick={() => { setRejectDialog(h); setRejectReason('') }}>
                                                    <Cancel fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">—</Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div" count={displayHalls.length} page={page}
                    rowsPerPage={rowsPerPage} rowsPerPageOptions={[12]}
                    onPageChange={(_, p) => setPage(p)}
                />
            </Card>

            {/* Reject Hall Dialog */}
            <Dialog open={!!rejectDialog} onClose={() => setRejectDialog(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Reject Hall</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Rejecting <strong>{rejectDialog?.name}</strong> by <strong>{rejectDialog?.partner_name}</strong>.
                        The partner will be notified.
                    </Typography>
                    <TextField
                        fullWidth size="small" label="Reason *" multiline rows={3}
                        value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. Incomplete information, inappropriate content…"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
                    <Button
                        color="error" variant="contained"
                        onClick={reject}
                        disabled={!rejectReason.trim() || rejecting}
                        startIcon={rejecting ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {rejecting ? 'Rejecting…' : 'Reject Hall'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
