'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    MapPin, Users, Star, Wifi, Wind, Car, Projector,
    Volume2, Sparkles, Zap, ArrowLeft, Calendar, Clock,
    CheckCircle, ShoppingCart,
} from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'
import api from '@/lib/api'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { Box, Typography } from '@mui/material'

const MapView = dynamic(() => import('@/components/shared/MapView'), {
    ssr: false,
    loading: () => (
        <Box sx={{ height: 300, bgcolor: 'grey.100', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">Loading map...</Typography>
        </Box>
    )
})

import BookingWizard from '@/components/booking/BookingWizard'

interface Slot {
    id: string
    date: string
    start_time: string
    end_time: string
    status: string
    price_override: string | null
}

interface Package {
    id: string
    name: string
    price: string
    duration_hours: number
    max_people: number
    inclusions: string[]
    is_recommended: boolean
}

interface Hall {
    id: string
    name: string
    description: string
    address: string
    city: string
    pincode: string
    latitude: number | null
    longitude: number | null
    capacity_min: number
    base_capacity: number
    capacity_max: number
    opening_time: string
    closing_time: string
    price_per_slot: string
    hourly_rate: string
    extra_guest_fee: string
    rating_avg: string
    total_reviews: number
    amenity_projector: boolean
    amenity_sound_system: boolean
    amenity_wifi: boolean
    amenity_decoration: boolean
    amenity_ac: boolean
    amenity_parking: boolean
    amenity_led_letters: boolean
    amenity_fog_machine: boolean
    refund_percentage_3h: number
    refund_percentage_2h: number
    refund_percentage_1h: number
    instant_confirmation: boolean
    images: { id: string; url: string; image?: string; is_primary: boolean; caption: string }[]
    packages: Package[]
    addon_services: any[]
}

const AMENITY_MAP = [
    { key: 'amenity_projector',    label: 'Projector',       icon: Projector },
    { key: 'amenity_sound_system', label: 'Sound System',    icon: Volume2 },
    { key: 'amenity_wifi',         label: 'WiFi',            icon: Wifi },
    { key: 'amenity_decoration',   label: 'Decoration',      icon: Sparkles },
    { key: 'amenity_ac',           label: 'Air Conditioning',icon: Wind },
    { key: 'amenity_parking',      label: 'Parking',         icon: Car },
    { key: 'amenity_led_letters',  label: 'LED Letters',     icon: Zap },
    { key: 'amenity_fog_machine',  label: 'Fog Machine',     icon: Zap },
]

interface Props {
    hall: Hall
    hallId: string
}

export default function HallDetailClient({ hall, hallId }: Props) {
    const router       = useRouter()
    const searchParams = useSearchParams()

    const [activeImg, setActiveImg]         = useState(0)
    const [selectedDate, setSelectedDate]   = useState('')
    const [slots, setSlots]                 = useState<Slot[]>([])
    const [slotsLoading, setSlotsLoading]   = useState(false)
    const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(new Set())
    const [selectedPackage, setSelectedPackage]   = useState<Package | null>(
        hall.packages?.find(p => p.is_recommended) || hall.packages?.[0] || null
    )
    const [locking, setLocking]             = useState(false)
    const [isMounted, setIsMounted]         = useState(false)
    const [restoredWizardDraft, setRestoredWizardDraft] = useState<any>(null)

    // 7-day advance booking minimum
    const minBookingDate = new Date()
    minBookingDate.setDate(minBookingDate.getDate() + 7)
    const minDateStr = minBookingDate.toISOString().split('T')[0]

    useEffect(() => { setIsMounted(true) }, [])

    // ── Restore booking draft after login redirect ────────────────────
    useEffect(() => {
        const shouldRestore = searchParams.get('restore') === '1'
        if (!shouldRestore || !hall) return
        try {
            const raw = sessionStorage.getItem(`booking_draft_ui_${hallId}`)
            if (!raw) return
            const draft = JSON.parse(raw)
            const age = Date.now() - (draft.savedAt || 0)
            if (age > 30 * 60 * 1000) { sessionStorage.removeItem(`booking_draft_ui_${hallId}`); return }
            if (draft.selectedDate) setSelectedDate(draft.selectedDate)
            if (draft.selectedSlotKeys?.length) setSelectedSlotKeys(new Set(draft.selectedSlotKeys))
            if (draft.selectedPackageId && hall.packages?.length) {
                const pkg = hall.packages.find(p => p.id === draft.selectedPackageId)
                if (pkg) setSelectedPackage(pkg)
            }
            if (draft.wizardData) setRestoredWizardDraft(draft.wizardData)
            toast.success('Your booking selection has been restored! 🎉', { duration: 3000 })
            sessionStorage.removeItem(`booking_draft_ui_${hallId}`)
            window.history.replaceState({}, '', `/halls/${hallId}`)
            setTimeout(() => {
                document.getElementById('booking-sidebar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 500)
        } catch (e) { console.warn('Could not restore booking draft', e) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    const formatTo12h = (timeStr: string) => {
        if (!timeStr) return ''
        const [hours, minutes] = timeStr.split(':')
        let hr = parseInt(hours)
        const ampm = hr >= 12 ? 'PM' : 'AM'
        hr = hr % 12; hr = hr ? hr : 12
        return `${hr}:${minutes} ${ampm}`
    }

    // Slot loading on date change
    useEffect(() => {
        if (!selectedDate || !hall) return
        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return
        const year = parseInt(selectedDate.split('-')[0])
        if (year < 2020 || year > 2099) return
        setSlotsLoading(true)
        api.get(`/slots/?hall_id=${hall.id}&date=${selectedDate}`)
            .then(res => {
                const rawSlots: Slot[] = res.data.results || res.data
                const expand = (slot: Slot): Slot[] => {
                    const [sh, sm] = slot.start_time.split(':').map(Number)
                    const [eh, em] = slot.end_time.split(':').map(Number)
                    const startMin = sh * 60 + sm, endMin = eh * 60 + em
                    if (endMin - startMin <= 60) return [slot]
                    const subSlots: Slot[] = []
                    for (let m = startMin; m + 60 <= endMin; m += 60) {
                        const sH = String(Math.floor(m / 60)).padStart(2, '0'), sM = String(m % 60).padStart(2, '0')
                        const eH = String(Math.floor((m + 60) / 60)).padStart(2, '0'), eM = String((m + 60) % 60).padStart(2, '0')
                        subSlots.push({ id: slot.id, date: slot.date, start_time: `${sH}:${sM}:00`, end_time: `${eH}:${eM}:00`, status: slot.status, price_override: slot.price_override })
                    }
                    return subSlots
                }
                const data = rawSlots.flatMap(expand)
                setSlots(data)
                const available = data.filter(s => s.status === 'available').length
                const booked    = data.filter(s => s.status === 'booked').length
                const locked    = data.filter(s => s.status === 'locked').length
                if (data.length === 0) toast.info('No slots available for this date.')
                else if (available === 0) toast.error('All slots are fully booked for this date!')
                else if (booked > 0 || locked > 0) toast(`✅ ${available} slot${available > 1 ? 's' : ''} available`, { icon: '📅' })
                else toast.success(`All ${available} slot${available > 1 ? 's are' : ' is'} available!`)
            })
            .catch(() => { setSlots([]); toast.error('Could not load slots. Please try again.') })
            .finally(() => setSlotsLoading(false))
    }, [selectedDate, hall])

    const toggleSlotSelection = (slot: Slot) => {
        if (slot.status === 'booked') { toast.error('🚫 Slot is already booked'); return }
        if (slot.status === 'locked') { toast.warning('⏳ Slot is temporarily held'); return }
        setSelectedSlotKeys(prev => {
            const next = new Set(prev)
            if (next.has(slot.start_time)) next.delete(slot.start_time)
            else next.add(slot.start_time)
            return next
        })
    }

    const groupConsecutive = () => {
        const selected = slots.filter(s => selectedSlotKeys.has(s.start_time))
        if (selected.length === 0) return []
        const sorted = [...selected].sort((a, b) => a.start_time.localeCompare(b.start_time))
        const groups: Slot[][] = []; let cur: Slot[] = [sorted[0]]
        for (let i = 1; i < sorted.length; i++) {
            const prev = cur[cur.length - 1]
            if (prev.end_time.slice(0, 5) === sorted[i].start_time.slice(0, 5)) cur.push(sorted[i])
            else { groups.push(cur); cur = [sorted[i]] }
        }
        groups.push(cur); return groups
    }

    const slotGroups = groupConsecutive()
    const removeGroup = (group: Slot[]) => {
        setSelectedSlotKeys(prev => { const next = new Set(prev); group.forEach(s => next.delete(s.start_time)); return next })
    }

    const firstSelectedSlot = slots.find(s => selectedSlotKeys.has(s.start_time)) || null
    const mergedSlot: Slot | null = firstSelectedSlot ? {
        id: firstSelectedSlot.id, date: firstSelectedSlot.date,
        start_time: firstSelectedSlot.start_time, end_time: firstSelectedSlot.end_time,
        status: 'available', price_override: null,
    } : null

    const getFullImageUrl = (url: string) => {
        if (!url) return ''
        // Relative /media/... paths are proxied by Next.js rewrite → backend:8000/media/...
        if (url.startsWith('/')) return url
        // Already absolute (external URL) — return unchanged
        if (url.startsWith('http')) return url
        return `/${url}`
    }

    const images = hall.images?.length ? hall.images : [{ id: '0', url: '', is_primary: true, caption: '' }]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <div className="flex items-center justify-between mb-6">
                    <Link href="/halls" className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-purple-600 text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Halls
                    </Link>
                    {/* Mobile-only quick-jump to booking panel — hidden on lg+ where sticky sidebar is visible */}
                    <a
                        href="#booking-sidebar"
                        className="lg:hidden inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-md shadow-purple-500/30 transition-all active:scale-95"
                    >
                        Book this Hall ↓
                    </a>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left — Images + Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Gallery */}
                        <div className="rounded-2xl overflow-hidden shadow-sm">
                            <div className="relative h-72 sm:h-96 bg-gradient-to-br from-purple-100 to-pink-100">
                                {images[activeImg]?.image || images[activeImg]?.url ? (
                                    <img src={getFullImageUrl(images[activeImg].image || images[activeImg].url)}
                                        alt={hall.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-8xl">🎉</div>
                                )}
                            </div>
                            {images.length > 1 && (
                                <div className="flex gap-2 p-3 bg-white dark:bg-gray-800 overflow-x-auto">
                                    {images.map((img, i) => (
                                        <button key={img.id} onClick={() => setActiveImg(i)}
                                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-purple-500' : 'border-transparent hover:border-purple-200'}`}>
                                            {img.image || img.url
                                                ? <img src={getFullImageUrl(img.image || img.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full bg-purple-100 flex items-center justify-center text-2xl">🎉</div>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hall Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{hall.name}</h1>
                                {parseFloat(hall.rating_avg) > 0 && (
                                    <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-xl">
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                        <span className="font-bold text-gray-800 dark:text-gray-100">{Number(hall.rating_avg).toFixed(1)}</span>
                                        <span className="text-gray-500 dark:text-gray-400 text-sm">({hall.total_reviews} reviews)</span>
                                    </div>
                                )}
                                {hall.instant_confirmation && (
                                    <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-xl border border-green-100 dark:border-green-700/40">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-green-700 dark:text-green-400 text-sm font-bold">Instant Confirmation</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mb-4">
                                <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-purple-400" />{hall.address}, {hall.city} — {hall.pincode}</span>
                                <span className="flex items-center gap-1"><Users className="w-4 h-4 text-purple-400" />{hall.capacity_min}–{hall.capacity_max} people</span>
                                <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-purple-400" />{formatTo12h(hall.opening_time)} – {formatTo12h(hall.closing_time)}</span>
                            </div>
                            {hall.description && <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{hall.description}</p>}
                        </div>

                        {/* Amenities */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Amenities</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {AMENITY_MAP.filter(a => hall[a.key as keyof Hall]).map(({ key, label, icon: Icon }) => (
                                    <div key={key} className="flex items-center gap-2 py-2 px-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                        <Icon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Packages */}
                        {hall.packages?.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Packages</h2>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {hall.packages.map(pkg => (
                                        <button key={pkg.id} onClick={() => setSelectedPackage(pkg)}
                                            className={`text-left p-4 rounded-xl border-2 transition-all ${selectedPackage?.id === pkg.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-purple-200 dark:hover:border-purple-400'}`}>
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <span className="font-bold text-gray-900 dark:text-white">{pkg.name}</span>
                                                    {pkg.is_recommended && <span className="ml-2 text-xs bg-gradient-to-r from-purple-500 to-pink-400 text-white px-2 py-0.5 rounded-full">Best Value</span>}
                                                </div>
                                                <span className="font-bold text-purple-600 text-lg">₹{parseFloat(pkg.price).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{pkg.duration_hours}h · Up to {pkg.max_people} people</div>
                                            <ul className="space-y-1">
                                                {pkg.inclusions.slice(0, 3).map((inc, i) => (
                                                    <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{inc}
                                                    </li>
                                                ))}
                                            </ul>
                                            {selectedPackage?.id === pkg.id && (
                                                <div className="mt-2 text-xs text-purple-600 font-semibold flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Selected
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Map */}
                        {hall.latitude && hall.longitude && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-purple-500" /> Location
                                </h2>
                                <MapView lat={hall.latitude} lng={hall.longitude} title={hall.name} height="350px" />
                                <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" />{hall.address}, {hall.city}
                                </div>
                            </div>
                        )}

                        {/* Cancellation Policy */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Cancellation Policy</h2>
                            <div className="space-y-2">
                                {[
                                    { label: '3+ hours before',  pct: hall.refund_percentage_3h },
                                    { label: '2–3 hours before', pct: hall.refund_percentage_2h },
                                    { label: 'Under 2 hours',    pct: hall.refund_percentage_1h },
                                ].map(({ label, pct }) => (
                                    <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
                                        <span className={`text-sm font-bold ${pct > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{pct}% refund</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right — Booking Panel */}
                    <div className="lg:col-span-1">
                        {/* ISSUE #9 fix: sticky only on lg+ where browser chrome is stable.
                             On mobile, the panel flows in document order (below hall info).
                             The "Book this Hall ↓" button above lets mobile users jump here. */}
                        <div id="booking-sidebar" className="lg:sticky lg:top-24 space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                    <Calendar className="w-4 h-4 inline mr-1 text-purple-500" />1. Select Date
                                </label>
                                <input type="date" value={selectedDate} min={minDateStr}
                                    onChange={e => { setSelectedDate(e.target.value); setSelectedSlotKeys(new Set()) }}
                                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                                <p className="text-xs text-orange-500 font-medium mt-1">⚠️ Bookings must be made at least 7 days in advance</p>
                            </div>

                            {selectedDate && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 space-y-4">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                        <Clock className="w-4 h-4 inline mr-1 text-purple-500" />2. Pick Time Slots
                                    </label>
                                    <p className="text-xs text-gray-400 mb-3">Select one or more slots — minimum 1 slot (1 hour).</p>
                                    {/* Legend */}
                                    <div className="flex items-center gap-3 text-xs mb-3 flex-wrap">
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-600 inline-block" />Selected</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-200 border border-red-400 inline-block" />Booked</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-400 inline-block" />Held</span>
                                    </div>
                                    {/* Slot grid */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {slotsLoading ? (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                                            ))
                                        ) : slots.length > 0 ? (
                                            slots.map(slot => {
                                                const isBooked   = slot.status === 'booked'
                                                const isLocked   = slot.status === 'locked'
                                                const isSelected = selectedSlotKeys.has(slot.start_time)
                                                let chipCls = ''
                                                if (isSelected) chipCls = 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-300 dark:ring-purple-500'
                                                else if (isBooked) chipCls = 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-300 dark:border-red-700 cursor-not-allowed opacity-70'
                                                else if (isLocked) chipCls = 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-300 dark:border-amber-700 cursor-not-allowed opacity-70'
                                                else chipCls = 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300'
                                                return (
                                                    <button key={slot.start_time} onClick={() => toggleSlotSelection(slot)}
                                                        disabled={isBooked || isLocked}
                                                        className={`rounded-xl border-2 p-2 min-h-[44px] text-center text-xs font-semibold transition-all duration-150 ${chipCls}`}>
                                                        <div className="font-bold text-[11px] leading-tight">{formatTo12h(slot.start_time)}</div>
                                                        <div className="text-[10px] opacity-70 mt-0.5">– {formatTo12h(slot.end_time)}</div>
                                                        {isBooked && <div className="text-[9px] font-bold text-red-500 mt-0.5">Booked</div>}
                                                        {isLocked && <div className="text-[9px] font-bold text-amber-500 mt-0.5">Held</div>}
                                                    </button>
                                                )
                                            })
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center py-4 col-span-3">No slots available for this date.</p>
                                        )}
                                    </div>
                                    {/* Selected slot tags */}
                                    <div className="mt-3">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Selected slots</p>
                                        {slotGroups.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic bg-gray-50 dark:bg-gray-700/30 rounded-xl px-4 py-3">No slots selected yet</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {slotGroups.map((group, gi) => (
                                                    <span key={gi} className="inline-flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full px-3 py-1.5 border border-purple-200 dark:border-purple-700">
                                                        {group.length > 1
                                                            ? `${formatTo12h(group[0].start_time)} – ${formatTo12h(group[group.length - 1].end_time)}`
                                                            : `${formatTo12h(group[0].start_time)} – ${formatTo12h(group[0].end_time)}`}
                                                        <span className="text-[10px] opacity-60">· {group.length}h</span>
                                                        <button onClick={() => removeGroup(group)}
                                                            className="ml-0.5 w-4 h-4 rounded-full bg-purple-300 dark:bg-purple-600 text-purple-900 dark:text-white hover:bg-purple-400 flex items-center justify-center text-[10px] font-bold">×</button>
                                                    </span>
                                                ))}
                                                <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 font-semibold px-2">
                                                    {selectedSlotKeys.size} slot{selectedSlotKeys.size > 1 ? 's' : ''} · {selectedSlotKeys.size}h total
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedSlotKeys.size > 0 && mergedSlot && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                    <BookingWizard
                                        hall={hall}
                                        slot={mergedSlot}
                                        selectedPackage={selectedPackage}
                                        allSelectedSlots={slots.filter(s => selectedSlotKeys.has(s.start_time))}
                                        initialDraft={restoredWizardDraft}
                                        onComplete={async (data) => {
                                            const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
                                            if (!token) {
                                                try {
                                                    sessionStorage.setItem(`booking_draft_ui_${hallId}`, JSON.stringify({
                                                        selectedDate, selectedSlotKeys: Array.from(selectedSlotKeys),
                                                        selectedPackageId: selectedPackage?.id || null, savedAt: Date.now(),
                                                        wizardData: { guest_count: data.guest_count, start_time: data.start_time, end_time: data.end_time, addon_ids: data.addon_ids, addon_quantities: data.addon_quantities },
                                                    }))
                                                } catch (e) { console.warn('Could not save booking draft', e) }
                                                toast.info('🔒 Please log in to book a hall')
                                                router.push(`/login?redirect=/halls/${hallId}&restore=1`)
                                                return
                                            }
                                            setLocking(true)
                                            try {
                                                const allSelectedSlots = slots.filter(s => selectedSlotKeys.has(s.start_time))
                                                const sorted = [...allSelectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time))

                                                // Lock ALL selected slots (non-contiguous multi-slot support)
                                                const uniqueSlotIds = [...new Set(allSelectedSlots.map(s => s.id))]
                                                for (const slotId of uniqueSlotIds) {
                                                    await api.post(`/slots/${slotId}/lock/`)
                                                }

                                                sessionStorage.setItem('booking_draft', JSON.stringify({
                                                    hall_id: hall.id, hall_name: hall.name,
                                                    slot_id: uniqueSlotIds[0],
                                                    slot_ids: uniqueSlotIds,
                                                    slot_keys: Array.from(selectedSlotKeys), slot_date: selectedDate,
                                                    start_time: sorted[0]?.start_time || mergedSlot.start_time,
                                                    end_time: sorted[sorted.length - 1]?.end_time || mergedSlot.end_time,
                                                    duration_hours: uniqueSlotIds.length,
                                                    // Store each slot's individual time for display
                                                    selected_slot_times: sorted.map(s => ({ start: s.start_time, end: s.end_time })),
                                                    guest_count: data.guest_count,
                                                    addon_ids: data.addon_ids, addon_quantities: data.addon_quantities,
                                                    pricing: data.pricing,
                                                    package_id: selectedPackage?.id || data.package_id || null,
                                                    package_name: selectedPackage?.name || data.package_name || null,
                                                    package_price: selectedPackage?.price || null,
                                                    // Same event / separate events mode
                                                    same_event: data.same_event ?? true,
                                                }))
                                                toast.success('Slot locked! Proceeding to checkout.')
                                                router.push('/booking/checkout')

                                            } catch (err: any) {
                                                const msg = err.response?.data?.error || err.response?.data?.detail || 'Booking failed. Please try again.'
                                                const status = err.response?.status
                                                if (status === 409) toast.error(`⚠️ ${msg} Refreshing...`)
                                                else if (status === 401 || status === 403) { toast.error('🔒 Please log in.'); router.push(`/login?redirect=/halls/${hallId}`) }
                                                else toast.error(`❌ ${msg}`)
                                                if (selectedDate) {
                                                    setSlotsLoading(true)
                                                    api.get(`/slots/?hall_id=${hall.id}&date=${selectedDate}`)
                                                        .then(res => { const fresh: Slot[] = res.data.results || res.data; setSlots(fresh) })
                                                        .finally(() => setSlotsLoading(false))
                                                }
                                                setSelectedSlotKeys(new Set())
                                            } finally { setLocking(false) }
                                        }}
                                    />
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
