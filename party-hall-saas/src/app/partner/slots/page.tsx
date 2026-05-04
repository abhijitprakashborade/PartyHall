'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Box, Card, CardContent, Typography, Button, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    CircularProgress, Tooltip, Grid, Switch, FormControlLabel,
} from '@mui/material'
import {
    ChevronLeft, ChevronRight, Add, Lock, LockOpen,
    EventBusy, CheckCircle, Business
} from '@mui/icons-material'
import {
    FormControl, InputLabel, Select, MenuItem,
} from '@mui/material'
import api from '@/lib/api'
import { toast } from 'sonner'

interface Slot {
    id: string
    date: string
    start_time: string
    end_time: string
    status: 'available' | 'locked' | 'booked'
    price_override?: string | null
}

const STATUS_COLORS = {
    available: '#22c55e',
    locked: '#f59e0b',
    booked: '#8b5cf6',
}

const STATUS_LABELS = {
    available: 'Available',
    locked: 'Locked',
    booked: 'Booked',
}

function getMonthMatrix(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const rows: (number | null)[][] = []
    let day = 1 - firstDay
    while (day <= daysInMonth) {
        const row: (number | null)[] = []
        for (let col = 0; col < 7; col++, day++) {
            row.push(day >= 1 && day <= daysInMonth ? day : null)
        }
        rows.push(row)
    }
    return rows
}

