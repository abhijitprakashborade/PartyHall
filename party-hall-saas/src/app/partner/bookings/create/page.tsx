'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Box, Typography, Paper, Tabs, Tab, TextField, Button, Avatar,
    Grid, Chip, Alert, CircularProgress, MenuItem,
    Select, FormControl, InputLabel, ToggleButton, ToggleButtonGroup,
    IconButton, Card, CardContent, Stepper, Step, StepLabel,
} from '@mui/material'
import {
    Search, PersonAdd, FlashOn, ArrowBack, ArrowForward,
    CheckCircle, Person, CalendarMonth, Inventory2, Receipt,
    Add, Remove,
} from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import api from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Customer { id: string; full_name: string; phone: string; email: string; booking_count: number }
interface SlotObj { id: string; start_time: string; end_time: string; status: string; date: string }
interface Package { id: string; name: string; price: string; max_people: number; duration_hours: number; inclusions: string[]; is_recommended: boolean }

const SOURCES = ['walk_in', 'phone', 'whatsapp', 'referral'] as const
const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI / QR' },
    { value: 'card', label: 'Card' },
    { value: 'pay_later', label: 'Pay Later' },
]
const STEP_LABELS = ['Customer', 'Date & Slot', 'Package', 'Confirm']

// Normalize paginated or plain-array API responses
function toArray<T>(data: any): T[] {
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.results)) return data.results
    return []
}

function fmt12(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

// ─── Customer Step ────────────────────────────────────────────────────────────
function CustomerStep({ selected, onSelect }: { selected: Customer | null; onSelect: (c: Customer) => void }) {
    const theme = useTheme()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Customer[]>([])
    const [loading, setLoading] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [newForm, setNewForm] = useState({ full_name: '', phone: '', email: '', source: 'walk_in' })
    const [creating, setCreating] = useState(false)

    const search = useCallback(async (q: string) => {
        setLoading(true)
        try {
            const res = await api.get(`/partner/customers/?search=${encodeURIComponent(q)}`)
            setResults(toArray(res.data))
        } catch { setResults([]) } finally { setLoading(false) }
    }, [])

    useEffect(() => {
        const t = setTimeout(() => search(query), 300)
        return () => clearTimeout(t)
    }, [query, search])

    useEffect(() => { search('') }, [search])

    const createCustomer = async () => {
        if (!newForm.full_name || !newForm.phone) { toast.error('Name and phone required'); return }
        setCreating(true)
        try {
            const res = await api.post('/partner/customers/create/', newForm)
            toast.success(`Customer ${res.data.full_name} ${res.data.already_exists ? 'found' : 'created'}`)
            onSelect(res.data)
            setShowNew(false)
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to create customer')
        } finally { setCreating(false) }
    }

    return (
        <Box>
            <Alert icon={<Search fontSize="small" />} severity="info" sx={{ mb: 2 }}>
                Search existing customers by name or phone. If customer is new, create them on the spot.
            </Alert>

            {selected && (
                <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}
                    action={<Button size="small" color="inherit" onClick={() => onSelect(null as any)}>Change</Button>}>
                    Selected: <strong>{selected.full_name}</strong> — {selected.phone}
                </Alert>
            )}

            {!selected && (
                <>
                    <TextField fullWidth size="small" placeholder="Search by name, phone, or email…"
                        value={query} onChange={e => setQuery(e.target.value)} sx={{ mb: 2 }}
                        InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.disabled' }} /> }} />

                    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                        {loading ? (
                            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} /></Box>
                        ) : results.length === 0 ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary" variant="body2">No customers found</Typography>
                            </Box>
                        ) : results.map((c, i) => (
                            <Box key={c.id} onClick={() => onSelect(c)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 2, p: 1.5, cursor: 'pointer',
                                    borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider',
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                                }}>
                                <Avatar sx={{ bgcolor: theme.palette.primary.light, color: theme.palette.primary.dark, fontWeight: 700, width: 38, height: 38, fontSize: 14 }}>
                                    {c.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography fontWeight={600} variant="body2">{c.full_name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{c.phone} · {c.email}</Typography>
                                </Box>
                                <Chip label={c.booking_count > 0 ? `${c.booking_count} booking${c.booking_count > 1 ? 's' : ''}` : 'New'}
                                    size="small" color={c.booking_count > 0 ? 'primary' : 'default'} variant="outlined" />
                            </Box>
                        ))}
                    </Paper>

                    {!showNew ? (
                        <Button fullWidth variant="outlined" startIcon={<Add />} onClick={() => setShowNew(true)}>
                            Create new customer instead
                        </Button>
                    ) : (
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography fontWeight={700} sx={{ mb: 2 }}>New customer</Typography>
                            <Grid container spacing={2}>
                                <Grid size={6}>
                                    <TextField fullWidth size="small" label="Full name *" value={newForm.full_name}
                                        onChange={e => setNewForm(f => ({ ...f, full_name: e.target.value }))} />
                                </Grid>
                                <Grid size={6}>
                                    <TextField fullWidth size="small" label="Phone *" value={newForm.phone}
                                        onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} />
                                </Grid>
                                <Grid size={6}>
                                    <TextField fullWidth size="small" label="Email (optional)" value={newForm.email}
                                        onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} />
                                </Grid>
                                <Grid size={6}>
                                    <FormControl fullWidth size="small"><InputLabel>Source</InputLabel>
                                        <Select label="Source" value={newForm.source} onChange={e => setNewForm(f => ({ ...f, source: e.target.value }))}>
                                            {SOURCES.map(s => <MenuItem key={s} value={s}>{s.replace('_', '-')}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={12}>
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                        <Button onClick={() => setShowNew(false)} color="inherit">Cancel</Button>
                                        <Button variant="contained" onClick={createCustomer} disabled={creating}>
                                            {creating ? 'Creating…' : 'Create & select'}
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Paper>
                    )}
                </>
            )}
        </Box>
    )
}

