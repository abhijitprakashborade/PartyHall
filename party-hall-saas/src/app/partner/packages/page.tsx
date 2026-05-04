'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Star, Check, X, Save, Package, RefreshCw, Building, Copy, Eye, EyeOff, Lock, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Box, CircularProgress, MenuItem, Select, FormControl } from '@mui/material'

// ─── Types ────────────────────────────────────────────────────────────────────
interface GuestTier { min: number; max: number; price: number }

interface Pkg {
    id: string
    name: string
    price: string
    duration_hours: number
    max_people: number
    is_recommended: boolean
    inclusions: string[]
    hall: string
    hall_name?: string
    description?: string
    badge_color?: string
    guest_tiers?: GuestTier[]
    duration_mode?: 'by_slots' | 'fixed_hours' | 'open_ended'
    min_slots?: number | null
    fixed_hours?: number | null
    overtime_rate?: number | null
    price_per_hour?: number | null
    max_hours?: number | null
    visibility?: 'public' | 'members_only' | 'hidden'
    advance_booking_required?: boolean
    allow_extra_guests?: boolean
    is_active?: boolean
}

interface Hall { id: string; name: string; slug: string }

// ─── Constants ────────────────────────────────────────────────────────────────
const BADGE_COLORS = ['#7C3AED','#059669','#D97706','#DC2626','#2563EB','#DB2777','#374151']

const TIER_PRESETS: Record<string, Partial<Pkg>> = {
    Starter: { name: 'Starter', price: '999',  max_people: 15,  description: 'Perfect for intimate gatherings and small celebrations.' },
    Silver:  { name: 'Silver',  price: '1499', max_people: 25,  description: 'Great value package for birthday and anniversary parties.' },
    Gold:    { name: 'Gold',    price: '1999', max_people: 40,  description: 'Our most popular package — includes premium photo frame and cake.' },
    Platinum:{ name: 'Platinum',price: '2999', max_people: 60,  description: 'Full premium experience with photographer and fog machine entry.' },
    Royal:   { name: 'Royal',   price: '4999', max_people: 100, description: 'The ultimate luxury celebration package for grand events.' },
}

const INCLUSION_PRESETS = [
    'Grandeur Decoration','Sony Dolby Sound','HD Projector',
    'Cake 1kg','Photo Frame','Fog Machine','LED Letters',
    'Photographer (1hr)','Welcome Drink','Balloons',
]

const DEFAULT_GUEST_TIERS: GuestTier[] = [
    { min: 1,  max: 10, price: 0 },
    { min: 11, max: 30, price: 0 },
    { min: 31, max: 60, price: 0 },
]

const emptyPkg: Omit<Pkg, 'id'> = {
    name: '', price: '', duration_hours: 2, max_people: 30,
    is_recommended: false, inclusions: [], hall: '',
    description: '', badge_color: '#7C3AED', guest_tiers: [],
    duration_mode: 'by_slots', min_slots: null, fixed_hours: null,
    overtime_rate: null, price_per_hour: null, max_hours: null,
    visibility: 'public', advance_booking_required: true, allow_extra_guests: true,
    is_active: true,
}

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
    return (
        <button type="button" onClick={onChange}
            className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${on ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
        </button>
    )
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">{children}</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
        </div>
    )
}