export default function PartnerSlotsPage() {
    const [year, setYear] = useState(new Date().getFullYear())
    const [month, setMonth] = useState(new Date().getMonth())
    const [slots, setSlots] = useState<Slot[]>([])
    const [halls, setHalls] = useState<any[]>([])
    const [hallId, setHallId] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [addDialog, setAddDialog] = useState(false)
    const [newSlot, setNewSlot] = useState({ start_time: '09:00', end_time: '20:00', price_override: '' })
    const [autoSplit, setAutoSplit] = useState(true)
    const [editDialog, setEditDialog] = useState(false)
    const [editingSlot, setEditingSlot] = useState<Slot | null>(null)
    const [editTimes, setEditTimes] = useState({ start_time: '10:00', end_time: '13:00' })

    // Format HH:MM:SS to 12h IST display
    const formatIST = (t: string) => {
        if (!t) return t
        const [h, m] = t.split(':')
        let hr = parseInt(h)
        const ap = hr >= 12 ? 'PM' : 'AM'
        hr = hr % 12 || 12
        return `${hr}:${m} ${ap}`
    }

    // Fetch partner's halls
    useEffect(() => {
        api.get('/halls/').then(res => {
            const data = res.data.results || res.data
            setHalls(data)
            if (data.length > 0) setHallId(data[0].id)
        }).catch(() => { }).finally(() => setLoading(false))
    }, [])

    const fetchSlots = useCallback(async () => {
        if (!hallId) return
        const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`
        const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`
        try {
            const res = await api.get(`/slots/?hall_id=${hallId}&date_from=${dateFrom}&date_to=${dateTo}`)
            setSlots(res.data.results || res.data)
        } catch { /* silent */ }
    }, [hallId, year, month])

    useEffect(() => { if (hallId) fetchSlots() }, [hallId, fetchSlots])

    const navMonth = (dir: number) => {
        if (dir === 1) { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }
        else { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
    }

    const slotsOnDate = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return slots.filter(s => s.date === dateStr)
    }

    const createSlot = async () => {
        if (!hallId || !selectedDate) return
        try {
            if (autoSplit) {
                // Auto-split: create 1-hour sub-slots covering the window
                const res = await api.post('/slots/generate_subslots/', {
                    hall_id: hallId,
                    date: selectedDate,
                    start_time: newSlot.start_time + ':00',
                    end_time: newSlot.end_time + ':00',
                    price_override: newSlot.price_override ? parseFloat(newSlot.price_override) : null,
                })
                const created = res.data.created?.length || 0
                const skipped = res.data.skipped?.length || 0
                toast.success(`${created} slot(s) created${skipped ? `, ${skipped} already existed` : ''}!`)
            } else {
                await api.post('/slots/', {
                    hall: hallId, date: selectedDate,
                    start_time: newSlot.start_time + ':00',
                    end_time: newSlot.end_time + ':00',
                    status: 'available',
                    price_override: newSlot.price_override ? parseFloat(newSlot.price_override) : null,
                })
                toast.success('Slot added!')
            }
            setAddDialog(false)
            setNewSlot({ start_time: '09:00', end_time: '12:00', price_override: '' })
            fetchSlots()
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to add slot')
        }
    }

    const deleteSlot = async (slotId: string) => {
        try {
            await api.delete(`/slots/${slotId}/`)
            toast.success('Slot removed')
            fetchSlots()
        } catch { toast.error('Cannot delete a booked slot') }
    }

    const openEdit = (slot: Slot) => {
        setEditingSlot(slot)
        setEditTimes({
            start_time: slot.start_time?.slice(0, 5) || '10:00',
            end_time: slot.end_time?.slice(0, 5) || '13:00',
        })
        setEditDialog(true)
    }

    const saveEdit = async () => {
        if (!editingSlot) return
        try {
            await api.patch(`/slots/${editingSlot.id}/`, {
                start_time: editTimes.start_time + ':00',
                end_time: editTimes.end_time + ':00',
            })
            toast.success('Slot updated!')
            setEditDialog(false)
            setEditingSlot(null)
            fetchSlots()
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to update slot')
        }
    }

    const matrix = getMonthMatrix(year, month)
    const monthName = new Date(year, month).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    const today = new Date()
    const isPast = (day: number) => new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>
    if (!hallId) return (
        <Box sx={{ textAlign: 'center', pt: 8 }}>
            <Typography color="text.secondary">You need to create your hall first before managing slots.</Typography>
            <Button href="/partner/hall" variant="contained" sx={{ mt: 2 }}>Create Hall</Button>
        </Box>
    )

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Slot Manager</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Add, delete, and block availability slots for your hall. Click a date to manage slots.
                    </Typography>
                </Box>
                {/* Legend */}
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {Object.entries(STATUS_LABELS).map(([s, label]) => (
                        <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[s as keyof typeof STATUS_COLORS] }} />
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Hall Selector / Managed Venue Context */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3, bgcolor: 'primary.light', borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
                <CardContent sx={{ py: '12px !important' }}>
                    <Grid container alignItems="center" spacing={2}>
                        <Grid size="auto">
                            <Business sx={{ color: 'primary.main' }} />
                        </Grid>
                        <Grid size="grow">
                            <Typography variant="subtitle2" fontWeight={700}>
                                {halls.length > 1 ? 'Select Hall to Manage' : 'Managed Venue'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {halls.length > 1 ? 'Showing availability for the selected venue below' : `Currently managing slots for ${halls[0]?.name || 'your hall'}`}
                            </Typography>
                        </Grid>
                        {halls.length > 1 && (
                            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                                <FormControl fullWidth size="small" sx={{ bgcolor: 'background.paper' }}>
                                    <Select
                                        value={hallId}
                                        onChange={(e) => setHallId(e.target.value as string)}
                                        displayEmpty
                                    >
                                        {halls.map((h) => (
                                            <MenuItem key={h.id} value={h.id}>
                                                {h.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        {halls.length <= 1 && halls[0] && (
                            <Grid size="auto">
                                <Chip label={halls[0].name} color="primary" size="small" sx={{ fontWeight: 700 }} />
                            </Grid>
                        )}
                    </Grid>
                </CardContent>
            </Card>

            {/* ISSUE #24 fix: stack calendar + day panel vertically on mobile.
                 flex-basis 420px caused overflow on phones — now full-width on xs, side-by-side on md+. */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {/* Calendar */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, flex: { xs: '1 1 100%', md: '1 1 420px' } }}>
                    <CardContent>
                        {/* Nav */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <IconButton onClick={() => navMonth(-1)} size="small"><ChevronLeft /></IconButton>
                            <Typography variant="h6" fontWeight={700}>{monthName}</Typography>
                            <IconButton onClick={() => navMonth(1)} size="small"><ChevronRight /></IconButton>
                        </Box>

                        {/* Day headers */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', mb: 1 }}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <Typography key={d} align="center" variant="caption" fontWeight={700} color="text.secondary" sx={{ py: 0.5 }}>{d}</Typography>
                            ))}
                        </Box>

                        {/* Weeks */}
                        {matrix.map((week, wi) => (
                            <Box key={wi} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0.5, mb: 0.5 }}>
                                {week.map((day, di) => {
                                    if (!day) return <Box key={di} />
                                    const daySlots = slotsOnDate(day)
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    const isSelected = selectedDate === dateStr
                                    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
                                    const past = isPast(day)
                                    return (
                                        <Box
                                            key={di}
                                            onClick={() => !past && setSelectedDate(dateStr)}
                                            sx={{
                                                p: 0.75, borderRadius: 1.5, cursor: past ? 'default' : 'pointer',
                                                border: '1px solid', textAlign: 'center',
                                                borderColor: isSelected ? 'primary.main' : isToday ? 'primary.light' : 'divider',
                                                bgcolor: isSelected ? 'primary.light' : past ? 'action.hover' : 'background.paper',
                                                opacity: past ? 0.4 : 1,
                                                '&:hover': past ? {} : { borderColor: 'primary.main', bgcolor: 'primary.light' },
                                                transition: 'all 0.15s',
                                                minHeight: 52,
                                            }}
                                        >
                                            <Typography variant="caption" fontWeight={isToday ? 800 : 500}
                                                color={isSelected ? 'primary.main' : 'text.primary'}>{day}</Typography>
                                            {/* Slot dots */}
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.3, mt: 0.3 }}>
                                                {daySlots.slice(0, 4).map(s => (
                                                    <Box key={s.id} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: STATUS_COLORS[s.status] }} />
                                                ))}
                                                {daySlots.length > 4 && <Typography variant="caption" sx={{ fontSize: 8, color: 'text.secondary' }}>+{daySlots.length - 4}</Typography>}
                                            </Box>
                                        </Box>
                                    )
                                })}
                            </Box>
                        ))}
                    </CardContent>
                </Card>

                {/* Day detail panel */}
                {selectedDate && (
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, flex: { xs: '1 1 100%', md: '0 1 320px' } }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>
                                    {new Date(selectedDate + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </Typography>
                                <Button size="small" startIcon={<Add />} variant="contained"
                                    onClick={() => setAddDialog(true)}>Add Slot</Button>
                            </Box>

                            {slotsOnDate(parseInt(selectedDate.split('-')[2])).length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <EventBusy sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body2" color="text.secondary">No slots for this day</Typography>
                                    <Typography variant="caption" color="text.disabled">Click Add Slot to create one</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {slotsOnDate(parseInt(selectedDate.split('-')[2])).map(slot => (
                                        <Box key={slot.id} sx={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            p: 1.5, borderRadius: 1.5, border: '1px solid',
                                            borderColor: 'divider', bgcolor: 'background.default',
                                        }}>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {formatIST(slot.start_time)} – {formatIST(slot.end_time)}
                                                </Typography>
                                                {slot.price_override && (
                                                    <Typography variant="caption" color="text.secondary">₹{slot.price_override}</Typography>
                                                )}
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLORS[slot.status] }} />
                                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                                    {slot.status}
                                                </Typography>
                                                {slot.status === 'available' && (
                                                    <>
                                                        <Tooltip title="Edit time">
                                                            <IconButton size="small" color="primary" onClick={() => openEdit(slot)}>
                                                                <LockOpen sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete slot">
                                                            <IconButton size="small" color="error" onClick={() => deleteSlot(slot.id)}>
                                                                <EventBusy sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                )}
            </Box>

            {/* Add Slot Dialog */}
            <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Add Slot — {selectedDate && new Date(selectedDate + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField fullWidth size="small" label="Start Time" type="time"
                                value={newSlot.start_time}
                                onChange={e => setNewSlot(s => ({ ...s, start_time: e.target.value }))} />
                            <TextField fullWidth size="small" label="End Time" type="time"
                                value={newSlot.end_time}
                                onChange={e => setNewSlot(s => ({ ...s, end_time: e.target.value }))} />
                        </Box>
                        <TextField size="small" label="Price Override (₹) — optional"
                            type="number" value={newSlot.price_override}
                            onChange={e => setNewSlot(s => ({ ...s, price_override: e.target.value }))}
                            helperText="Leave blank to use hall base price" />

                        <FormControlLabel
                            control={<Switch checked={autoSplit} onChange={e => setAutoSplit(e.target.checked)} color="primary" />}
                            label={
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>Auto-split into 1-hour slots</Typography>
                                    <Typography variant="caption" color="text.secondary">Creates multiple 1-hour bookable slots from this window</Typography>
                                </Box>
                            }
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={createSlot} startIcon={<Add />}>Add Slot</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Slot Dialog */}
            <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Slot Time</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <TextField fullWidth size="small" label="Start Time" type="time"
                            value={editTimes.start_time}
                            onChange={e => setEditTimes(t => ({ ...t, start_time: e.target.value }))} />
                        <TextField fullWidth size="small" label="End Time" type="time"
                            value={editTimes.end_time}
                            onChange={e => setEditTimes(t => ({ ...t, end_time: e.target.value }))} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={saveEdit} startIcon={<CheckCircle />}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
