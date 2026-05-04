'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Box, Card, CardContent, Typography, TextField, Button, Chip,
    Divider, Grid, CircularProgress, Slider, InputAdornment,
    Alert, IconButton, Tooltip, Dialog, DialogTitle,
    DialogContent, DialogActions, LinearProgress, MenuItem, Select,
    FormControl, InputLabel,
} from '@mui/material'
import {
    Store, LocationOn, People, CurrencyRupee, Tv, VolumeUp,
    Wifi, Palette, AcUnit, LocalParking, Celebration, Cloud, Save, CheckCircle,
    AddPhotoAlternate, Delete, Star, StarBorder, Image as ImageIcon,
    Timer, Upgrade, Warning, Add, Close, ArrowForward, ArrowBack,
    DeleteForever as DeleteForeverIcon, Info as InfoIcon,
} from '@mui/icons-material'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Power, PowerOff, PlusCircle, Crown, Clock } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface HallForm {
    name: string; description: string; hall_type: string
    tags: string[]
    address: string; city: string; state: string; pincode: string
    latitude: string; longitude: string
    capacity_min: number; capacity_max: number; base_capacity: number
    price_per_slot: number; hourly_rate: number; extra_guest_fee: number
    opening_time: string; closing_time: string
    amenity_projector: boolean; amenity_sound_system: boolean
    amenity_wifi: boolean; amenity_decoration: boolean
    amenity_ac: boolean; amenity_parking: boolean
    amenity_led_letters: boolean; amenity_fog_machine: boolean
    refund_percentage_3h: number; refund_percentage_2h: number; refund_percentage_1h: number
    min_advance_booking_days: number; max_advance_booking_days: number
    special_instructions: string
}
interface Addon { id: string; name: string; price: string; category: string; description?: string }

const DEFAULT: HallForm = {
    name: '', description: '', hall_type: '', tags: [],
    address: '', city: '', state: 'Tamil Nadu', pincode: '', latitude: '', longitude: '',
    capacity_min: 10, capacity_max: 60, base_capacity: 10,
    price_per_slot: 2500, hourly_rate: 500, extra_guest_fee: 50,
    opening_time: '09:00', closing_time: '20:00',
    amenity_projector: true, amenity_sound_system: true, amenity_wifi: true,
    amenity_decoration: true, amenity_ac: false, amenity_parking: false,
    amenity_led_letters: false, amenity_fog_machine: false,
    refund_percentage_3h: 50, refund_percentage_2h: 25, refund_percentage_1h: 0,
    min_advance_booking_days: 1, max_advance_booking_days: 90,
    special_instructions: '',
}

const AMENITIES = [
    { key: 'amenity_projector', label: 'Projector', icon: <Tv fontSize="small" /> },
    { key: 'amenity_sound_system', label: 'Sound System', icon: <VolumeUp fontSize="small" /> },
    { key: 'amenity_wifi', label: 'WiFi', icon: <Wifi fontSize="small" /> },
    { key: 'amenity_decoration', label: 'Decoration', icon: <Palette fontSize="small" /> },
    { key: 'amenity_ac', label: 'Air Conditioning', icon: <AcUnit fontSize="small" /> },
    { key: 'amenity_parking', label: 'Parking', icon: <LocalParking fontSize="small" /> },
    { key: 'amenity_led_letters', label: 'LED Letters', icon: <Celebration fontSize="small" /> },
    { key: 'amenity_fog_machine', label: 'Fog Machine', icon: <Cloud fontSize="small" /> },
] as const