// ─── Date & Slot Step ─────────────────────────────────────────────────────────
function DateSlotStep({
    hallId, date, setDate, guests, setGuests, selectedSlots, setSelectedSlots,
}: {
    hallId: string | null; date: string; setDate: (d: string) => void
    guests: number; setGuests: (g: number) => void
    selectedSlots: SlotObj[]; setSelectedSlots: (s: SlotObj[]) => void
}) {
    const theme = useTheme()
    const [slots, setSlots] = useState<SlotObj[]>([])
    const [loading, setLoading] = useState(false)

    const fetchSlots = useCallback(async (d: string) => {
        if (!hallId || !d) return
        setLoading(true)
        try {
            const res = await api.get(`/slots/?hall_id=${hallId}&date=${d}`)
            setSlots(toArray(res.data))
        } catch { setSlots([]) } finally { setLoading(false) }
    }, [hallId])

    useEffect(() => { fetchSlots(date) }, [date, fetchSlots])

    const toggleSlot = (slot: SlotObj) => {
        if (slot.status === 'booked' || slot.status === 'locked') return
        const isSelected = selectedSlots.some(s => s.id === slot.id)
        setSelectedSlots(isSelected ? selectedSlots.filter(s => s.id !== slot.id) : [...selectedSlots, slot])
    }

    return (
        <Box>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Date & time slot</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={6}>
                    <TextField fullWidth size="small" label="Booking Date *" type="date"
                        value={date} onChange={e => { setDate(e.target.value); setSelectedSlots([]) }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: format(new Date(), 'yyyy-MM-dd') }} />
                </Grid>
                <Grid size={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>GUESTS</Typography>
                        <IconButton size="small" onClick={() => setGuests(Math.max(1, guests - 1))}
                            sx={{ border: '1px solid', borderColor: 'divider' }}><Remove fontSize="small" /></IconButton>
                        <Typography fontWeight={700} sx={{ minWidth: 32, textAlign: 'center' }}>{guests}</Typography>
                        <IconButton size="small" onClick={() => setGuests(guests + 1)}
                            sx={{ border: '1px solid', borderColor: 'divider' }}><Add fontSize="small" /></IconButton>
                        <Typography variant="caption" color="text.secondary">people</Typography>
                    </Box>
                </Grid>
            </Grid>

            <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                Available slots — tap to select (multiple allowed)
            </Typography>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
            ) : slots.length === 0 ? (
                <Alert severity="info">No slots configured for this date. Add slots from Slot Manager first.</Alert>
            ) : (
                <Grid container spacing={1.5}>
                    {slots.map(slot => {
                        const booked = slot.status === 'booked' || slot.status === 'locked'
                        const picked = selectedSlots.some(s => s.id === slot.id)
                        return (
                            <Grid size={3} key={slot.id}>
                                <Paper onClick={() => toggleSlot(slot)} elevation={0} sx={{
                                    p: 1.5, textAlign: 'center', borderRadius: 2, cursor: booked ? 'default' : 'pointer',
                                    border: '1.5px solid',
                                    borderColor: booked ? 'error.light' : picked ? 'primary.main' : 'divider',
                                    bgcolor: booked ? alpha(theme.palette.error.main, 0.06) : picked ? alpha(theme.palette.primary.main, 0.1) : 'background.paper',
                                    transition: 'all .15s',
                                    '&:hover': !booked ? { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.07) } : {},
                                }}>
                                    <Typography variant="caption" fontWeight={700}
                                        color={booked ? 'error.main' : picked ? 'primary.main' : 'text.primary'}>
                                        {fmt12(slot.start_time)}
                                    </Typography>
                                </Paper>
                            </Grid>
                        )
                    })}
                </Grid>
            )}
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'primary.main' }} />
                    <Typography variant="caption">Selected</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: alpha(theme.palette.error.main, 0.3), border: '1px solid', borderColor: 'error.light' }} />
                    <Typography variant="caption">Booked</Typography>
                </Box>
            </Box>
        </Box>
    )
}

