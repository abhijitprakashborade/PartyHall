'use client'

import { useState, useEffect } from 'react'
import {
    Box, Card, CardContent, Typography, Button, Chip, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Tooltip,
    IconButton, alpha, useTheme, ToggleButton, ToggleButtonGroup, Divider,
    Grid,
} from '@mui/material'
import {
    CardMembership, Add, Block, CheckCircle, Refresh, Person,
    CalendarMonth, Timer, BoltOutlined, Edit,
} from '@mui/icons-material'

import api from '@/lib/api'
import { toast } from 'sonner'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'

interface PaymentHistory {
    id: string
    partner_name: string
    plan_name: string
    recorded_by_name: string
    amount: number | string
    method: string
    source: string
    reference_id: string
    payment_date: string
    valid_from: string | null
    valid_until: string | null
    notes: string
    created_at: string
}

interface PartnerSub {
    id: string | null
    partner_id: string
    partner_name: string
    partner_email: string
    plan_id: string | null
    status: string
    expires_at: string | null
    is_trial: boolean
}

interface Plan {
    slug: string
    name: string
    price: number | string
    default_duration_days?: number
}

const STATUS_CHIP: Record<string, { color: 'success' | 'warning' | 'error' | 'default' | 'info', label: string }> = {
    active:  { color: 'success', label: 'Active' },
    trial:   { color: 'info',    label: 'Trial' },
    grace_period: { color: 'warning', label: 'Grace Period' },
    expired: { color: 'error', label: 'Expired' },
    cancelled: { color: 'error', label: 'Cancelled' },
    none:    { color: 'default', label: 'No Plan' },
}



const METHOD_COLORS: Record<string, string> = {
    cash: '#22c55e',
    upi: '#9333ea',
    bank_transfer: '#2563eb',
    cheque: '#ca8a04',
    online: '#0891b2',
}