// ─── Live Preview Card ────────────────────────────────────────────────────────
function LivePreview({ pkg, hallName }: { pkg: any; hallName: string }) {
    const bg = pkg.badge_color || '#7C3AED'
    const visIcon = pkg.visibility === 'hidden' ? <EyeOff className="w-3 h-3" /> : pkg.visibility === 'members_only' ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />
    return (
        <div className="border-2 rounded-2xl overflow-hidden" style={{ borderColor: bg + '40' }}>
            <div className="h-1" style={{ background: bg }} />
            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-gray-900 dark:text-white text-base">
                                {pkg.name || 'Package name'}
                            </span>
                            {pkg.is_recommended && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                        </div>
                        {pkg.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug max-w-[220px]">{pkg.description}</p>
                        )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-xl font-black" style={{ color: bg }}>
                            {pkg.price ? `₹${Number(pkg.price).toLocaleString('en-IN')}` : '₹—'}
                        </div>
                        <div className="text-[10px] text-gray-400">/ booking</div>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1"><Building className="w-3 h-3" />{hallName || 'Your Hall'}</span>
                    <span>· {pkg.max_people || '—'} guests max</span>
                    <span className="flex items-center gap-0.5 ml-auto">{visIcon} {pkg.visibility || 'public'}</span>
                </div>
                {pkg.inclusions?.length > 0 && (
                    <div className="space-y-1">
                        {pkg.inclusions.slice(0, 4).map((item: string, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: bg }} />
                                {item}
                            </div>
                        ))}
                        {pkg.inclusions.length > 4 && (
                            <div className="text-[10px] font-bold mt-1" style={{ color: bg }}>
                                +{pkg.inclusions.length - 4} more inclusions
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PartnerPackagesPage() {
    const [packages, setPackages] = useState<Pkg[]>([])
    const [halls, setHalls] = useState<Hall[]>([])
    const [editing, setEditing] = useState<any | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savingDraft, setSavingDraft] = useState(false)
    const [inclusionInput, setInclusionInput] = useState('')
    const [hallFilter, setHallFilter] = useState('all')
    const [clonePkg, setClonePkg] = useState<Pkg | null>(null)
    const [cloneHallIds, setCloneHallIds] = useState<string[]>([])
    const [cloning, setCloning] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            const [pkgRes, hallRes] = await Promise.all([api.get('/packages/'), api.get('/halls/')])
            setPackages(pkgRes.data.results || pkgRes.data)
            setHalls(hallRes.data.results || hallRes.data)
        } catch { toast.error('Failed to load packages') }
        finally { setLoading(false) }
    }

    useEffect(() => { loadData() }, [])

    const handleSave = async (asDraft = false) => {
        if (!editing?.name || !editing?.price || !editing?.hall) {
            toast.error('Name, price and hall selection are required'); return
        }
        asDraft ? setSavingDraft(true) : setSaving(true)
        try {
            const payload = {
                ...editing,
                price: parseFloat(editing.price),
                is_active: !asDraft,
                guest_tiers: (editing.guest_tiers || []).filter((t: GuestTier) => t.price > 0),
            }
            if (isCreating) {
                await api.post('/packages/', payload)
                toast.success(asDraft ? 'Package saved as draft' : 'Package created!')
            } else {
                await api.patch(`/packages/${editing.id}/`, payload)
                toast.success('Package updated!')
            }
            setEditing(null); setIsCreating(false); loadData()
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to save package')
        } finally { setSaving(false); setSavingDraft(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this package?')) return
        try { await api.delete(`/packages/${id}/`); toast.success('Deleted'); loadData() }
        catch { toast.error('Failed to delete') }
    }

    const handleClone = async () => {
        if (!clonePkg || cloneHallIds.length === 0) { toast.error('Select at least one hall'); return }
        setCloning(true)
        try {
            const res = await api.post(`/packages/${clonePkg.id}/clone-to-halls/`, { hall_ids: cloneHallIds })
            const { created, skipped, not_published } = res.data
            if (created.length > 0) toast.success(`✅ Copied to: ${created.join(', ')}`)
            if (skipped.length > 0) toast.info(`⚠️ Skipped (already exists): ${skipped.join(', ')}`)
            if (not_published?.length > 0) toast.warning(`🔒 Not published yet: ${not_published.join(', ')}`, { duration: 8000 })
            setClonePkg(null); setCloneHallIds([]); loadData()
        } catch (err: any) { toast.error(err.response?.data?.detail || 'Clone failed') }
        finally { setCloning(false) }
    }

    const toggleRecommended = async (pkg: Pkg) => {
        try { await api.patch(`/packages/${pkg.id}/`, { is_recommended: !pkg.is_recommended }); loadData() }
        catch { toast.error('Failed to update') }
    }

    const addInclusion = (item?: string) => {
        const val = (item || inclusionInput).trim()
        if (!val || editing?.inclusions?.includes(val)) return
        setEditing((p: any) => ({ ...p, inclusions: [...(p?.inclusions || []), val] }))
        if (!item) setInclusionInput('')
    }

    const applyTier = (tier: string) => {
        if (tier === 'Custom') return
        const preset = TIER_PRESETS[tier]
        if (preset) setEditing((p: any) => ({ ...p, ...preset }))
    }

    const set = (field: string, value: any) => setEditing((p: any) => ({ ...p, [field]: value }))

    if (loading && packages.length === 0) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <CircularProgress size={32} />
        </div>
    )

    const openCreate = () => {
        setEditing({ ...emptyPkg, hall: halls[0]?.id || '', guest_tiers: [...DEFAULT_GUEST_TIERS] })
        setIsCreating(true)
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Booking Packages</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Create and manage event packages for your halls</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} title="Refresh"
                        className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={openCreate} disabled={halls.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm disabled:opacity-50">
                        <Plus className="w-4 h-4" /> New Package
                    </button>
                </div>
            </div>

            {halls.length === 0 && !loading && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-amber-800 dark:text-amber-400 mb-8">
                    <p className="font-semibold mb-1">No halls found</p>
                    <p className="text-sm">You need to add a hall before creating packages.</p>
                </div>
            )}

            {/* Hall Filter */}
            {halls.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
                    {[{ id: 'all', name: 'All Venues' }, ...halls].map(h => (
                        <button key={h.id} onClick={() => setHallFilter(h.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${hallFilter === h.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-white/5 hover:border-indigo-300'}`}>
                            {h.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Package Grid */}
            {packages.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl py-20 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No packages yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-2">
                        Create packages like "Silver", "Gold", or "Royal" to offer curated experiences.
                    </p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {packages.filter(p => hallFilter === 'all' || p.hall === hallFilter).map((pkg, i) => {
                        const hall = halls.find(h => h.id === pkg.hall)
                        const bc = pkg.badge_color || '#7C3AED'
                        return (
                            <motion.div key={pkg.id}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className={`bg-white dark:bg-gray-900 border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative ${pkg.is_recommended ? 'border-indigo-500/50' : 'border-gray-100 dark:border-white/5'}`}>
                                <div className="h-1.5" style={{ background: bc }} />
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">{pkg.name}</h3>
                                                {pkg.is_recommended && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                                                {!pkg.is_active && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-bold">DRAFT</span>}
                                            </div>
                                            <div className="text-2xl font-black" style={{ color: bc }}>₹{parseFloat(pkg.price).toLocaleString('en-IN')}</div>
                                            <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-gray-500">
                                                <Building className="w-3 h-3" />{hall?.name || '—'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={() => toggleRecommended(pkg)}
                                                className={`p-2 rounded-xl transition-colors text-xs font-bold ${pkg.is_recommended ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-400 hover:text-yellow-400'}`}>
                                                {pkg.is_recommended ? 'Featured' : 'Feature'}
                                            </button>
                                            <button onClick={() => { setEditing({ ...pkg }); setIsCreating(false) }}
                                                className="p-2 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => { setClonePkg(pkg); setCloneHallIds([]) }}
                                                className="p-2 rounded-xl text-gray-400 hover:text-green-500 hover:bg-green-500/10 transition-colors">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(pkg.id)}
                                                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <div className="bg-gray-50 dark:bg-white/5 p-2.5 rounded-2xl">
                                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Capacity</div>
                                            <div className="text-sm font-bold text-gray-700 dark:text-gray-200">{pkg.max_people} Guests</div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-white/5 p-2.5 rounded-2xl">
                                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Duration</div>
                                            <div className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                {pkg.duration_mode === 'open_ended' ? 'Open-ended' : `${pkg.duration_hours}h`}
                                            </div>
                                        </div>
                                    </div>
                                    {pkg.inclusions?.slice(0, 4).map((item, idx) => (
                                        <div key={idx} className="text-xs text-gray-500 flex items-center gap-2 mb-1">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: bc }} />{item}
                                        </div>
                                    ))}
                                    {pkg.inclusions?.length > 4 && (
                                        <div className="text-xs font-bold mt-1" style={{ color: bc }}>+{pkg.inclusions.length - 4} more</div>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
            <AnimatePresence>
                {editing && (() => {
                    const selectedHall = halls.find(h => h.id === editing.hall)
                    return (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
                            <motion.div initial={{ scale: 0.95, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 24 }}
                                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl relative">

                                {/* ── Modal Header ── */}
                                <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/5 px-8 py-5 flex items-center justify-between rounded-t-[2rem]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: (editing.badge_color || '#7C3AED') + '20' }}>
                                            <Package className="w-5 h-5" style={{ color: editing.badge_color || '#7C3AED' }} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                                {isCreating ? 'Create new package' : 'Edit package'}
                                            </h2>
                                            <p className="text-xs text-gray-400">{selectedHall?.name || 'Select a hall'} · Packages shown to customers during booking</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full font-medium">
                                            <Eye className="w-3 h-3" /> Live preview below
                                        </span>
                                        <button onClick={() => { setEditing(null); setIsCreating(false) }}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="px-8 py-6 space-y-8">
                                    {/* ── BASIC DETAILS ── */}
                                    <div>
                                        <SectionLabel>Basic Details</SectionLabel>
                                        <div className="space-y-4">
                                            {/* Hall */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Hall</label>
                                                <FormControl fullWidth size="small">
                                                    <Select value={editing.hall || ''} onChange={e => set('hall', e.target.value)} sx={{ borderRadius: '14px' }}>
                                                        {halls.map(h => <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>)}
                                                    </Select>
                                                </FormControl>
                                            </div>
                                            {/* Name + Tier */}
                                            <div className="grid sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Package name <span className="text-red-500">*</span></label>
                                                    <input type="text" value={editing.name || ''} onChange={e => set('name', e.target.value)}
                                                        placeholder="Gold, Royal, Premium..."
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Package tier</label>
                                                    <select onChange={e => applyTier(e.target.value)} defaultValue="Custom"
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm">
                                                        <option value="Custom">Custom</option>
                                                        {Object.keys(TIER_PRESETS).map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            {/* Description */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Short description</label>
                                                <div className="relative">
                                                    <textarea value={editing.description || ''} maxLength={80}
                                                        onChange={e => set('description', e.target.value)}
                                                        placeholder="Perfect for birthdays and anniversaries..."
                                                        rows={2}
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm resize-none" />
                                                    <span className="absolute bottom-2 right-3 text-[10px] text-gray-400">{(editing.description || '').length} / 80</span>
                                                </div>
                                            </div>
                                            {/* Badge Color */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block">Badge color</label>
                                                <div className="flex gap-2">
                                                    {BADGE_COLORS.map(c => (
                                                        <button key={c} type="button" onClick={() => set('badge_color', c)}
                                                            className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                                                            style={{ background: c }}>
                                                            {editing.badge_color === c && <Check className="w-4 h-4 text-white" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── PRICING ── */}
                                    <div>
                                        <SectionLabel>Pricing</SectionLabel>
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            {[
                                                { label: 'Base price', field: 'price', prefix: '₹', type: 'number', required: true },
                                                { label: 'Max people', field: 'max_people', prefix: '', type: 'number', required: true },
                                                { label: 'Extra guest rate', field: 'duration_hours', prefix: '₹', type: 'number', required: false },
                                            ].map(({ label, field, prefix, type, required }) => (
                                                <div key={field}>
                                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">
                                                        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                                                    </label>
                                                    <div className="relative">
                                                        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">{prefix}</span>}
                                                        <input type={type} value={editing[field] || ''}
                                                            onChange={e => set(field, field === 'price' ? e.target.value : Number(e.target.value))}
                                                            className={`w-full py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm ${prefix ? 'pl-7 pr-3' : 'px-3'}`} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Guest Tiers */}
                                        <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                                Guest Tiers <span className="text-gray-400 normal-case font-normal">(optional — different rates for group sizes)</span>
                                            </p>
                                            <div className="space-y-2.5">
                                                {(editing.guest_tiers || DEFAULT_GUEST_TIERS).map((tier: GuestTier, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <span className="text-xs font-semibold text-gray-500 w-24 flex-shrink-0">
                                                            {tier.min}–{tier.max} guests
                                                        </span>
                                                        <div className="flex-1 relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                                            <input type="number" value={tier.price || ''}
                                                                placeholder="0"
                                                                onChange={e => {
                                                                    const tiers = [...(editing.guest_tiers || DEFAULT_GUEST_TIERS)]
                                                                    tiers[idx] = { ...tiers[idx], price: Number(e.target.value) }
                                                                    set('guest_tiers', tiers)
                                                                }}
                                                                className="w-full pl-7 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                                                        </div>
                                                        <span className="text-xs text-gray-400 flex-shrink-0">/ booking</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── DURATION ── */}
                                    <div>
                                        <SectionLabel>Duration</SectionLabel>
                                        {/* Mode Tabs */}
                                        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl mb-4">
                                            {(['by_slots', 'fixed_hours', 'open_ended'] as const).map(mode => (
                                                <button key={mode} type="button" onClick={() => set('duration_mode', mode)}
                                                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${editing.duration_mode === mode
                                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                                                        : 'text-gray-500 hover:text-gray-700'}`}>
                                                    {mode === 'by_slots' ? 'By slots' : mode === 'fixed_hours' ? 'Fixed hours' : 'Open-ended'}
                                                </button>
                                            ))}
                                        </div>

                                        {editing.duration_mode === 'by_slots' && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-2">Customer picks slots freely. Set a minimum if needed.</p>
                                                <div className="flex gap-2">
                                                    {[null, 1, 2, 3].map(v => (
                                                        <button key={String(v)} type="button" onClick={() => set('min_slots', v)}
                                                            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${editing.min_slots === v
                                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                                                                : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-indigo-300'}`}>
                                                            {v === null ? 'No min' : `${v} slot${v > 1 ? 's' : ''}`}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {editing.duration_mode === 'fixed_hours' && (
                                            <div className="grid sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">Fixed hours</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[1, 2, 3, 4, 6, 8].map(h => (
                                                            <button key={h} type="button" onClick={() => set('fixed_hours', h)}
                                                                className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all ${editing.fixed_hours === h
                                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                                                                    : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-indigo-300'}`}>
                                                                {h}h
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">Overtime rate (₹/hr)</label>
                                                    <input type="number" value={editing.overtime_rate || ''}
                                                        onChange={e => set('overtime_rate', Number(e.target.value))}
                                                        placeholder="e.g. 500"
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                                                </div>
                                            </div>
                                        )}

                                        {editing.duration_mode === 'open_ended' && (
                                            <div className="grid sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">Price per hour (₹)</label>
                                                    <input type="number" value={editing.price_per_hour || ''}
                                                        onChange={e => set('price_per_hour', Number(e.target.value))}
                                                        placeholder="e.g. 800"
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">Max hours</label>
                                                    <input type="number" value={editing.max_hours || ''}
                                                        onChange={e => set('max_hours', Number(e.target.value))}
                                                        placeholder="e.g. 8"
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── INCLUSIONS ── */}
                                    <div>
                                        <SectionLabel>Inclusions</SectionLabel>
                                        <div className="flex gap-2 mb-3">
                                            <input value={inclusionInput} onChange={e => setInclusionInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInclusion())}
                                                placeholder="Type an inclusion then press Enter..."
                                                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                                            <button type="button" onClick={() => addInclusion()}
                                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-colors font-bold text-sm">
                                                Add
                                            </button>
                                        </div>
                                        {/* Quick add presets */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {INCLUSION_PRESETS.filter(p => !editing.inclusions?.includes(p)).map(p => (
                                                <button key={p} type="button" onClick={() => addInclusion(p)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 text-gray-500 rounded-full text-xs font-semibold transition-colors">
                                                    <Plus className="w-3 h-3" />{p}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Added inclusions chips */}
                                        <div className="flex flex-wrap gap-2">
                                            {editing.inclusions?.map((item: string, i: number) => (
                                                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold">
                                                    {item}
                                                    <button onClick={() => set('inclusions', editing.inclusions.filter((_: any, idx: number) => idx !== i))}
                                                        className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ── SETTINGS ── */}
                                    <div>
                                        <SectionLabel>Settings</SectionLabel>
                                        {/* Visibility */}
                                        <div className="mb-5">
                                            <p className="text-xs font-bold text-gray-500 mb-2">Visibility</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {([
                                                    { val: 'public', label: 'Public', icon: Eye, desc: 'All customers' },
                                                    { val: 'members_only', label: 'Members only', icon: Lock, desc: 'Registered users' },
                                                    { val: 'hidden', label: 'Hidden', icon: EyeOff, desc: 'Not shown' },
                                                ] as const).map(({ val, label, icon: Icon, desc }) => (
                                                    <button key={val} type="button" onClick={() => set('visibility', val)}
                                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-center transition-all ${editing.visibility === val
                                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                                                            : 'border-gray-200 dark:border-white/10 text-gray-400 hover:border-indigo-300'}`}>
                                                        <Icon className="w-4 h-4" />
                                                        <span className="text-xs font-bold">{label}</span>
                                                        <span className="text-[10px] text-gray-400">{desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Toggles */}
                                        <div className="space-y-3">
                                            {([
                                                { field: 'is_recommended', label: 'Featured package', desc: 'Highlighted to customers as recommended', icon: Star },
                                                { field: 'advance_booking_required', label: 'Advance booking required', desc: 'Block same-day bookings for this package', icon: ChevronRight },
                                                { field: 'allow_extra_guests', label: 'Allow extra guests', desc: 'Guests can bring additional people (extra fee)', icon: ChevronRight },
                                            ] as const).map(({ field, label, desc }) => (
                                                <label key={field} className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl cursor-pointer">
                                                    <Toggle on={!!editing[field]} onChange={() => set(field, !editing[field])} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{label}</div>
                                                        <div className="text-xs text-gray-400">{desc}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ── LIVE PREVIEW ── */}
                                    <div>
                                        <SectionLabel>Live Preview</SectionLabel>
                                        <p className="text-xs text-gray-400 mb-3">This is how customers see your package during booking</p>
                                        <LivePreview pkg={editing} hallName={selectedHall?.name || ''} />
                                    </div>
                                </div>

                                {/* ── Footer Buttons ── */}
                                <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-white/5 px-8 py-4 flex gap-3 rounded-b-[2rem]">
                                    <button type="button" onClick={() => { setEditing(null); setIsCreating(false) }}
                                        className="px-5 py-3 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm">
                                        Cancel
                                    </button>
                                    {isCreating && (
                                        <button type="button" onClick={() => handleSave(true)} disabled={savingDraft}
                                            className="px-5 py-3 border-2 border-indigo-500 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-sm disabled:opacity-50 flex items-center gap-2">
                                            {savingDraft ? <CircularProgress size={16} color="inherit" /> : <Save className="w-4 h-4" />}
                                            Save as draft
                                        </button>
                                    )}
                                    <button type="button" onClick={() => handleSave(false)} disabled={saving}
                                        className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 text-sm">
                                        {saving ? <CircularProgress size={18} color="inherit" /> : null}
                                        {saving ? 'Saving...' : isCreating ? 'Create Package' : 'Save Changes'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                })()}
            </AnimatePresence>

            {/* ── Clone to Halls Modal ── */}
            <AnimatePresence>
                {clonePkg && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative">
                            <button onClick={() => { setClonePkg(null); setCloneHallIds([]) }}
                                className="absolute top-5 right-5 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-11 h-11 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                                    <Copy className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Copy Package to Halls</h2>
                                    <p className="text-sm text-gray-500">Copying: <span className="font-semibold text-indigo-600">{clonePkg.name}</span></p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Select target halls. Already existing packages with the same name will be skipped.</p>
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {halls.filter(h => h.id !== clonePkg.hall).map(hall => {
                                    const checked = cloneHallIds.includes(hall.id)
                                    return (
                                        <button key={hall.id} onClick={() => setCloneHallIds(prev => checked ? prev.filter(id => id !== hall.id) : [...prev, hall.id])}
                                            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${checked ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-100 dark:border-white/5 hover:border-indigo-300'}`}>
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {checked && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{hall.name}</span>
                                        </button>
                                    )
                                })}
                                {halls.filter(h => h.id !== clonePkg.hall).length === 0 && (
                                    <p className="text-center text-gray-400 py-6 text-sm">No other halls available.</p>
                                )}
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => { setClonePkg(null); setCloneHallIds([]) }}
                                    className="flex-1 py-3 border border-gray-200 dark:border-white/10 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleClone} disabled={cloning || cloneHallIds.length === 0}
                                    className="flex-[2] py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                                    {cloning ? <CircularProgress size={18} color="inherit" /> : <Copy className="w-4 h-4" />}
                                    {cloning ? 'Copying...' : `Copy to ${cloneHallIds.length} Hall${cloneHallIds.length !== 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
