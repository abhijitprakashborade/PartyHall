'use client'

import React, { useState, useEffect } from 'react'
import {
    Box, Card, CardContent, Typography, Chip, Button, TextField,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    alpha, useTheme, CircularProgress, IconButton, Tooltip, MenuItem, Select,
} from '@mui/material'
import { Lock, LockOpen, Refresh } from '@mui/icons-material'
import api from '@/lib/api'
import { toast } from 'sonner'

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    available: 'success',
    locked: 'warning',
    booked: 'info',
    blocked: 'error',
}

export default function AdminSlotsPage() {
    const theme = useTheme()
    const [slots, setSlots] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [filterDate, setFilterDate] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterHall, setFilterHall] = useState('')

    const fetchSlots = async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = {}
            if (filterDate) params.date = filterDate
            if (filterHall) params.hall_id = filterHall
            const res = await api.get('/slots/', { params })
            const list = res.data?.results || res.data || []
            // Client-side status filter
            setSlots(filterStatus ? list.filter((s: any) => s.status === filterStatus) : list)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleBlock = async (slotId: string) => {
        setActionLoading(slotId + '-block')
        try {
            await api.post(`/slots/${slotId}/block/`)
            toast.success('Slot blocked successfully')
            fetchSlots()
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to block slot')
        } finally {
            setActionLoading(null)
        }
    }

    const handleUnblock = async (slotId: string) => {
        setActionLoading(slotId + '-unblock')
        try {
            await api.post(`/slots/${slotId}/unblock/`)
            toast.success('Slot unblocked successfully')
            fetchSlots()
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to unblock slot')
        } finally {
            setActionLoading(null)
        }
    }

    useEffect(() => {
        fetchSlots()
    }, [])

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800}>Slot Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        View, block, and unblock booking slots across all halls.
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchSlots} disabled={loading}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField
                            label="Filter by Date"
                            type="date"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 160 }}
                        />
                        <Select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            displayEmpty
                            size="small"
                            sx={{ minWidth: 160 }}
                        >
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="available">Available</MenuItem>
                            <MenuItem value="locked">Locked</MenuItem>
                            <MenuItem value="booked">Booked</MenuItem>
                            <MenuItem value="blocked">Blocked</MenuItem>
                        </Select>
                        <Button
                            variant="contained"
                            onClick={fetchSlots}
                            disabled={loading}
                            startIcon={<Refresh />}
                            size="small"
                        >
                            Apply Filter
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardContent sx={{ p: 0 }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ '& th': { fontWeight: 700, background: alpha(theme.palette.primary.main, 0.05) } }}>
                                        <TableCell>Hall</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Time</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Locked Until</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {slots.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                No slots found
                                            </TableCell>
                                        </TableRow>
                                    ) : slots.map((slot: any) => (
                                        <TableRow key={slot.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {slot.hall_name || slot.hall || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{slot.date}</TableCell>
                                            <TableCell>
                                                {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={slot.status}
                                                    color={STATUS_COLOR[slot.status] || 'default'}
                                                    size="small"
                                                    sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {slot.locked_until
                                                    ? new Date(slot.locked_until).toLocaleTimeString('en-IN')
                                                    : '—'}
                                            </TableCell>
                                            <TableCell align="right">
                                                {slot.status !== 'booked' && (
                                                    slot.status === 'blocked' ? (
                                                        <Tooltip title="Unblock Slot">
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={() => handleUnblock(slot.id)}
                                                                disabled={actionLoading === slot.id + '-unblock'}
                                                            >
                                                                <LockOpen fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip title="Block Slot (Admin)">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleBlock(slot.id)}
                                                                disabled={actionLoading === slot.id + '-block'}
                                                            >
                                                                <Lock fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    )
}