export default function AdminSubscriptionsPage() {
    const theme = useTheme()
    const [data, setData] = useState<PartnerSub[]>([])
    const [plans, setPlans] = useState<Plan[]>([])
    const [payments, setPayments] = useState<PaymentHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [grantDialog, setGrantDialog] = useState(false)
    const [paymentDialog, setPaymentDialog] = useState(false)
    const [selected, setSelected] = useState<PartnerSub | null>(null)
    
    // UI State for Grant Dialog
    const [expiryMode, setExpiryMode] = useState<'date' | 'days' | 'preset'>('date')
    const [form, setForm] = useState({ 
        plan_id: '', 
        expires_at: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        fixed_time: '23:59',
        duration_days: '30'
    })

    // UI State for Payment Dialog
    const [payForm, setPayForm] = useState({
        amount: '',
        method: 'cash',
        reference_id: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        valid_from: format(new Date(), 'yyyy-MM-dd'),
        valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        notes: ''
    })
    
    const [saving, setSaving] = useState(false)
    const [revoking, setRevoking] = useState<string | null>(null)

    // Edit Trial dialog
    const [editTrialDialog, setEditTrialDialog] = useState(false)
    const [editTrialMode, setEditTrialMode] = useState<'hours' | 'extend' | 'exact' | 'reset'>('hours')
    const [editTrialForm, setEditTrialForm] = useState({
        trial_hours: '1',
        trial_unit: 'hours' as 'hours' | 'minutes',
        extend_hours: '1',
        extend_unit: 'hours' as 'hours' | 'minutes',
        expires_at: format(new Date(), "yyyy-MM-dd") + 'T23:59',
    })
    const [editTrialSaving, setEditTrialSaving] = useState(false)

    const openEditTrial = (sub: PartnerSub) => {
        setSelected(sub)
        setEditTrialMode('hours')
        setEditTrialForm({
            trial_hours: '1',
            trial_unit: 'hours',
            extend_hours: '1',
            extend_unit: 'hours',
            expires_at: format(addDays(new Date(), 1), "yyyy-MM-dd") + 'T23:59',
        })
        setEditTrialDialog(true)
    }

    const handleEditTrial = async () => {
        if (!selected) return
        setEditTrialSaving(true)
        try {
            const toHours = (val: string, unit: 'hours' | 'minutes') =>
                unit === 'minutes' ? parseFloat(val) / 60 : parseFloat(val)
            const payload: any = { partner_id: selected.partner_id }
            if (editTrialMode === 'hours') payload.trial_hours = toHours(editTrialForm.trial_hours, editTrialForm.trial_unit)
            else if (editTrialMode === 'extend') payload.extend_hours = toHours(editTrialForm.extend_hours, editTrialForm.extend_unit)
            else if (editTrialMode === 'exact') payload.expires_at = editTrialForm.expires_at + ':00+05:30'
            else if (editTrialMode === 'reset') payload.reset_trial = true
            await api.patch('/admin/subscriptions/', payload)
            toast.success(`Trial updated for ${selected.partner_name}`)
            setEditTrialDialog(false)
            load()
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update trial')
        } finally {
            setEditTrialSaving(false)
        }
    }

    const load = async () => {
        setLoading(true)
        try {
            const [subRes, plansRes, payRes] = await Promise.all([
                api.get('/admin/subscriptions/'),
                api.get('/subscription-plans/'),
                api.get('/admin/subscription-payments/'),
            ])
            setData(Array.isArray(subRes.data) ? subRes.data : [])
            setPlans(Array.isArray(plansRes.data) ? plansRes.data : [])
            setPayments(Array.isArray(payRes.data) ? payRes.data : [])
        } catch {
            try {
                const plansRes = await api.get('/subscriptions/plans/')
                setPlans(Array.isArray(plansRes.data) ? plansRes.data : [])
            } catch {}
            toast.error('Failed to load subscriptions')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const openGrant = (sub: PartnerSub) => {
        const defaultPlan = sub.plan_id || plans[0]?.slug || 'starter'
        const planObj = plans.find(p => p.slug === defaultPlan)
        const duration = planObj?.default_duration_days || 30
        const defaultExpiry = format(addDays(new Date(), duration), 'yyyy-MM-dd')
        
        setSelected(sub)
        setForm({ 
            plan_id: defaultPlan, 
            expires_at: defaultExpiry,
            fixed_time: '23:59',
            duration_days: duration.toString()
        })
        setExpiryMode('date')
        setGrantDialog(true)
    }

    const openPayment = (sub: PartnerSub) => {
        const plan = plans.find(p => p.slug === sub.plan_id) || plans[0]
        setSelected(sub)
        setPayForm({
            amount: plan?.price?.toString() || '',
            method: 'cash',
            reference_id: '',
            payment_date: format(new Date(), 'yyyy-MM-dd'),
            valid_from: format(new Date(), 'yyyy-MM-dd'),
            valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
            notes: `Renewal for ${plan?.name || 'Subscription'}`
        })
        setPaymentDialog(true)
    }

    const handlePlanChange = (planId: string) => {
        const plan = plans.find(p => p.slug === planId)
        if (plan?.default_duration_days) {
            const expiry = addDays(new Date(), plan.default_duration_days)
            setForm(f => ({ 
                ...f, 
                plan_id: planId,
                expires_at: format(expiry, 'yyyy-MM-dd'),
                duration_days: plan.default_duration_days?.toString() || '30'
            }))
        } else {
            setForm(f => ({ ...f, plan_id: planId }))
        }
    }

    // Update form when mode or inputs change
    const updateExpiryFromDays = (days: string) => {
        const d = parseInt(days) || 0
        setForm(f => ({ ...f, duration_days: days, expires_at: format(addDays(new Date(), d), 'yyyy-MM-dd') }))
    }

    const handleGrant = async () => {
        if (!selected) return
        setSaving(true)
        try {
            // Ensure we send full ISO string with timezone offset
            const isoString = `${form.expires_at}T${form.fixed_time}:00+05:30`

            await api.post('/admin/subscriptions/', {
                partner_id: selected.partner_id,
                plan_id: form.plan_id,
                expires_at: isoString,
            })
            toast.success(`✅ ${form.plan_id} plan granted to ${selected.partner_name}`)
            setGrantDialog(false)
            load()
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to grant plan')
        } finally {
            setSaving(false)
        }
    }

    const handleRecordPayment = async () => {
        if (!selected) return
        setSaving(true)
        try {
            await api.post('/admin/subscription-payments/', {
                subscription: selected.id,
                partner: selected.partner_id,
                ...payForm,
                valid_from: `${payForm.valid_from}T00:00:00+05:30`,
                valid_until: `${payForm.valid_until}T23:59:00+05:30`,
            })
            toast.success('Payment recorded successfully')
            setPaymentDialog(false)
            load()
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to record payment')
        } finally {
            setSaving(false)
        }
    }

    const handleRevoke = async (sub: PartnerSub) => {
        if (!sub.id) return
        if (!confirm(`Revoke ${sub.plan_id} plan from ${sub.partner_name}?`)) return
        setRevoking(sub.partner_id)
        try {
            await api.delete('/admin/subscriptions/', { data: { partner_id: sub.partner_id } })
            toast.success(`Revoked subscription for ${sub.partner_name}`)
            load()
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to revoke')
        } finally {
            setRevoking(null)
        }
    }

    const stats = {
        active: data.filter(d => d.status === 'active').length,
        none:   data.filter(d => d.status === 'none').length,
        total:  data.length,
        offline: payments.filter(p => p.source === 'offline').length,
        online: payments.filter(p => p.source === 'online').length,
        revenue: payments.reduce((acc, p) => acc + Number(p.amount), 0)
    }

    // Helper for summary calculation
    const summary = (() => {
        const today = new Date()
        const expiry = parseISO(`${form.expires_at}T${form.fixed_time}:00`)
        const days = differenceInDays(expiry, today)
        const months = Math.round(days / 30)
        const selectedPlan = plans.find(p => p.slug === form.plan_id)
        return {
            days,
            months,
            planName: selectedPlan?.name || 'Starter',
            expiryFormatted: format(expiry, 'dd MMM yyyy, hh:mm a'),
            startFormatted: format(today, 'dd MMM yyyy'),
            iso: `${form.expires_at}T${form.fixed_time}:00+05:30`
        }
    })()

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800}>Subscriptions</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage partner subscription plans — grant or revoke access
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <span>
                        <IconButton onClick={load} size="small" disabled={loading}>
                            <Refresh sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {/* Stats row */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Partners', value: stats.total, color: '#818cf8', icon: <Person /> },
                    { label: 'Active Plans', value: stats.active, color: '#22c55e', icon: <CheckCircle /> },
                    { label: 'Monthly Revenue', value: `₹${stats.revenue.toLocaleString('en-IN')}`, color: '#0891b2', icon: <CardMembership /> },
                    { label: 'Offline Collected', value: stats.offline, color: '#9333ea', icon: <BoltOutlined /> },
                ].map(s => (
                    <Card key={s.label} elevation={0} sx={{
                        border: '1px solid', borderColor: 'divider', borderRadius: 2,
                        flex: '1 1 200px', minWidth: 160,
                    }}>
                        <CardContent sx={{ py: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ 
                                bgcolor: alpha(s.color, 0.1), color: s.color, 
                                p: 1, borderRadius: 1.5, display: 'flex' 
                            }}>
                                {s.icon}
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight={800}>{s.value}</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Partners Table */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 4 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                    <Typography variant="subtitle2" fontWeight={700}>Partner Subscriptions</Typography>
                </Box>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                <TableCell sx={{ fontWeight: 700 }}>Partner</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Plan</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Expires</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map(sub => (
                                <TableRow key={sub.partner_id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Person sx={{ color: 'text.disabled', fontSize: 18 }} />
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>{sub.partner_name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{sub.partner_email}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {sub.plan_id ? (
                                            <Chip
                                                icon={<CardMembership />}
                                                label={sub.plan_id.charAt(0).toUpperCase() + sub.plan_id.slice(1)}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">—</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={STATUS_CHIP[sub.status]?.label || sub.status}
                                            color={STATUS_CHIP[sub.status]?.color || 'default'}
                                            size="small"
                                        />
                                        {sub.is_trial && (
                                            <Chip label="TRIAL" size="small" color="info" variant="outlined"
                                                sx={{ ml: 0.5, height: 16, fontSize: '0.6rem', fontWeight: 700 }} />
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        {sub.expires_at ? (
                                            <Typography variant="caption">
                                                {format(parseISO(sub.expires_at), 'dd MMM yyyy')}
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">—</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            <Button
                                                size="small" variant="outlined" color="info"
                                                startIcon={<Edit />}
                                                onClick={() => openEditTrial(sub)}
                                                sx={{ fontSize: 11 }}
                                            >
                                                Edit Trial
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="success"
                                                startIcon={<Add />}
                                                onClick={() => openPayment(sub)}
                                                sx={{ fontSize: 11 }}
                                                disabled={!sub.id}
                                            >
                                                Record Payment
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<BoltOutlined />}
                                                onClick={() => openGrant(sub)}
                                                sx={{ fontSize: 11 }}
                                            >
                                                {sub.id ? 'Change Plan' : 'Grant Plan'}
                                            </Button>
                                            {sub.id && (sub.status === 'active' || sub.status === 'expired') && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    startIcon={<Block />}
                                                    onClick={() => handleRevoke(sub)}
                                                    disabled={revoking === sub.partner_id}
                                                    sx={{ fontSize: 11 }}
                                                >
                                                    Revoke
                                                </Button>
                                            )}
                                        </Box>

                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Payment History Table */}
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Payment History</Typography>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.05) }}>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Partner</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Validity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body2" color="text.disabled">No payment records found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map(pay => (
                                <TableRow key={pay.id} hover>
                                    <TableCell>
                                        <Typography variant="body2">{format(new Date(pay.payment_date), 'dd MMM yyyy')}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>{pay.partner_name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{pay.plan_name}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={700}>₹{Number(pay.amount).toLocaleString('en-IN')}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={pay.method.toUpperCase()} 
                                            size="small" 
                                            sx={{ 
                                                bgcolor: alpha(METHOD_COLORS[pay.method] || '#999', 0.1),
                                                color: METHOD_COLORS[pay.method] || '#999',
                                                fontWeight: 700,
                                                fontSize: 10
                                            }} 
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{pay.reference_id || '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {pay.valid_until ? (
                                            <Typography variant="caption">
                                                Until {format(parseISO(pay.valid_until), 'dd MMM yyyy')}
                                            </Typography>
                                        ) : '—'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Edit Trial Dialog */}
            <Dialog open={editTrialDialog} onClose={() => setEditTrialDialog(false)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle component="div">
                    <Typography variant="h6" fontWeight={800}>✏️ Edit Trial / Subscription</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Partner: <strong>{selected?.partner_name}</strong> — {selected?.partner_email}
                        {selected?.expires_at && (
                            <> — Current expiry: <strong>{format(parseISO(selected.expires_at), 'dd MMM yyyy HH:mm')}</strong></>
                        )}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        <ToggleButtonGroup value={editTrialMode} exclusive onChange={(_, v) => v && setEditTrialMode(v)} fullWidth size="small">
                            <ToggleButton value="hours" sx={{ textTransform: 'none', py: 1.2, flexDirection: 'column', gap: 0.3 }}>
                                <Timer fontSize="small" />
                                <Typography variant="caption" fontWeight={700}>Fresh trial</Typography>
                            </ToggleButton>
                            <ToggleButton value="extend" sx={{ textTransform: 'none', py: 1.2, flexDirection: 'column', gap: 0.3 }}>
                                <BoltOutlined fontSize="small" />
                                <Typography variant="caption" fontWeight={700}>Extend by hours</Typography>
                            </ToggleButton>
                            <ToggleButton value="exact" sx={{ textTransform: 'none', py: 1.2, flexDirection: 'column', gap: 0.3 }}>
                                <CalendarMonth fontSize="small" />
                                <Typography variant="caption" fontWeight={700}>Set exact expiry</Typography>
                            </ToggleButton>
                            <ToggleButton value="reset" sx={{ textTransform: 'none', py: 1.2, flexDirection: 'column', gap: 0.3 }}>
                                <Refresh fontSize="small" />
                                <Typography variant="caption" fontWeight={700}>Reset trial</Typography>
                            </ToggleButton>
                        </ToggleButtonGroup>

                        {editTrialMode === 'hours' && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Start a fresh trial from <strong>now</strong>. Resets the trial clock.
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                                    <ToggleButtonGroup
                                        value={editTrialForm.trial_unit} exclusive size="small"
                                        onChange={(_, v) => v && setEditTrialForm(f => ({ ...f, trial_unit: v, trial_hours: '' }))}
                                    >
                                        <ToggleButton value="minutes" sx={{ textTransform: 'none', px: 2, fontWeight: 700 }}>Minutes</ToggleButton>
                                        <ToggleButton value="hours" sx={{ textTransform: 'none', px: 2, fontWeight: 700 }}>Hours</ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                                <TextField fullWidth size="small"
                                    label={`Trial Duration (${editTrialForm.trial_unit})`} type="number"
                                    value={editTrialForm.trial_hours}
                                    onChange={e => setEditTrialForm(f => ({ ...f, trial_hours: e.target.value }))}
                                    inputProps={{ min: 1, step: editTrialForm.trial_unit === 'minutes' ? 5 : 0.5 }}
                                    helperText={editTrialForm.trial_unit === 'minutes'
                                        ? 'e.g. 30 = 30 min, 60 = 1 hour, 90 = 1.5 hours'
                                        : 'e.g. 1 = 1 hour, 24 = 1 day, 168 = 1 week'} />
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    {editTrialForm.trial_unit === 'minutes'
                                        ? [5, 10, 15, 30, 45, 60, 90, 120].map(m => (
                                            <Chip key={m} label={`${m}m`} size="small"
                                                onClick={() => setEditTrialForm(f => ({ ...f, trial_hours: String(m) }))}
                                                color={editTrialForm.trial_hours === String(m) ? 'primary' : 'default'}
                                                variant={editTrialForm.trial_hours === String(m) ? 'filled' : 'outlined'}
                                                sx={{ cursor: 'pointer' }} />
                                        ))
                                        : [1, 2, 4, 8, 24, 48, 72, 168].map(h => (
                                            <Chip key={h} label={h < 24 ? `${h}h` : `${h/24}d`} size="small"
                                                onClick={() => setEditTrialForm(f => ({ ...f, trial_hours: String(h) }))}
                                                color={editTrialForm.trial_hours === String(h) ? 'primary' : 'default'}
                                                variant={editTrialForm.trial_hours === String(h) ? 'filled' : 'outlined'}
                                                sx={{ cursor: 'pointer' }} />
                                        ))
                                    }
                                </Box>
                            </Box>
                        )}

                        {editTrialMode === 'extend' && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Extend from the <strong>current expiry</strong> (or now if expired). Adds time without resetting.
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                                    <ToggleButtonGroup
                                        value={editTrialForm.extend_unit} exclusive size="small"
                                        onChange={(_, v) => v && setEditTrialForm(f => ({ ...f, extend_unit: v, extend_hours: '' }))}
                                    >
                                        <ToggleButton value="minutes" sx={{ textTransform: 'none', px: 2, fontWeight: 700 }}>Minutes</ToggleButton>
                                        <ToggleButton value="hours" sx={{ textTransform: 'none', px: 2, fontWeight: 700 }}>Hours</ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                                <TextField fullWidth size="small"
                                    label={`Extend by (${editTrialForm.extend_unit})`} type="number"
                                    value={editTrialForm.extend_hours}
                                    onChange={e => setEditTrialForm(f => ({ ...f, extend_hours: e.target.value }))}
                                    inputProps={{ min: 1, step: editTrialForm.extend_unit === 'minutes' ? 5 : 0.5 }} />
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    {editTrialForm.extend_unit === 'minutes'
                                        ? [5, 10, 15, 30, 45, 60].map(m => (
                                            <Chip key={m} label={`+${m}m`} size="small"
                                                onClick={() => setEditTrialForm(f => ({ ...f, extend_hours: String(m) }))}
                                                color={editTrialForm.extend_hours === String(m) ? 'primary' : 'default'}
                                                variant={editTrialForm.extend_hours === String(m) ? 'filled' : 'outlined'}
                                                sx={{ cursor: 'pointer' }} />
                                        ))
                                        : [1, 2, 4, 8, 24, 72].map(h => (
                                            <Chip key={h} label={`+${h}h`} size="small"
                                                onClick={() => setEditTrialForm(f => ({ ...f, extend_hours: String(h) }))}
                                                color={editTrialForm.extend_hours === String(h) ? 'primary' : 'default'}
                                                variant={editTrialForm.extend_hours === String(h) ? 'filled' : 'outlined'}
                                                sx={{ cursor: 'pointer' }} />
                                        ))
                                    }
                                </Box>
                            </Box>
                        )}

                        {editTrialMode === 'exact' && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Set the exact date and time the trial or subscription expires.
                                </Typography>
                                <TextField fullWidth size="small" label="Expiry date & time" type="datetime-local"
                                    value={editTrialForm.expires_at}
                                    onChange={e => setEditTrialForm(f => ({ ...f, expires_at: e.target.value }))}
                                    InputLabelProps={{ shrink: true }} />
                            </Box>
                        )}

                        {editTrialMode === 'reset' && (
                            <Box sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.light', p: 2, borderRadius: 2 }}>
                                <Typography variant="body2" fontWeight={700} color="warning.dark">⚠️ Reset Trial</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    This will reset <strong>trial_used = false</strong> and give the partner a fresh 1-hour trial starting now.
                                    Use this if the partner accidentally used their trial, or as a goodwill gesture.
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setEditTrialDialog(false)}>Cancel</Button>
                    <Button variant="contained" color="info" onClick={handleEditTrial} disabled={editTrialSaving}
                        sx={{ px: 4, borderRadius: 2, fontWeight: 700 }}>
                        {editTrialSaving ? 'Saving…' : 'Apply Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Record Payment Dialog */}
            <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle component="div">
                    <Typography variant="h6" fontWeight={800}>Record Payment</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Partner: {selected?.partner_name} — {selected?.plan_id?.toUpperCase()} Plan
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        <Box>
                            <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: 'block' }}>PAYMENT METHOD</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {['cash', 'upi', 'bank_transfer', 'cheque'].map(m => (
                                    <Chip
                                        key={m}
                                        label={m.replace('_', ' ').toUpperCase()}
                                        onClick={() => setPayForm(f => ({ ...f, method: m }))}
                                        sx={{ 
                                            borderRadius: 1.5,
                                            fontWeight: 700,
                                            bgcolor: payForm.method === m ? METHOD_COLORS[m] : alpha(theme.palette.divider, 0.1),
                                            color: payForm.method === m ? '#fff' : 'text.primary',
                                            '&:hover': { bgcolor: payForm.method === m ? METHOD_COLORS[m] : alpha(theme.palette.divider, 0.2) }
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <TextField
                                    fullWidth size="small" label="Amount (₹)"
                                    type="number" value={payForm.amount}
                                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                                />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <TextField
                                    fullWidth size="small" label="Reference / TXN ID"
                                    value={payForm.reference_id}
                                    onChange={e => setPayForm(f => ({ ...f, reference_id: e.target.value }))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth size="small" label="Payment Date"
                                    type="date" value={payForm.payment_date}
                                    onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>

                        <Box>
                            <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: 'block', color: 'primary.main' }}>
                                SUBSCRIPTION VALIDITY EXTENSION
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        fullWidth size="small" label="Valid From"
                                        type="date" value={payForm.valid_from}
                                        onChange={e => setPayForm(f => ({ ...f, valid_from: e.target.value }))}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        fullWidth size="small" label="Valid Until"
                                        type="date" value={payForm.valid_until}
                                        onChange={e => setPayForm(f => ({ ...f, valid_until: e.target.value }))}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                            </Grid>
                        </Box>

                        <TextField
                            fullWidth multiline rows={2} size="small" label="Internal Notes"
                            value={payForm.notes}
                            onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                        />

                        <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.05), p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'success.main' }}>
                            <Typography variant="body2" fontWeight={700} color="success.main" gutterBottom>Summary</Typography>
                            <Typography variant="caption" display="block">
                                • Method: <strong>{payForm.method.toUpperCase()}</strong>
                            </Typography>
                            <Typography variant="caption" display="block">
                                • Amount: <strong>₹{Number(payForm.amount).toLocaleString('en-IN')}</strong>
                            </Typography>
                            <Typography variant="caption" display="block">
                                • Extension: <strong>{format(new Date(payForm.valid_from), 'dd MMM')} to {format(new Date(payForm.valid_until), 'dd MMM yyyy')}</strong>
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleRecordPayment}
                        disabled={saving || !payForm.amount}
                        sx={{ px: 4, borderRadius: 2, fontWeight: 700 }}
                    >
                        {saving ? 'Recording...' : 'Complete & Extend'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Grant Dialog */}
            <Dialog open={grantDialog} onClose={() => setGrantDialog(false)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ pb: 1 }} component="div">
                    <Typography variant="h6" fontWeight={800} component="span">Grant Subscription — {selected?.partner_name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                        {selected?.partner_email}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                        <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                                Plan
                            </Typography>
                            <TextField
                                select fullWidth size="small"
                                value={form.plan_id}
                                onChange={e => handlePlanChange(e.target.value)}
                            >
                                {plans.map(p => (
                                    <MenuItem key={p.slug} value={p.slug}>
                                        {p.name} — ₹{Number(p.price).toLocaleString('en-IN')}/mo
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                                Expiry Mode
                            </Typography>
                            <ToggleButtonGroup
                                value={expiryMode}
                                exclusive
                                onChange={(_, val) => val && setExpiryMode(val)}
                                fullWidth
                                size="small"
                                sx={{ mb: 2 }}
                            >
                                <ToggleButton value="date" sx={{ textTransform: 'none', py: 1.5 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <CalendarMonth fontSize="small" />
                                        <Typography variant="caption" fontWeight={600}>Pick exact date</Typography>
                                    </Box>
                                </ToggleButton>
                                <ToggleButton value="days" sx={{ textTransform: 'none', py: 1.5 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Timer fontSize="small" />
                                        <Typography variant="caption" fontWeight={600}>Enter days</Typography>
                                    </Box>
                                </ToggleButton>
                                <ToggleButton value="preset" sx={{ textTransform: 'none', py: 1.5 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <BoltOutlined fontSize="small" />
                                        <Typography variant="caption" fontWeight={600}>Quick preset</Typography>
                                    </Box>
                                </ToggleButton>
                            </ToggleButtonGroup>

                            {expiryMode === 'date' && (
                                <Grid container spacing={1.5}>
                                    <Grid size={{ xs: 7 }}>
                                        <TextField
                                            fullWidth size="small" label="Expiry date"
                                            type="date" value={form.expires_at}
                                            onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 5 }}>
                                        <TextField
                                            fullWidth size="small" label="Expiry time"
                                            type="time" value={form.fixed_time}
                                            onChange={e => setForm(f => ({ ...f, fixed_time: e.target.value }))}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                </Grid>
                            )}

                            {expiryMode === 'days' && (
                                <TextField
                                    fullWidth size="small" label="Duration (days)"
                                    type="number" value={form.duration_days}
                                    onChange={e => updateExpiryFromDays(e.target.value)}
                                />
                            )}

                            {expiryMode === 'preset' && (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {[
                                        { label: '30 Days', val: 30 },
                                        { label: '3 Months', val: 90 },
                                        { label: '6 Months', val: 180 },
                                        { label: '1 Year', val: 365 },
                                    ].map(p => (
                                        <Button
                                            key={p.val}
                                            variant="outlined"
                                            size="small"
                                            onClick={() => updateExpiryFromDays(p.val.toString())}
                                            sx={{ borderRadius: 10, px: 2, fontSize: 12 }}
                                        >
                                            {p.label}
                                        </Button>
                                    ))}
                                </Box>
                            )}

                            <Typography variant="caption" color="success.main" fontWeight={600} sx={{ mt: 1, display: 'block' }}>
                                {summary.days} days from today ({summary.months} months)
                            </Typography>
                        </Box>

                        <Divider />

                        {/* Summary Card */}
                        <Box sx={{ bgcolor: alpha(theme.palette.text.primary, 0.03), p: 2, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">Partner</Typography>
                                <Typography variant="caption" fontWeight={700}>{selected?.partner_name} ({selected?.partner_email})</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">Plan</Typography>
                                <Typography variant="caption" fontWeight={700}>{summary.planName}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">Starts</Typography>
                                <Typography variant="caption" fontWeight={700}>{summary.startFormatted} (today)</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">Expires</Typography>
                                <Typography variant="caption" fontWeight={700}>{summary.expiryFormatted}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary">Duration</Typography>
                                <Typography variant="caption" fontWeight={700}>{summary.days} days ({summary.months} mo)</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary">Exact ISO</Typography>
                                <Typography variant="caption" fontWeight={700} sx={{ fontSize: 10 }}>{summary.iso}</Typography>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setGrantDialog(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleGrant}
                        disabled={saving}
                        sx={{ 
                            px: 4, 
                            py: 1.2, 
                            borderRadius: 2, 
                            textTransform: 'none', 
                            fontWeight: 700,
                            boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)'
                        }}
                    >
                        {saving ? 'Granting…' : 'Grant Plan'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