// ─── Package Step ─────────────────────────────────────────────────────────────
function PackageStep({
    hallId, selectedPkg, setSelectedPkg, customAmount, setCustomAmount, notes, setNotes,
}: {
    hallId: string | null; selectedPkg: Package | null; setSelectedPkg: (p: Package | null) => void
    customAmount: string; setCustomAmount: (a: string) => void
    notes: string; setNotes: (n: string) => void
}) {
    const theme = useTheme()
    const [packages, setPackages] = useState<Package[]>([])
    const [useCustom, setUseCustom] = useState(false)

    useEffect(() => {
        if (!hallId) return
        api.get(`/packages/?hall=${hallId}`).then(r => setPackages(toArray(r.data))).catch(() => {})
    }, [hallId])

    return (
        <Box>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Select package</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                {packages.map(pkg => (
                    <Grid size={6} key={pkg.id}>
                        <Card elevation={0} sx={{
                            border: '2px solid',
                            borderColor: (!useCustom && selectedPkg?.id === pkg.id) ? 'primary.main' : 'divider',
                            borderRadius: 2, cursor: 'pointer', height: '100%',
                            bgcolor: (!useCustom && selectedPkg?.id === pkg.id) ? alpha(theme.palette.primary.main, 0.07) : 'background.paper',
                            transition: 'all .15s',
                        }} onClick={() => { setSelectedPkg(pkg); setUseCustom(false) }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Typography fontWeight={700}>{pkg.name}</Typography>
                                    {pkg.is_recommended && <Chip label="Best value" size="small" color="warning" variant="filled" sx={{ height: 18, fontSize: 10 }} />}
                                </Box>
                                <Typography fontWeight={800} color="primary.main" sx={{ mb: 0.5 }}>
                                    ₹{Number(pkg.price).toLocaleString('en-IN')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {pkg.duration_hours}h · Up to {pkg.max_people} people
                                    {pkg.inclusions?.length > 0 ? ' · ' + pkg.inclusions.slice(0, 2).join(' + ') : ''}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                <Grid size={6}>
                    <Card elevation={0} sx={{
                        border: '2px solid', borderColor: useCustom ? 'secondary.main' : 'divider',
                        borderRadius: 2, cursor: 'pointer', height: '100%',
                        bgcolor: useCustom ? alpha(theme.palette.secondary.main, 0.06) : 'background.paper',
                    }} onClick={() => { setUseCustom(true); setSelectedPkg(null) }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography fontWeight={700} sx={{ mb: 0.5 }}>Custom</Typography>
                            <Typography variant="caption" color="text.secondary">Set price manually · No package</Typography>
                            {useCustom && (
                                <TextField fullWidth size="small" label="Amount (₹)" type="number"
                                    value={customAmount} onChange={e => setCustomAmount(e.target.value)}
                                    sx={{ mt: 1.5 }} onClick={e => e.stopPropagation()} />
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <TextField fullWidth multiline rows={2} size="small"
                label="Special requests (optional)" placeholder="Any special arrangements for this customer…"
                value={notes} onChange={e => setNotes(e.target.value)} />
        </Box>
    )
}

// ─── Confirm Step ─────────────────────────────────────────────────────────────
function ConfirmStep({
    customer, date, selectedSlots, selectedPkg, guests, customAmount, paymentMethod, setPaymentMethod, extraGuestFee,
}: {
    customer: Customer | null; date: string; selectedSlots: SlotObj[]
    selectedPkg: Package | null; guests: number; customAmount: string
    paymentMethod: string; setPaymentMethod: (m: string) => void
    extraGuestFee: number
}) {
    const pkgPrice = selectedPkg ? Number(selectedPkg.price) : 0
    const extra = selectedPkg ? Math.max(0, guests - selectedPkg.max_people) * extraGuestFee : 0
    const total = customAmount ? Number(customAmount) : pkgPrice + extra

    const slotLabel = selectedSlots.length > 0
        ? `${fmt12(selectedSlots[0].start_time)} – ${fmt12(selectedSlots[selectedSlots.length - 1].end_time)}`
        : '—'

    const rows = [
        ['Customer', customer?.full_name || '—'],
        ['Date', date ? format(new Date(date + 'T00:00'), 'dd MMM yyyy') : '—'],
        ['Slots', slotLabel + (selectedSlots.length > 1 ? ` (${selectedSlots.length} slots)` : '')],
        ['Guests', String(guests)],
        ['Package', selectedPkg?.name || (customAmount ? 'Custom' : '—')],
        ...(selectedPkg ? [['Package price', `₹${pkgPrice.toLocaleString('en-IN')}`]] : []),
        ...(extra > 0 ? [[`Extra guests (${guests - selectedPkg!.max_people} × ₹${extraGuestFee})`, `₹${extra.toLocaleString('en-IN')}`]] : []),
        ['Total', `₹${total.toLocaleString('en-IN')}`],
    ] as [string, string][]

    return (
        <Box>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Booking summary</Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
                {rows.map(([label, value], i) => (
                    <Box key={label} sx={{
                        display: 'flex', justifyContent: 'space-between', px: 2.5, py: 1.2,
                        bgcolor: i % 2 === 0 ? 'background.default' : 'background.paper',
                        borderTop: i === rows.length - 1 ? '2px solid' : 'none',
                        borderColor: 'divider',
                    }}>
                        <Typography variant="body2" color={i === rows.length - 1 ? 'text.primary' : 'text.secondary'}
                            fontWeight={i === rows.length - 1 ? 700 : 400}>{label}</Typography>
                        <Typography variant="body2" fontWeight={i === rows.length - 1 ? 800 : 600}
                            color={i === rows.length - 1 ? 'primary.main' : 'text.primary'}>{value}</Typography>
                    </Box>
                ))}
            </Paper>

            <Typography fontWeight={600} sx={{ mb: 1.5 }}>Payment method</Typography>
            <ToggleButtonGroup value={paymentMethod} exclusive onChange={(_, v) => v && setPaymentMethod(v)} fullWidth>
                {PAYMENT_METHODS.map(m => (
                    <ToggleButton key={m.value} value={m.value} sx={{ textTransform: 'none', fontWeight: 600, py: 1.2 }}>
                        {m.label}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>

            <Alert severity="info" sx={{ mt: 2.5 }}>
                Booking will be confirmed immediately. A QR entry pass will be generated and can be shared with the customer via WhatsApp.
            </Alert>
        </Box>
    )
}

// ─── Standalone Add Customer ──────────────────────────────────────────────────
function AddCustomerTab() {
    const [form, setForm] = useState({
        full_name: '', phone: '', email: '', dob: '', source: 'walk_in', occasion: 'birthday', notes: '',
    })
    const [saving, setSaving] = useState(false)

    const submit = async () => {
        if (!form.full_name || !form.phone) { toast.error('Name and phone required'); return }
        setSaving(true)
        try {
            const res = await api.post('/partner/customers/create/', form)
            toast.success(res.data.already_exists
                ? `${res.data.full_name} already exists in your contacts`
                : `${res.data.full_name} added to your contacts`)
            setForm({ full_name: '', phone: '', email: '', dob: '', source: 'walk_in', occasion: 'birthday', notes: '' })
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed') } finally { setSaving(false) }
    }

    return (
        <Box>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Typography fontWeight={800} variant="h6">Add new customer</Typography>
                    <Chip label="standalone" size="small" color="success" variant="filled" />
                </Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                    Add a customer to your contact list without creating a booking. Useful for walk-ins you want to follow up with later.
                </Alert>
                <Grid container spacing={2}>
                    <Grid size={6}>
                        <TextField fullWidth size="small" label="Full Name *" value={form.full_name}
                            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                    </Grid>
                    <Grid size={6}>
                        <TextField fullWidth size="small" label="Phone *" value={form.phone}
                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </Grid>
                    <Grid size={6}>
                        <TextField fullWidth size="small" label="Email" value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </Grid>
                    <Grid size={6}>
                        <TextField fullWidth size="small" label="Date of Birth" type="date" value={form.dob}
                            onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid size={6}>
                        <FormControl fullWidth size="small"><InputLabel>How did they find you?</InputLabel>
                            <Select label="How did they find you?" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                                {SOURCES.map(s => <MenuItem key={s} value={s}>{s.replace('_', '-').replace(/\b\w/g, c => c.toUpperCase())}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={6}>
                        <FormControl fullWidth size="small"><InputLabel>Occasion Interest</InputLabel>
                            <Select label="Occasion Interest" value={form.occasion} onChange={e => setForm(f => ({ ...f, occasion: e.target.value }))}>
                                {['Birthday', 'Anniversary', 'Baby Shower', 'Farewell', 'Proposal', 'Corporate', 'Other'].map(o => (
                                    <MenuItem key={o} value={o.toLowerCase()}>{o}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={12}>
                        <TextField fullWidth multiline rows={2} size="small" label="Notes"
                            placeholder="Any notes about this customer…"
                            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
                    <Button color="inherit" onClick={() => setForm({ full_name: '', phone: '', email: '', dob: '', source: 'walk_in', occasion: 'birthday', notes: '' })}>
                        Clear
                    </Button>
                    <Button variant="contained" onClick={submit} disabled={saving}>
                        {saving ? 'Adding…' : 'Add customer'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    )
}

// ─── Walk-in Quick Book ───────────────────────────────────────────────────────
function WalkinQuickBook({ hallId }: { hallId: string | null }) {
    const today = format(new Date(), 'yyyy-MM-dd')
    const [form, setForm] = useState({ name: '', phone: '', guests: 15, payment: 'cash', package_id: '', slot_id: '', custom_amount: '' })
    const [slots, setSlots] = useState<SlotObj[]>([])
    const [packages, setPackages] = useState<Package[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState<any>(null)
    const router = useRouter()

    useEffect(() => {
        if (!hallId) return
        api.get(`/slots/?hall_id=${hallId}&date=${today}`)
            .then(r => setSlots(toArray<SlotObj>(r.data).filter(s => s.status !== 'booked')))
            .catch(() => {})
        api.get(`/packages/?hall=${hallId}`)
            .then(r => setPackages(toArray<Package>(r.data)))
            .catch(() => {})
    }, [hallId, today])

    const submit = async () => {
        if (!form.name || !form.phone) { toast.error('Name and phone required'); return }
        if (!form.slot_id) { toast.error('Select a slot'); return }
        setSubmitting(true)
        try {
            const custRes = await api.post('/partner/customers/create/', { full_name: form.name, phone: form.phone, source: 'walk_in' })
            const bookRes = await api.post('/partner/bookings/create/', {
                customer_id: custRes.data.id,
                slot_ids: [form.slot_id],
                package_id: form.package_id || undefined,
                custom_amount: !form.package_id && form.custom_amount ? form.custom_amount : undefined,
                guests: form.guests,
                payment_method: form.payment,
                booking_type: 'walk_in',
            })
            setDone(bookRes.data)
            toast.success(`Booking confirmed! Ref: ${bookRes.data.booking_ref}`)
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Booking failed')
        } finally { setSubmitting(false) }
    }

    if (done) return (
        <Paper elevation={0} sx={{ p: 4, border: '2px solid', borderColor: 'success.main', borderRadius: 3, textAlign: 'center' }}>
            <CheckCircle color="success" sx={{ fontSize: 56, mb: 1 }} />
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Booking Confirmed!</Typography>
            <Typography color="text.secondary" sx={{ mb: 0.5 }}>Ref: <strong>{done.booking_ref}</strong></Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>Total: <strong>₹{Number(done.total_amount).toLocaleString('en-IN')}</strong></Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="outlined" onClick={() => { setDone(null); setForm({ name: '', phone: '', guests: 15, payment: 'cash', package_id: '', slot_id: '', custom_amount: '' }) }}>
                    New booking
                </Button>
                <Button variant="contained" onClick={() => router.push('/partner/bookings')}>View all bookings</Button>
            </Box>
        </Paper>
    )

    return (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Typography fontWeight={800} variant="h6">Quick walk-in booking</Typography>
                <Chip label="Express" size="small" sx={{ bgcolor: '#FFF3E0', color: '#FF6F00', fontWeight: 700 }} />
            </Box>
            <Alert severity="info" sx={{ mb: 3 }}>
                For immediate walk-in customers. Minimum info required — booking confirmed in seconds.
            </Alert>
            <Grid container spacing={2}>
                <Grid size={6}>
                    <TextField fullWidth size="small" label="Customer name *" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </Grid>
                <Grid size={6}>
                    <TextField fullWidth size="small" label="Phone *" value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </Grid>
                <Grid size={6}>
                    <FormControl fullWidth size="small"><InputLabel>{"Today's slot *"}</InputLabel>
                        <Select label="Today's slot *" value={form.slot_id} onChange={e => setForm(f => ({ ...f, slot_id: e.target.value }))}>
                            {slots.length === 0 && <MenuItem value="" disabled>No available slots today</MenuItem>}
                            {slots.map(s => (
                                <MenuItem key={s.id} value={s.id}>{fmt12(s.start_time)} – {fmt12(s.end_time)}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid size={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">Guests</Typography>
                        <IconButton size="small" onClick={() => setForm(f => ({ ...f, guests: Math.max(1, f.guests - 1) }))}
                            sx={{ border: '1px solid', borderColor: 'divider' }}><Remove fontSize="small" /></IconButton>
                        <Typography fontWeight={700} sx={{ minWidth: 28, textAlign: 'center' }}>{form.guests}</Typography>
                        <IconButton size="small" onClick={() => setForm(f => ({ ...f, guests: f.guests + 1 }))}
                            sx={{ border: '1px solid', borderColor: 'divider' }}><Add fontSize="small" /></IconButton>
                    </Box>
                </Grid>
                <Grid size={6}>
                    <FormControl fullWidth size="small"><InputLabel>Package</InputLabel>
                        <Select label="Package" value={form.package_id} onChange={e => setForm(f => ({ ...f, package_id: e.target.value }))}>
                            <MenuItem value="">No package (custom price)</MenuItem>
                            {packages.map(p => (
                                <MenuItem key={p.id} value={p.id}>{p.name} — ₹{Number(p.price).toLocaleString('en-IN')}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid size={6}>
                    {form.package_id ? (
                        <FormControl fullWidth size="small"><InputLabel>Payment</InputLabel>
                            <Select label="Payment" value={form.payment} onChange={e => setForm(f => ({ ...f, payment: e.target.value }))}>
                                {PAYMENT_METHODS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    ) : (
                        <TextField fullWidth size="small" label="Amount (₹)" type="number" value={form.custom_amount}
                            onChange={e => setForm(f => ({ ...f, custom_amount: e.target.value }))} />
                    )}
                </Grid>
                {!form.package_id && (
                    <Grid size={6}>
                        <FormControl fullWidth size="small"><InputLabel>Payment</InputLabel>
                            <Select label="Payment" value={form.payment} onChange={e => setForm(f => ({ ...f, payment: e.target.value }))}>
                                {PAYMENT_METHODS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                )}
                <Grid size={12}>
                    <Button fullWidth variant="contained" size="large" startIcon={<FlashOn />}
                        onClick={submit} disabled={submitting}
                        sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}>
                        {submitting ? 'Confirming…' : 'Book now — generate QR instantly'}
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreateBookingPage() {
    const theme = useTheme()
    const router = useRouter()
    const [tab, setTab] = useState(0)
    const [step, setStep] = useState(0)
    const [hallId, setHallId] = useState<string | null>(null)
    const [extraGuestFee, setExtraGuestFee] = useState(500)

    const [customer, setCustomer] = useState<Customer | null>(null)
    const [date, setDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
    const [guests, setGuests] = useState(15)
    const [selectedSlots, setSelectedSlots] = useState<SlotObj[]>([])
    const [selectedPkg, setSelectedPkg] = useState<Package | null>(null)
    const [customAmount, setCustomAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [submitting, setSubmitting] = useState(false)
    const [confirmed, setConfirmed] = useState<any>(null)

    useEffect(() => {
        api.get('/halls/?my=true').then(r => {
            const hall = r.data?.results?.[0] || r.data?.[0]
            if (hall) { setHallId(hall.id); setExtraGuestFee(Number(hall.extra_guest_fee) || 500) }
        }).catch(() => {})
    }, [])

    const canNext = () => {
        if (step === 0) return !!customer
        if (step === 1) return selectedSlots.length > 0 && !!date
        if (step === 2) return !!selectedPkg || !!customAmount
        return true
    }

    const submitBooking = async () => {
        setSubmitting(true)
        try {
            const res = await api.post('/partner/bookings/create/', {
                customer_id: customer!.id,
                slot_ids: selectedSlots.map(s => s.id),
                package_id: selectedPkg?.id,
                custom_amount: !selectedPkg && customAmount ? customAmount : undefined,
                guests,
                payment_method: paymentMethod,
                special_notes: notes,
                booking_type: 'partner_created',
            })
            setConfirmed(res.data)
            toast.success(`Booking confirmed! Ref: ${res.data.booking_ref}`)
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Booking failed')
        } finally { setSubmitting(false) }
    }

    const stepIcons = [<Person key="p" />, <CalendarMonth key="c" />, <Inventory2 key="i" />, <Receipt key="r" />]

    if (confirmed) return (
        <Box sx={{ maxWidth: 640, mx: 'auto', mt: 8, p: 3, textAlign: 'center' }}>
            <Paper elevation={0} sx={{ p: 5, border: '2px solid', borderColor: 'success.main', borderRadius: 3 }}>
                <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>Booking Confirmed!</Typography>
                <Typography color="text.secondary" variant="h6" sx={{ mb: 0.5 }}>Ref: <strong>{confirmed.booking_ref}</strong></Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Customer: <strong>{confirmed.customer_name}</strong> · Total: <strong>₹{Number(confirmed.total_amount).toLocaleString('en-IN')}</strong>
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button variant="outlined" onClick={() => {
                        setConfirmed(null); setStep(0); setCustomer(null)
                        setSelectedSlots([]); setSelectedPkg(null); setCustomAmount(''); setNotes('')
                    }}>New booking</Button>
                    <Button variant="contained" onClick={() => router.push('/partner/bookings')}>View bookings</Button>
                </Box>
            </Paper>
        </Box>
    )

    return (
        <Box sx={{ maxWidth: 780, mx: 'auto', pb: 8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <IconButton onClick={() => router.back()} size="small"><ArrowBack /></IconButton>
                <Typography variant="h5" fontWeight={800}>Partner Booking</Typography>
            </Box>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3, overflow: 'hidden' }}>
                <Tabs value={tab} onChange={(_, v) => { setTab(v); setStep(0) }} variant="fullWidth"
                    TabIndicatorProps={{ style: { height: 3, borderRadius: 2 } }}>
                    <Tab icon={<Receipt fontSize="small" />} iconPosition="start" label="Create Booking"
                        sx={{ textTransform: 'none', fontWeight: 700, py: 1.5 }} />
                    <Tab icon={<PersonAdd fontSize="small" />} iconPosition="start" label="Add Customer"
                        sx={{ textTransform: 'none', fontWeight: 700, py: 1.5 }} />
                    <Tab icon={<FlashOn fontSize="small" />} iconPosition="start" label="Walk-in Quick Book"
                        sx={{ textTransform: 'none', fontWeight: 700, py: 1.5 }} />
                </Tabs>
            </Paper>

            {tab === 0 && (
                <>
                    <Stepper activeStep={step} sx={{ mb: 3 }}>
                        {STEP_LABELS.map((label, i) => (
                            <Step key={label} completed={i < step}>
                                <StepLabel StepIconComponent={({ active, completed }) => (
                                    <Box sx={{
                                        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        bgcolor: completed ? 'success.main' : active ? 'primary.main' : alpha(theme.palette.text.secondary, 0.15),
                                        color: (completed || active) ? 'white' : 'text.secondary',
                                        fontSize: 13, fontWeight: 700, transition: 'all .2s',
                                    }}>
                                        {completed ? <CheckCircle sx={{ fontSize: 18 }} /> : stepIcons[i]}
                                    </Box>
                                )}>
                                    <Typography variant="caption" fontWeight={step === i ? 700 : 400}
                                        color={step === i ? 'primary.main' : 'text.secondary'}>{label}</Typography>
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
                        {step === 0 && <CustomerStep selected={customer} onSelect={setCustomer} />}
                        {step === 1 && <DateSlotStep hallId={hallId} date={date} setDate={setDate} guests={guests} setGuests={setGuests} selectedSlots={selectedSlots} setSelectedSlots={setSelectedSlots} />}
                        {step === 2 && <PackageStep hallId={hallId} selectedPkg={selectedPkg} setSelectedPkg={setSelectedPkg} customAmount={customAmount} setCustomAmount={setCustomAmount} notes={notes} setNotes={setNotes} />}
                        {step === 3 && <ConfirmStep customer={customer} date={date} selectedSlots={[...selectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time))} selectedPkg={selectedPkg} guests={guests} customAmount={customAmount} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} extraGuestFee={extraGuestFee} />}
                    </Paper>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button startIcon={<ArrowBack />} onClick={() => setStep(s => s - 1)} disabled={step === 0} color="inherit">
                            Back
                        </Button>
                        {step < 3 ? (
                            <Button variant="contained" endIcon={<ArrowForward />} onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                                sx={{ px: 4, borderRadius: 2 }}>
                                Continue
                            </Button>
                        ) : (
                            <Button variant="contained" color="success" onClick={submitBooking} disabled={submitting}
                                sx={{ px: 4, borderRadius: 2, fontWeight: 700 }}>
                                {submitting ? 'Confirming…' : 'Confirm booking'}
                            </Button>
                        )}
                    </Box>
                </>
            )}

            {tab === 1 && <AddCustomerTab />}
            {tab === 2 && <WalkinQuickBook hallId={hallId} />}
        </Box>
    )
}
