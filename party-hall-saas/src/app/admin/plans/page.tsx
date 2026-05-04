'use client'

import { useState, useEffect } from 'react'
import {
    Box, Card, CardContent, Typography, Button, Chip, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Tooltip,
    IconButton, alpha, useTheme, Switch, FormControlLabel, Divider, ToggleButton, ToggleButtonGroup,
    Grid,
} from '@mui/material'
import {
    Add, Edit, Delete, Refresh, CheckCircle, Save, 
    CardMembership, Analytics, Store
} from '@mui/icons-material'
import api from '@/lib/api'
import { toast } from 'sonner'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'

interface SubscriptionPlan {
    id: string
    name: string
    slug: string
    price: number | string
    hall_limit: number
    has_advanced_analytics: boolean
    features: string[]
    default_duration_days: number | null
    fixed_expiry_date: string | null
}

export default function AdminPlansPage() {
    const theme = useTheme()
    const [plans, setPlans] = useState<SubscriptionPlan[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
    const [form, setForm] = useState<Partial<SubscriptionPlan>>({
        name: '',
        slug: '',
        price: 0,
        hall_limit: 1,
        has_advanced_analytics: false,
        features: [],
        default_duration_days: null,
        fixed_expiry_date: null,
    })
    const [validityMode, setValidityMode] = useState<'preset' | 'months' | 'date'>('preset')
    const [durationMonths, setDurationMonths] = useState(1)
    const [fixedDate, setFixedDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
    const [fixedTime, setFixedTime] = useState('23:59')
    const [useDefaultDuration, setUseDefaultDuration] = useState(false)
    const [saving, setSaving] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/subscription-plans/')
            // Handle both array and paginated responses
            if (Array.isArray(res.data)) {
                setPlans(res.data)
            } else if (res.data && Array.isArray(res.data.results)) {
                setPlans(res.data.results)
            } else {
                setPlans([])
            }
        } catch {
            toast.error('Failed to load plans')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const handleOpen = (plan?: SubscriptionPlan) => {
        if (plan) {
            setSelectedPlan(plan)
            setForm({ ...plan })
            setUseDefaultDuration(!!plan.default_duration_days)
            if (plan.fixed_expiry_date) {
                const dateObj = parseISO(plan.fixed_expiry_date)
                setFixedDate(format(dateObj, 'yyyy-MM-dd'))
                setFixedTime(format(dateObj, 'HH:mm'))
                setValidityMode('date')
            } else if (plan.default_duration_days) {
                setDurationMonths(Math.round(plan.default_duration_days / 30))
                setValidityMode(plan.default_duration_days % 30 === 0 ? 'months' : 'preset')
            }
        } else {
            setSelectedPlan(null)
            setForm({
                name: '',
                slug: '',
                price: 0,
                hall_limit: 1,
                has_advanced_analytics: false,
                features: [],
                default_duration_days: null,
                fixed_expiry_date: null,
            })
            setUseDefaultDuration(false)
            setValidityMode('preset')
        }
        setDialogOpen(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            if (selectedPlan) {
                await api.patch(`/subscription-plans/${selectedPlan.id}/`, form)
                toast.success('Plan updated')
            } else {
                await api.post('/subscription-plans/', form)
                toast.success('Plan created')
            }
            setDialogOpen(false)
            load()
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save plan')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this plan? This may affect existing subscriptions.')) return
        try {
            await api.delete(`/subscription-plans/${id}/`)
            toast.success('Plan deleted')
            load()
        } catch {
            toast.error('Failed to delete plan')
        }
    }

    const handleFeatureChange = (value: string) => {
        const features = value.split(',').map(f => f.trim()).filter(f => f)
        setForm(f => ({ ...f, features }))
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', mb: 3 }}>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" fontWeight={800}>Manage Plans</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Configure tiered subscription plans and feature access
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={load} size="small">
                        <Refresh sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </IconButton>
                    <Button 
                        variant="contained" 
                        startIcon={<Add />} 
                        onClick={() => handleOpen()}
                    >
                        Create Plan
                    </Button>
                </Box>
            </Box>

            {/* Plans Table */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Plan Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Hall Limit</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Features</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {plans.map(plan => (
                                <TableRow key={plan.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <CardMembership color="primary" />
                                            <Typography variant="body2" fontWeight={700}>{plan.name}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={plan.slug} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>₹{Number(plan.price).toLocaleString()}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Store sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2">{plan.hall_limit}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {plan.has_advanced_analytics && (
                                                <Tooltip title="Advanced Analytics">
                                                    <Analytics sx={{ fontSize: 18, color: 'purple.main' }} />
                                                </Tooltip>
                                            )}
                                            {plan.features.slice(0, 2).map((f, i) => (
                                                <Chip key={i} label={f} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                                            ))}
                                            {plan.features.length > 2 && (
                                                <Typography variant="caption">+{plan.features.length - 2}</Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton onClick={() => handleOpen(plan)} size="small" color="primary">
                                            <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton onClick={() => handleDelete(plan.id)} size="small" color="error">
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Edit/Create Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {selectedPlan ? 'Edit Subscription Plan' : 'Create New Plan'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField 
                                label="Plan Name" fullWidth size="small" required
                                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Pro Plan"
                            />
                            <TextField 
                                label="Slug" fullWidth size="small" required
                                value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                                placeholder="e.g. pro"
                                disabled={!!selectedPlan}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField 
                                label="Price (Monthly)" fullWidth size="small" type="number" required
                                value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                                InputProps={{ startAdornment: <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>₹</Typography> }}
                            />
                            <TextField 
                                label="Hall Limit" fullWidth size="small" type="number" required
                                value={form.hall_limit} onChange={e => setForm({ ...form, hall_limit: parseInt(e.target.value) })}
                            />
                        </Box>
                        
                        <Divider sx={{ my: 1 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary">PLAN VALIDITY</Typography>
                        </Divider>

                        <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: useDefaultDuration ? 2 : 0 }}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700}>Set default subscription duration</Typography>
                                    <Typography variant="caption" color="text.secondary">Auto-fills expiry when admin grants this plan</Typography>
                                </Box>
                                <Switch 
                                    checked={useDefaultDuration} 
                                    onChange={(e) => {
                                        setUseDefaultDuration(e.target.checked)
                                        if (!e.target.checked) setForm(f => ({ ...f, default_duration_days: null }))
                                        else setForm(f => ({ ...f, default_duration_days: 30 }))
                                    }} 
                                />
                            </Box>

                            {useDefaultDuration && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <ToggleButtonGroup
                                        value={validityMode}
                                        exclusive
                                        onChange={(_, val) => val && setValidityMode(val)}
                                        fullWidth size="small"
                                    >
                                        <ToggleButton value="preset" sx={{ textTransform: 'none' }}>Quick preset</ToggleButton>
                                        <ToggleButton value="months" sx={{ textTransform: 'none' }}>By months</ToggleButton>
                                        <ToggleButton value="date" sx={{ textTransform: 'none' }}>Fixed end date</ToggleButton>
                                    </ToggleButtonGroup>

                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        {validityMode === 'date' ? (
                                            <Grid container spacing={1.5}>
                                                <Grid size={{ xs: 7 }}>
                                                    <TextField
                                                        label="Fixed expiry date" fullWidth size="small" type="date"
                                                        InputLabelProps={{ shrink: true }}
                                                        value={fixedDate}
                                                        onChange={e => {
                                                            setFixedDate(e.target.value)
                                                            const iso = `${e.target.value}T${fixedTime}:00+05:30`
                                                            setForm(f => ({ ...f, fixed_expiry_date: iso, default_duration_days: null }))
                                                        }}
                                                    />
                                                </Grid>
                                                <Grid size={{ xs: 5 }}>
                                                    <TextField
                                                        label="Expiry time" fullWidth size="small" type="time"
                                                        InputLabelProps={{ shrink: true }}
                                                        value={fixedTime}
                                                        onChange={e => {
                                                            setFixedTime(e.target.value)
                                                            const iso = `${fixedDate}T${e.target.value}:00+05:30`
                                                            setForm(f => ({ ...f, fixed_expiry_date: iso, default_duration_days: null }))
                                                        }}
                                                    />
                                                </Grid>
                                            </Grid>
                                        ) : (
                                            <TextField 
                                                label="Days from today" fullWidth size="small" type="number" disabled
                                                value={form.default_duration_days || 0}
                                            />
                                        )}
                                    </Box>

                                    {validityMode === 'preset' && (
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {[
                                                { label: '1 Month', val: 30 },
                                                { label: '3 Months', val: 90 },
                                                { label: '6 Months', val: 180 },
                                                { label: '1 Year', val: 365 },
                                                { label: '2 Years', val: 730 },
                                            ].map(p => (
                                                <Button 
                                                    key={p.val} size="small" variant="outlined" 
                                                    onClick={() => setForm(f => ({ ...f, default_duration_days: p.val }))}
                                                    sx={{ borderRadius: 10, px: 2, fontSize: 11, minWidth: 0, height: 28 }}
                                                >
                                                    {p.label}
                                                </Button>
                                            ))}
                                        </Box>
                                    )}

                                    {validityMode === 'months' && (
                                        <Box sx={{ px: 1 }}>
                                            <Typography variant="caption" gutterBottom display="block">Months: {durationMonths}</Typography>
                                            <input 
                                                type="range" min="1" max="24" step="1" 
                                                value={durationMonths} 
                                                onChange={e => {
                                                    const m = parseInt(e.target.value)
                                                    setDurationMonths(m)
                                                    setForm(f => ({ ...f, default_duration_days: m * 30 }))
                                                }}
                                                style={{ width: '100%', accentColor: theme.palette.primary.main }}
                                            />
                                        </Box>
                                    )}

                                    <Typography variant="caption" color="success.main" fontWeight={700}>
                                        {validityMode === 'date' 
                                            ? `Fixed: ${format(parseISO(`${fixedDate}T${fixedTime}:00+05:30`), 'dd MMM yyyy, hh:mm a')}`
                                            : `${form.default_duration_days} days · ${Math.round((form.default_duration_days || 0) / 30)} months from today`
                                        }
                                    </Typography>
                                </Box>
                            )}
                        </Card>

                        <FormControlLabel
                            control={
                                <Switch 
                                    checked={form.has_advanced_analytics} 
                                    onChange={e => setForm({ ...form, has_advanced_analytics: e.target.checked })} 
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700}>Enable Advanced Analytics</Typography>
                                    <Typography variant="caption" color="text.secondary">Partner gets analytics dashboard access</Typography>
                                </Box>
                            }
                        />

                        <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>FEATURES</Typography>
                            <TextField 
                                fullWidth size="small" multiline rows={2}
                                value={form.features?.join(', ')} 
                                onChange={e => handleFeatureChange(e.target.value)}
                                placeholder="High priority support, Branding, WhatsApp alerts, etc."
                                sx={{ bgcolor: 'background.paper' }}
                            />
                            <Typography variant="caption" color="text.secondary">Comma-separated list of perks shown to partners</Typography>
                        </Box>

                        {/* Summary View */}
                        <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03), p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                            {[
                                { label: 'Plan', value: form.name || 'Untitled' },
                                { label: 'Price', value: `₹${form.price || 0}/mo` },
                                { label: 'Hall limit', value: `${form.hall_limit || 1} halls` },
                                { 
                                    label: 'Default validity', 
                                    value: validityMode === 'date' 
                                        ? format(parseISO(`${fixedDate}T${fixedTime}:00+05:30`), 'dd MMM yyyy, hh:mm a')
                                        : form.default_duration_days ? `${form.default_duration_days} days` : 'Manual' 
                                },
                                { 
                                    label: 'Exact ISO sent to backend', 
                                    value: validityMode === 'date' 
                                        ? `${fixedDate}T${fixedTime}:00+05:30` 
                                        : form.default_duration_days ? format(addDays(new Date(), form.default_duration_days), 'yyyy-MM-dd') : 'N/A' 
                                },
                            ].map(row => (
                                <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                                    <Typography variant="caption" fontWeight={700} sx={{ textAlign: 'right', ml: 2 }}>{row.value}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        startIcon={<CheckCircle />} 
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Plan'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