const HALL_TYPES = ['Banquet Hall', 'Conference Room', 'Outdoor Venue', 'Rooftop', 'Garden Hall', 'Private Theatre', 'Mini Hall', 'Other']
const STEPS = ['Basic Info', 'Capacity & Pricing', 'Photos & Services', 'Policies']

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PartnerHallPage() {
    const [halls, setHalls] = useState<any[]>([])
    const [sub, setSub] = useState<any>(null)
    const [hallUsage, setHallUsage] = useState<any>(null)
    const [form, setForm] = useState<HallForm>(DEFAULT)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [hallId, setHallId] = useState<string | null>(null)
    const [hallSlug, setHallSlug] = useState<string | null>(null)
    const [hallStatus, setHallStatus] = useState('')
    const [hallIsActive, setHallIsActive] = useState(false)
    const [saved, setSaved] = useState(false)
    const [view, setView] = useState<'list' | 'edit'>('list')
    const [step, setStep] = useState(0)
    const router = useRouter()

    // Trial countdown
    const [trialCountdown, setTrialCountdown] = useState('')
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const startCountdown = (exp: string) => {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            const diff = new Date(exp).getTime() - Date.now()
            if (diff <= 0) { setTrialCountdown('Expired'); clearInterval(timerRef.current!); loadData(); return }
            setTrialCountdown(`${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s remaining`)
        }, 1000)
    }
    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

    // Image state
    const [images, setImages] = useState<{ id: string; url: string; caption: string; is_primary: boolean; image?: string }[]>([])
    const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string; caption: string }[]>([])
    const [uploadingImages, setUploadingImages] = useState(false)

    // Addon state
    const [addons, setAddons] = useState<Addon[]>([])
    const [addAddonOpen, setAddAddonOpen] = useState(false)
    const [addonAdding, setAddonAdding] = useState(false)
    const [addonForm, setAddonForm] = useState({ name: '', price: '', category: 'food', description: '' })

    // Tag input
    const [tagInput, setTagInput] = useState('')

    const set = (key: keyof HallForm, val: any) => setForm(f => ({ ...f, [key]: val }))

    const loadData = async () => {
        setLoading(true)
        try {
            const [hallsRes, subRes, usageRes] = await Promise.all([
                api.get('/halls/'),
                api.get('/subscriptions/'),
                api.get('/subscriptions/hall-status/').catch(() => ({ data: null })),
            ])
            const list = hallsRes.data.results || hallsRes.data
            setHalls(list)
            const s = subRes.data; setSub(s)
            if (usageRes.data) setHallUsage(usageRes.data)
            if (s?.is_trial && s?.is_valid && s?.expires_at) startCountdown(s.expires_at)
            if (list.length === 1 && !hallId) editHall(list[0])
            else if (list.length === 0) { setView('edit'); setStep(0) }
        } catch { } finally { setLoading(false) }
    }
    useEffect(() => { loadData() }, [])

    const editHall = (h: any) => {
        setHallId(h.id); setHallSlug(h.slug)
        setHallStatus(h.status); setHallIsActive(h.is_active)
        setImages(h.images || []); setAddons(h.addon_services || [])
        setForm({
            name: h.name || '', description: h.description || '',
            hall_type: h.hall_type || '', tags: h.tags || [],
            address: h.address || '', city: h.city || '',
            state: h.state || '', pincode: h.pincode || '',
            latitude: h.latitude?.toString() || '', longitude: h.longitude?.toString() || '',
            capacity_min: h.capacity_min || 10, capacity_max: h.capacity_max || 60,
            base_capacity: h.base_capacity || 10,
            price_per_slot: parseFloat(h.price_per_slot) || 2500,
            hourly_rate: parseFloat(h.hourly_rate) || 500,
            extra_guest_fee: parseFloat(h.extra_guest_fee) || 50,
            opening_time: h.opening_time || '09:00', closing_time: h.closing_time || '20:00',
            amenity_projector: h.amenity_projector ?? true, amenity_sound_system: h.amenity_sound_system ?? true,
            amenity_wifi: h.amenity_wifi ?? true, amenity_decoration: h.amenity_decoration ?? true,
            amenity_ac: h.amenity_ac ?? false, amenity_parking: h.amenity_parking ?? false,
            amenity_led_letters: h.amenity_led_letters ?? false, amenity_fog_machine: h.amenity_fog_machine ?? false,
            refund_percentage_3h: h.refund_percentage_3h ?? 50,
            refund_percentage_2h: h.refund_percentage_2h ?? 25,
            refund_percentage_1h: h.refund_percentage_1h ?? 0,
            min_advance_booking_days: h.min_advance_booking_days ?? 1,
            max_advance_booking_days: h.max_advance_booking_days ?? 90,
            special_instructions: h.special_instructions || '',
        })
        setView('edit'); setStep(0)
    }

    const resetForm = () => {
        setHallId(null); setHallSlug(null); setHallStatus(''); setHallIsActive(false)
        setForm(DEFAULT); setImages([]); setPendingFiles([]); setAddons([])
        setView('edit'); setStep(0)
    }

    const lookupPincode = async () => {
        if (form.pincode.length !== 6) return
        try {
            const res = await fetch(`https://api.postalpincode.in/pincode/${form.pincode}`)
            const data = await res.json()
            if (data[0]?.Status === 'Success') {
                const p = data[0].PostOffice[0]
                setForm(f => ({ ...f, city: p.Division || p.District, state: p.State }))
                toast.success(`Auto-filled: ${p.Division || p.District}, ${p.State}`)
            } else {
                toast.error('Pincode not found')
            }
        } catch { toast.error('Could not fetch pincode details') }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const remaining = 10 - images.length - pendingFiles.length
        const toAdd = files.slice(0, remaining)
        toAdd.forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => setPendingFiles(prev => [...prev, { file, preview: reader.result as string, caption: '' }])
            reader.readAsDataURL(file)
        })
        if (files.length > remaining) toast.warning(`Only ${remaining} more photo(s) allowed (max 10)`)
    }

    const uploadPendingImages = async (slug: string) => {
        if (pendingFiles.length === 0) return
        setUploadingImages(true)
        for (let i = 0; i < pendingFiles.length; i++) {
            const { file, caption } = pendingFiles[i]
            const fd = new FormData()
            fd.append('image', file)
            if (caption) fd.append('caption', caption)
            try {
                const res = await api.post(`/halls/${slug}/add_image/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                setImages(prev => [...prev, res.data])
            } catch { toast.error(`Failed to upload: ${file.name}`) }
        }
        setPendingFiles([])
        setUploadingImages(false)
    }

    const handleDeleteImage = async (imageId: string) => {
        if (!hallSlug) return
        try { await api.delete(`/halls/${hallSlug}/delete_image/${imageId}/`); setImages(prev => prev.filter(i => i.id !== imageId)); toast.success('Image removed') }
        catch { toast.error('Failed to delete image') }
    }

    const handleSetPrimary = async (imageId: string) => {
        if (!hallSlug) return
        try {
            await api.post(`/halls/${hallSlug}/set_primary/${imageId}/`)
            setImages(prev => prev.map(i => ({ ...i, is_primary: i.id === imageId })))
            toast.success('Set as cover photo!')
        } catch { toast.error('Failed to set as primary') }
    }

    const handleAddAddon = async () => {
        if (!addonForm.name.trim() || !addonForm.price) { toast.error('Please fill all fields'); return }
        if (!hallId) { toast.error('Save hall first'); return }
        setAddonAdding(true)
        try {
            const res = await api.post('/addon-services/', { hall: hallId, name: addonForm.name.trim(), price: addonForm.price, category: addonForm.category, description: addonForm.description })
            setAddons(prev => [...prev, res.data])
            setAddonForm({ name: '', price: '', category: 'food', description: '' })
            setAddAddonOpen(false); toast.success('Service added!')
        } catch { toast.error('Failed to add service') }
        finally { setAddonAdding(false) }
    }

    const handleDeleteAddon = async (id: string) => {
        try { await api.delete(`/addon-services/${id}/`); setAddons(prev => prev.filter(a => a.id !== id)); toast.success('Service removed') }
        catch { toast.error('Failed to delete service') }
    }

    const handleSubmit = async () => {
        if (!form.name || !form.address || !form.pincode) { toast.error('Please fill all required fields'); return }
        setSaving(true)
        try {
            const payload = { ...form, latitude: form.latitude ? parseFloat(form.latitude) : null, longitude: form.longitude ? parseFloat(form.longitude) : null }
            let slug = hallSlug
            if (hallId && hallSlug) {
                await api.patch(`/halls/${hallSlug}/`, payload)
                toast.success('Hall updated!')
            } else {
                const res = await api.post('/halls/', payload)
                setHallId(res.data.id); setHallSlug(res.data.slug); slug = res.data.slug
                toast.success('Hall submitted for review!')
                await loadData()
            }
            if (slug) await uploadPendingImages(slug)
            setSaved(true); setTimeout(() => setSaved(false), 3000)
        } catch (err: any) {
            const errData = err.response?.data
            if (errData?.error === 'hall_limit_reached') { toast.error(errData?.message || 'Hall limit reached'); router.push('/partner/subscription') }
            else toast.error(errData?.detail || errData?.name?.[0] || 'Failed to save')
        } finally { setSaving(false) }
    }

    const handlePublish = async (id: string, slug?: string) => {
        const targetSlug = slug || hallSlug; if (!targetSlug) return
        try {
            const res = await api.post(`/halls/${targetSlug}/publish/`)
            toast.success(res.data.message || 'Hall is now live!'); loadData()
            if (hallId === id) { setHallStatus('approved'); setHallIsActive(true) }
        } catch (err: any) {
            const errCode = err.response?.data?.error
            if (errCode === 'subscription_required') { toast.error('Trial expired. Please upgrade.'); router.push('/partner/subscription') }
            else toast.error(err.response?.data?.message || 'Failed to publish')
        }
    }

    const handleUnpublish = async (id: string, slug?: string) => {
        const targetSlug = slug || hallSlug; if (!targetSlug) return
        try { const res = await api.post(`/halls/${targetSlug}/unpublish/`); toast.success(res.data.message || 'Hall taken offline'); loadData(); if (hallId === id) { setHallStatus('pending'); setHallIsActive(false) } }
        catch { toast.error('Failed to unpublish') }
    }

    const handleDeleteHall = async (id: string, slug: string, name: string) => {
        if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return
        try { await api.delete(`/halls/${slug}/`); toast.success(`"${name}" deleted.`); await loadData() }
        catch (err: any) { toast.error(err.response?.data?.error || 'Failed to delete hall.') }
    }

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>

    // ═══════════════════════════════════════════
    // LIST VIEW
    // ═══════════════════════════════════════════
    if (view === 'list') {
        const isTrialActive = sub?.is_trial && sub?.is_valid
        const isSubActive = sub?.is_valid && !sub?.is_trial
        const trialExpired = sub?.is_trial && !sub?.is_valid
        const noPlan = !sub || sub?.status === 'none'
        return (
            <Box>
                {isTrialActive && (<Alert severity="warning" icon={<Timer />} sx={{ mb: 3, borderRadius: 2 }} action={<Button color="warning" size="small" variant="outlined" onClick={() => router.push('/partner/subscription')} startIcon={<Upgrade />}>Upgrade</Button>}><Typography variant="subtitle2" fontWeight={700}>Free Trial Active</Typography><Typography variant="body2">1-hour free trial running. <strong>{trialCountdown || 'Checking...'}</strong></Typography></Alert>)}
                {trialExpired && (<Alert severity="error" icon={<Warning />} sx={{ mb: 3, borderRadius: 2 }} action={<Button color="error" size="small" variant="contained" onClick={() => router.push('/partner/subscription')} startIcon={<Crown size={16} />}>Subscribe Now</Button>}><Typography variant="subtitle2" fontWeight={700}>Trial Expired</Typography><Typography variant="body2">Subscribe to go live again.</Typography></Alert>)}
                {noPlan && (<Alert severity="info" icon={<Clock size={20} />} sx={{ mb: 3, borderRadius: 2 }} action={<Button color="info" size="small" variant="outlined" onClick={() => router.push('/partner/subscription')}>View Plans</Button>}><Typography variant="subtitle2" fontWeight={700}>No Active Plan</Typography><Typography variant="body2">Click <strong>Go Live</strong> to activate your free 1-hour trial.</Typography></Alert>)}
                {isSubActive && (<Alert severity="success" icon={<Crown size={20} />} sx={{ mb: 3, borderRadius: 2 }}><Typography variant="subtitle2" fontWeight={700}>{sub?.plan_info?.name || 'Active'} Plan</Typography><Typography variant="body2">{halls.filter((h: any) => h.status === 'approved' && h.is_active).length}/{sub?.plan_info?.halls || 1} halls live. Expires: {sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'N/A'}</Typography></Alert>)}
                {hallUsage && (<Alert severity={hallUsage.halls_remaining === 0 ? 'error' : 'info'} sx={{ mb: 3, borderRadius: 2 }} action={hallUsage.halls_remaining === 0 ? <Button size="small" variant="outlined" color="error" onClick={() => router.push('/partner/subscription')} startIcon={<Upgrade />}>Upgrade</Button> : null}><Box sx={{ width: '100%' }}><Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Hall Slots: {hallUsage.hall_count} of {hallUsage.hall_limit} used</Typography><LinearProgress variant="determinate" value={Math.min(100, (hallUsage.hall_count / (hallUsage.hall_limit || 1)) * 100)} color={hallUsage.halls_remaining === 0 ? 'error' : 'success'} sx={{ height: 8, borderRadius: 4 }} />{hallUsage.halls_remaining === 0 ? <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>Hall limit reached. Upgrade to add more.</Typography> : <Typography variant="caption" sx={{ mt: 0.5, display: 'block', opacity: 0.75 }}>{hallUsage.halls_remaining} slot(s) remaining</Typography>}</Box></Alert>)}
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box><Typography variant="h5" fontWeight={700}>My Halls</Typography><Typography variant="body2" color="text.secondary">{sub?.plan_info?.name || 'Free'} Plan</Typography></Box>
                    <Tooltip title={hallUsage?.halls_remaining === 0 ? 'Hall limit reached. Upgrade your plan.' : ''} placement="left"><span><Button variant="contained" startIcon={hallUsage?.halls_remaining === 0 ? <Upgrade /> : <PlusCircle size={18} />} onClick={hallUsage?.halls_remaining === 0 ? () => router.push('/partner/subscription') : resetForm} color={hallUsage?.halls_remaining === 0 ? 'warning' : 'primary'}>{hallUsage?.halls_remaining === 0 ? 'Upgrade Plan' : 'Add New Hall'}</Button></span></Tooltip>
                </Box>
                {halls.length === 0 ? (
                    <Card sx={{ textAlign: 'center', py: 8, border: '2px dashed', borderColor: 'divider' }}><Store sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} /><Typography color="text.secondary">No halls added yet</Typography><Button variant="outlined" sx={{ mt: 2 }} onClick={resetForm}>Create your first hall</Button></Card>
                ) : (
                    <Grid container spacing={3}>{halls.map(h => (<Grid size={{ xs: 12, sm: 6, md: 4 }} key={h.id}><Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}><Box sx={{ position: 'relative', pt: '56.25%', bgcolor: 'grey.100' }}><img src={h.primary_image ?? '/images/hall-placeholder.jpg'} alt={h.name} onError={(e) => { e.currentTarget.src = '/images/hall-placeholder.jpg'; e.currentTarget.onerror = null }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} /><Chip label={h.status || 'pending'} size="small" color={h.status === 'approved' ? 'success' : h.status === 'rejected' ? 'error' : 'warning'} sx={{ position: 'absolute', top: 12, left: 12, fontWeight: 700 }} />{h.status === 'approved' && h.is_active && (<Chip label="LIVE" size="small" color="success" sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 700, bgcolor: '#16a34a' }} />)}</Box><CardContent sx={{ flexGrow: 1, p: 2.5 }}><Typography variant="h6" fontWeight={700} noWrap gutterBottom>{h.name}</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, color: 'text.secondary' }}><LocationOn sx={{ fontSize: 16 }} /><Typography variant="caption" noWrap>{h.city}, {h.state}</Typography></Box><Box sx={{ display: 'flex', gap: 1 }}><Button fullWidth variant="outlined" size="small" onClick={() => editHall(h)}>Edit</Button>{h.status === 'approved' && h.is_active ? (<Button fullWidth variant="outlined" color="error" size="small" startIcon={<PowerOff size={14} />} onClick={() => handleUnpublish(h.id, h.slug)}>Offline</Button>) : trialExpired ? (<Button fullWidth variant="contained" color="warning" size="small" startIcon={<Crown size={14} />} onClick={() => router.push('/partner/subscription')}>Upgrade</Button>) : (<Button fullWidth variant="contained" size="small" startIcon={<Power size={14} />} onClick={() => handlePublish(h.id, h.slug)}>Go Live</Button>)}</Box><Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}><Tooltip title="Delete hall permanently"><IconButton size="small" color="error" onClick={() => handleDeleteHall(h.id, h.slug, h.name)} sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 1 }}><DeleteForeverIcon fontSize="small" /></IconButton></Tooltip></Box></CardContent></Card></Grid>))}</Grid>
                )}
            </Box>
        )
    }

    // ═══════════════════════════════════════════
    // WIZARD EDIT VIEW
    // ═══════════════════════════════════════════
    const progress = ((step + 1) / STEPS.length) * 100
    const canNext = () => {
        if (step === 0) return !!(form.name.trim() && form.address.trim() && form.pincode.trim())
        return true
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => setView('list')} size="small"><ArrowLeft size={20} /></IconButton>
                <Box>
                    <Typography variant="h5" fontWeight={700}>{hallId ? 'Update Hall' : 'Create New Hall'}</Typography>
                    <Typography variant="body2" color="text.secondary">{hallId ? `Editing: ${form.name}` : 'Fill in details to get listed on PartyHub'}</Typography>
                </Box>
                {hallId && (
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1.5 }}>
                        {hallStatus === 'approved' && hallIsActive ? (
                            <><Chip label="LIVE" color="success" sx={{ fontWeight: 700 }} /><Button size="small" variant="outlined" color="error" startIcon={<PowerOff size={16} />} onClick={() => handleUnpublish(hallId)}>Take Offline</Button></>
                        ) : (
                            <><Chip label={(hallStatus || 'pending').toUpperCase()} variant="outlined" color={hallStatus === 'rejected' ? 'error' : 'warning'} sx={{ fontWeight: 700 }} /><Button size="small" variant="contained" color="success" startIcon={<Power size={16} />} onClick={() => hallSlug && handlePublish(hallId ?? '', hallSlug)}>Go Live</Button></>
                        )}
                    </Box>
                )}
            </Box>

            {/* Progress bar */}
            <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, height: 6, borderRadius: 3 }} />

            {/* Step tabs */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                {STEPS.map((label, i) => (
                    <Box key={i} onClick={() => { if (i < step || (hallId && i <= step)) setStep(i) }}
                        sx={{ px: 2, py: 1, borderRadius: 2, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: i <= step ? 'pointer' : 'default', transition: 'all .2s', borderColor: i === step ? 'primary.main' : 'divider', bgcolor: i === step ? 'primary.main' : i < step ? 'action.selected' : 'transparent', color: i === step ? 'primary.contrastText' : i < step ? 'primary.main' : 'text.secondary' }}>
                        {i + 1}. {label}
                    </Box>
                ))}
            </Box>

            {/* ─── STEP 1: Basic Info + Location ─── */}
            {step === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {!hallId && <Alert severity="info">Your hall will be <strong>reviewed by our team</strong> before going live (usually 24 hours).</Alert>}

                    {/* Basic Info */}
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}><Store color="primary" /><Typography variant="h6" fontWeight={600}>Basic Information</Typography></Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <Box>
                                    <TextField fullWidth required label="Hall Name" value={form.name} onChange={e => set('name', e.target.value)} inputProps={{ maxLength: 60 }} placeholder="e.g. Grand Celebration Hall" />
                                    <Typography variant="caption" align="right" display="block" color="text.secondary">{form.name.length} / 60</Typography>
                                </Box>
                                <Box>
                                    <TextField fullWidth multiline rows={3} label="Description" value={form.description} onChange={e => set('description', e.target.value)} inputProps={{ maxLength: 500 }} placeholder="Describe your hall — ambiance, speciality, what makes it unique..." />
                                    <Typography variant="caption" align="right" display="block" color="text.secondary">{form.description.length} / 500</Typography>
                                </Box>
                                <FormControl fullWidth>
                                    <InputLabel>Hall Type</InputLabel>
                                    <Select value={form.hall_type} label="Hall Type" onChange={e => set('hall_type', e.target.value)}>
                                        <MenuItem value=""><em>Select type...</em></MenuItem>
                                        {HALL_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                {/* Tags */}
                                <Box>
                                    <TextField fullWidth label="Tags (press Enter to add)" value={tagInput} onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const t = tagInput.trim(); if (t && !form.tags.includes(t) && form.tags.length < 10) { set('tags', [...form.tags, t]); setTagInput('') } } }}
                                        placeholder="e.g. Birthday, Anniversary, Corporate..." helperText="Tags help customers find your hall" />
                                    {form.tags.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                            {form.tags.map(tag => (
                                                <Chip key={tag} label={tag} size="small" onDelete={() => set('tags', form.tags.filter(t => t !== tag))} />
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Location */}
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}><LocationOn color="primary" /><Typography variant="h6" fontWeight={600}>Location</Typography></Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <TextField fullWidth required label="Full Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, Area, Landmark..." />
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <TextField required label="Pincode" value={form.pincode}
                                        onChange={e => { set('pincode', e.target.value); }}
                                        onBlur={lookupPincode}
                                        inputProps={{ maxLength: 6 }} sx={{ flex: 1, minWidth: 130 }}
                                        helperText="Tab / click away to auto-fill city & state" />
                                    <TextField label="City" value={form.city} onChange={e => set('city', e.target.value)} sx={{ flex: 1, minWidth: 130 }} />
                                    <TextField label="State" value={form.state} onChange={e => set('state', e.target.value)} sx={{ flex: 1, minWidth: 130 }} />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <TextField label="Latitude (optional)" value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="e.g. 13.0827" sx={{ flex: 1, minWidth: 160 }} helperText="Leave blank if unknown" />
                                    <TextField label="Longitude (optional)" value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="e.g. 80.2707" sx={{ flex: 1, minWidth: 160 }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            )}

            {/* ─── STEP 2: Capacity, Pricing & Amenities ─── */}
            {step === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}><People color="primary" /><Typography variant="h6" fontWeight={600}>Capacity &amp; Pricing</Typography></Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <TextField label="Min Guests" type="number" value={form.capacity_min} onChange={e => set('capacity_min', parseInt(e.target.value) || 1)} inputProps={{ min: 1 }} sx={{ flex: 1, minWidth: 130 }} />
                                    <TextField label="Max Guests" type="number" value={form.capacity_max} onChange={e => set('capacity_max', parseInt(e.target.value) || 10)} inputProps={{ min: 1 }} sx={{ flex: 1, minWidth: 130 }} />
                                    <TextField label="Base Capacity (included in price)" type="number" value={form.base_capacity} onChange={e => set('base_capacity', parseInt(e.target.value) || 1)} inputProps={{ min: 1 }} sx={{ flex: 1, minWidth: 200 }} />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <TextField label="Base Price / Slot" type="number" value={form.price_per_slot} onChange={e => set('price_per_slot', parseFloat(e.target.value) || 0)} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} sx={{ flex: 1, minWidth: 160 }} />
                                    <TextField label="Extra Guest Rate" type="number" value={form.extra_guest_fee} onChange={e => set('extra_guest_fee', parseFloat(e.target.value) || 0)} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} helperText="Per person above base capacity" sx={{ flex: 1, minWidth: 180 }} />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <TextField label="Opening Time" type="time" value={form.opening_time} onChange={e => set('opening_time', e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ step: 300 }} sx={{ flex: 1 }} />
                                    <TextField label="Closing Time" type="time" value={form.closing_time} onChange={e => set('closing_time', e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ step: 300 }} sx={{ flex: 1 }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Amenities */}
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><Add color="primary" /><Typography variant="h6" fontWeight={600}>Amenities</Typography></Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Select all amenities your hall offers</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {AMENITIES.map(({ key, label, icon }) => (
                                    <Chip key={key} label={label} icon={icon}
                                        onClick={() => set(key, !(form[key as keyof HallForm]))}
                                        color={form[key as keyof HallForm] ? 'primary' : 'default'}
                                        variant={form[key as keyof HallForm] ? 'filled' : 'outlined'}
                                        sx={{ cursor: 'pointer', fontWeight: 500 }} />
                                ))
                                }
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            )}

            {/* ─── STEP 3: Photos & Services ─── */}
            {step === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Hall Photos */}
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <ImageIcon color="primary" />
                                <Typography variant="h6" fontWeight={600}>Hall Photos</Typography>
                                <Chip label={`${images.length + pendingFiles.length} / 10`} size="small" variant="outlined" />
                            </Box>
                            <Alert severity="info" sx={{ mb: 2, fontSize: 13 }} icon={false}>
                                Upload up to 10 photos. The first photo becomes the cover image.
                            </Alert>
                            <Button variant="outlined" component="label" fullWidth startIcon={<AddPhotoAlternate />}
                                disabled={images.length + pendingFiles.length >= 10}
                                sx={{ py: 3, borderStyle: 'dashed', borderRadius: 2, mb: 2 }}>
                                Click to upload — select multiple photos at once (up to 10)
                                <input type="file" hidden accept="image/*" multiple onChange={handleFileSelect} />
                            </Button>
                            {(images.length > 0 || pendingFiles.length > 0) && (
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 1.5 }}>
                                    {images.map((img) => (
                                        <Box key={img.id} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: img.is_primary ? '2px solid' : '1px solid', borderColor: img.is_primary ? 'primary.main' : 'divider' }}>
                                            <img src={(img as any).image || img.url} alt="Hall photo" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x200?text=Error' }} />
                                            {img.is_primary && <Chip label="Cover" size="small" color="primary" sx={{ position: 'absolute', top: 6, left: 6, fontSize: '0.65rem', height: 20 }} />}
                                            <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5 }}>
                                                {!img.is_primary && hallSlug && <IconButton size="small" onClick={() => handleSetPrimary(img.id)} sx={{ bgcolor: 'rgba(255,255,255,.85)', width: 24, height: 24 }}><StarBorder sx={{ fontSize: 14 }} color="warning" /></IconButton>}
                                                {hallSlug && <IconButton size="small" onClick={() => handleDeleteImage(img.id)} sx={{ bgcolor: 'rgba(255,255,255,.85)', width: 24, height: 24 }}><Delete sx={{ fontSize: 14 }} color="error" /></IconButton>}
                                            </Box>
                                        </Box>
                                    ))}
                                    {pendingFiles.map((pf, idx) => (
                                        <Box key={idx} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '2px dashed', borderColor: 'warning.main' }}>
                                            <img src={pf.preview} alt="pending upload" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                                            <Chip label={images.length + idx === 0 ? 'Cover' : 'Pending'} size="small" color={images.length + idx === 0 ? 'primary' : 'warning'} sx={{ position: 'absolute', top: 6, left: 6, fontSize: '0.65rem', height: 20 }} />
                                            <IconButton size="small" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,.85)', width: 24, height: 24 }}><Close sx={{ fontSize: 14 }} color="error" /></IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                            {!hallId && pendingFiles.length > 0 && (
                                <Alert severity="warning" sx={{ mt: 2, fontSize: 13 }}>Photos will be uploaded when you <strong>Submit for Review</strong> on the final step.</Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Add-on Services */}
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Celebration color="primary" />
                                    <Typography variant="h6" fontWeight={600}>Add-on Services</Typography>
                                    <Chip label={`${addons.length}`} size="small" variant="outlined" />
                                </Box>
                                <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => setAddAddonOpen(true)} disabled={!hallId}>Add Service</Button>
                            </Box>
                            <Alert severity="info" sx={{ mb: 2, fontSize: 13 }} icon={false}>Services customers can add to their booking — food, photography, decoration, etc.</Alert>
                            {!hallId ? (
                                <Alert severity="warning">Save your hall first (complete all 4 steps &amp; submit), then come back to add services.</Alert>
                            ) : addons.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4, border: '2px dashed', borderColor: 'divider', borderRadius: 2, color: 'text.secondary' }}>
                                    <Celebration sx={{ fontSize: 40, opacity: 0.2, mb: 1 }} />
                                    <Typography variant="body2">No services yet. Click Add Service above.</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
                                    {addons.map(addon => (
                                        <Card key={addon.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                            <CardContent sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700}>{addon.name}</Typography>
                                                    {addon.description && <Typography variant="caption" color="text.secondary" display="block">{addon.description}</Typography>}
                                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                                        <Chip label={`₹${parseFloat(addon.price).toLocaleString('en-IN')}`} size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                        <Chip label={addon.category.toUpperCase()} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                    </Box>
                                                </Box>
                                                <IconButton size="small" color="error" onClick={() => handleDeleteAddon(addon.id)}><Delete fontSize="small" /></IconButton>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            )}

            {/* ─── STEP 4: Policies ─── */}
            {step === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Cancellation */}
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}><Star color="primary" /><Typography variant="h6" fontWeight={600}>Cancellation Policy</Typography></Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Set the refund % customers receive based on when they cancel.</Typography>
                            {([
                                { key: 'refund_percentage_3h' as const, label: '3+ hours before event' },
                                { key: 'refund_percentage_2h' as const, label: '2–3 hours before event' },
                                { key: 'refund_percentage_1h' as const, label: 'Under 2 hours before event' },
                            ]).map(({ key, label }) => (
                                <Box key={key} sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" fontWeight={500}>{label}</Typography>
                                        <Chip label={`${form[key]}% refund`} size="small" color={(form[key] as number) > 0 ? 'success' : 'default'} />
                                    </Box>
                                    <Slider value={form[key] as number} onChange={(_, v) => set(key, v)} min={0} max={100} step={5}
                                        marks={[{ value: 0, label: '0%' }, { value: 50, label: '50%' }, { value: 100, label: '100%' }]} />
                                </Box>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Advance booking */}
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}><Timer color="primary" /><Typography variant="h6" fontWeight={600}>Advance Booking Window</Typography></Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField label="Minimum (days)" type="number" value={form.min_advance_booking_days} onChange={e => set('min_advance_booking_days', parseInt(e.target.value) || 1)} inputProps={{ min: 0 }} helperText="Minimum days in advance to allow booking" sx={{ flex: 1 }} />
                                <TextField label="Maximum (days)" type="number" value={form.max_advance_booking_days} onChange={e => set('max_advance_booking_days', parseInt(e.target.value) || 30)} inputProps={{ min: 1 }} helperText="How far in future customers can book" sx={{ flex: 1 }} />
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Special instructions */}
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><InfoIcon color="primary" /><Typography variant="h6" fontWeight={600}>Special Instructions (optional)</Typography></Box>
                            <TextField fullWidth multiline rows={4} value={form.special_instructions} onChange={e => set('special_instructions', e.target.value)}
                                placeholder="Any rules or instructions for guests — noise policy, parking info, entry requirements..." />
                        </CardContent>
                    </Card>
                </Box>
            )}

            {/* ─── Navigation Footer ─── */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Step {step + 1} of {STEPS.length}</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {step > 0 && (
                        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setStep(s => s - 1)}>Back</Button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <Button variant="contained" endIcon={<ArrowForward />} onClick={() => {
                            if (!canNext()) { toast.error('Please fill required fields: Hall Name, Address, Pincode'); return }
                            setStep(s => s + 1)
                        }}>Continue</Button>
                    ) : (
                        <Button variant="contained" color="success" size="large" disabled={saving || uploadingImages}
                            startIcon={saved ? <CheckCircle /> : saving || uploadingImages ? <CircularProgress size={16} color="inherit" /> : <Save />}
                            onClick={handleSubmit} sx={{ px: 4 }}>
                            {saved ? 'Saved!' : saving ? 'Saving…' : uploadingImages ? 'Uploading photos…' : hallId ? 'Update Hall' : 'Submit for Review'}
                        </Button>
                    )}
                </Box>
            </Box>

            {/* ─── Add Service Dialog ─── */}
            <Dialog open={addAddonOpen} onClose={() => setAddAddonOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={700}>Add New Service</DialogTitle>
                <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">Add food, photography, decoration or other bookable services.</Typography>
                    <TextField fullWidth label="Service Name" placeholder="e.g. Standard Buffet" value={addonForm.name} onChange={e => setAddonForm(f => ({ ...f, name: e.target.value }))} />
                    <TextField fullWidth label="Description (optional)" placeholder="Brief description…" value={addonForm.description} onChange={e => setAddonForm(f => ({ ...f, description: e.target.value }))} />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField fullWidth label="Price (₹)" type="number" value={addonForm.price} onChange={e => setAddonForm(f => ({ ...f, price: e.target.value }))} />
                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select value={addonForm.category} label="Category" onChange={e => setAddonForm(f => ({ ...f, category: e.target.value }))}>
                                <MenuItem value="food">🍽 Food &amp; Drinks</MenuItem>
                                <MenuItem value="photography">📷 Photography / Video</MenuItem>
                                <MenuItem value="decoration">🎉 Decoration</MenuItem>
                                <MenuItem value="entry_effect">✨ Entry Effects</MenuItem>
                                <MenuItem value="other">📦 Other</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setAddAddonOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddAddon} disabled={addonAdding}
                        startIcon={addonAdding ? <CircularProgress size={16} color="inherit" /> : <Add />}>
                        {addonAdding ? 'Adding…' : 'Add Service'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
