'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Clock, Users, Sparkles, Utensils,
    ArrowRight, ArrowLeft, CheckCircle, Package,
    CalendarDays, Star,
} from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

interface PricingBreakdown {
    base_price: number
    package_price?: number
    package_unit_price?: number
    slot_count?: number
    package_subtotal?: number
    multi_slot_discount?: number
    multi_slot_discount_pct?: number
    package_total?: number
    duration_hours: number
    extra_guests: number
    extra_guest_total: number
    extra_guest_fee_per_head?: number
    addons_total: number
    gap_hours?: number
    gap_fee_per_hour?: number
    gap_holding_fee?: number
    grand_total: number
}

interface SelectedPackage {
    id: string
    name: string
    price: string
    duration_hours: number
    max_people: number
    inclusions: string[]
    is_recommended: boolean
}

interface BookingWizardProps {
    hall: any
    slot: any
    selectedPackage?: SelectedPackage | null
    allSelectedSlots?: any[]  // ALL selected 1-hour slots (non-contiguous multi-slot support)
    initialDraft?: {
        guest_count?: number
        start_time?: string
        end_time?: string
        addon_ids?: string[]
        addon_quantities?: Record<string, number>
    } | null
    onComplete: (data: any) => void
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt12 = (t: string) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    let hr = parseInt(h)
    const ap = hr >= 12 ? 'PM' : 'AM'
    hr = hr % 12 || 12
    return `${hr}:${m} ${ap}`
}

const inr = (n?: number) =>
    n !== undefined ? `₹${n.toLocaleString('en-IN')}` : '—'

// ─── Animated step pill header ────────────────────────────────────────────────
function StepPills({ steps, current }: { steps: { icon: React.ReactNode; label: string }[]; current: number }) {
    return (
        <div className="flex items-center justify-between px-5 pt-5 pb-4 gap-1">
            {steps.map((s, i) => {
                const done = i + 1 < current
                const active = i + 1 === current
                return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <div className={`
                            w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                            ${done ? 'bg-green-500 shadow-md shadow-green-200' : active ? 'bg-purple-600 shadow-lg shadow-purple-300 dark:shadow-purple-900 scale-110' : 'bg-gray-100 dark:bg-gray-700'}
                        `}>
                            {done
                                ? <CheckCircle className="w-4 h-4 text-white" />
                                : <span className={`${active ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>{s.icon}</span>
                            }
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wide leading-tight text-center transition-all
                            ${active ? 'text-purple-700 dark:text-purple-300' : done ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                            {s.label}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

// ─── TIME SELECTOR ─────────────────────────────────────────────────────────────
function TimeSelector({ label, value, onChange, min, max }: {
    label: string; value: string; onChange: (v: string) => void; min?: string; max?: string
}) {
    const [h, m] = value.split(':')
    const hr24 = parseInt(h)
    const period = hr24 >= 12 ? 'PM' : 'AM'
    const hr12 = hr24 % 12 || 12

    const to24 = (hh: number, mm: string, pp: string) => {
        let hr = hh
        if (pp === 'PM' && hr < 12) hr += 12
        if (pp === 'AM' && hr === 12) hr = 0
        return `${hr.toString().padStart(2, '0')}:${mm}:00`
    }

    const update = (newH: number, newM: string, newP: string) => {
        const val = to24(newH, newM, newP)
        const minS = min?.substring(0, 8)
        const maxS = max?.substring(0, 8)
        if ((!minS || val >= minS) && (!maxS || val <= maxS)) { onChange(val); return }
        const alt = to24(newH, newM, newP === 'AM' ? 'PM' : 'AM')
        if ((!minS || alt >= minS) && (!maxS || alt <= maxS)) { onChange(alt); return }
        toast.error(minS && val < minS ? `Start from ${fmt12(minS)}` : `Must end by ${fmt12(max || '')}`)
    }

    const sel = 'bg-transparent border-0 text-sm font-bold text-gray-800 dark:text-gray-100 focus:ring-0 outline-none cursor-pointer'

    return (
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl px-3 py-2 shadow-sm">
                <select className={sel} value={hr12} onChange={e => update(parseInt(e.target.value), m, period)}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{String(n).padStart(2,'0')}</option>)}
                </select>
                <span className="text-gray-300 font-bold">:</span>
                <select className={sel} value={m} onChange={e => update(hr12, e.target.value, period)}>
                    {['00','15','30','45'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <div className="flex ml-auto bg-gray-100 dark:bg-gray-700 rounded-xl p-0.5 gap-0.5">
                    {['AM','PM'].map(p => (
                        <button key={p} onClick={() => update(hr12, m, p)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${period === p ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-700'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── ADDON CARD ───────────────────────────────────────────────────────────────
function AddonCard({ addon, isSelected, qty, onToggle, onQtyChange, isFood }: {
    addon: any; isSelected: boolean; qty: number
    onToggle: () => void; onQtyChange: (delta: number) => void; isFood: boolean
}) {
    return (
        <div className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden
            ${isSelected ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-700'}`}>
            <button onClick={onToggle} className="w-full flex items-center justify-between p-4 gap-3 text-left">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                        ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 dark:border-gray-500'}`}>
                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{addon.name}</p>
                        {addon.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{addon.description}</p>}
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {inr(parseFloat(addon.price))}{isFood ? '/plate' : '/booking'}
                    </p>
                </div>
            </button>

            {/* Qty row for food addons */}
            {isFood && isSelected && (
                <div className="flex items-center justify-between px-4 pb-3.5 gap-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {qty} × {inr(parseFloat(addon.price))} =&nbsp;
                        <span className="font-bold text-purple-700 dark:text-purple-300">{inr(qty * parseFloat(addon.price))}</span>
                    </p>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-gray-700 border border-purple-200 dark:border-purple-700 rounded-xl px-2 py-1">
                        <button onClick={() => onQtyChange(-1)} className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 text-purple-700 dark:text-purple-300 text-sm font-black flex items-center justify-center">−</button>
                        <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-gray-100">{qty}</span>
                        <button onClick={() => onQtyChange(1)} className="w-6 h-6 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-black flex items-center justify-center">+</button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── REVIEW ROW ───────────────────────────────────────────────────────────────
function ReviewRow({ label, value, accent, topBorder }: { label: string; value: string; accent?: boolean; topBorder?: boolean }) {
    return (
        <div className={`flex items-center justify-between py-2.5 px-1 ${topBorder ? 'border-t-2 border-gray-200 dark:border-gray-600 mt-1 pt-3' : 'border-b border-gray-100 dark:border-gray-700/60'}`}>
            <span className={`text-sm ${accent ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{label}</span>
            <span className={`text-sm font-bold ${accent ? 'text-xl text-purple-600 dark:text-purple-400' : 'text-gray-800 dark:text-gray-100'}`}>{value}</span>
        </div>
    )
}

// ─── MAIN WIZARD ──────────────────────────────────────────────────────────────
export default function BookingWizard({ hall, slot, selectedPackage, allSelectedSlots, initialDraft, onComplete }: BookingWizardProps) {
    const [step, setStep] = useState(1)
    const [guestCount, setGuestCount] = useState(
        initialDraft?.guest_count ?? selectedPackage?.max_people ?? hall.base_capacity ?? 10
    )
    const [startTime, setStartTime] = useState(initialDraft?.start_time || slot?.start_time || '09:00:00')
    const [endTime, setEndTime] = useState(initialDraft?.end_time || slot?.end_time || '12:00:00')
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(initialDraft?.addon_ids || [])
    const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>(initialDraft?.addon_quantities || {})
    const [pricing, setPricing] = useState<PricingBreakdown | null>(null)
    const [sameEvent, setSameEvent] = useState(true)
    const [isCalculating, setIsCalculating] = useState(false)
    const reqIdRef = useRef(0)
    const abortRef = useRef<AbortController | null>(null)


    // ── Gap detection (computed from allSelectedSlots) ─────────────────────────
    const gapHours = (() => {
        if (!allSelectedSlots || allSelectedSlots.length <= 1) return 0
        const sorted = [...allSelectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time))
        let gapMins = 0
        for (let i = 1; i < sorted.length; i++) {
            const [eh, em] = sorted[i-1].end_time.split(':').map(Number)
            const [sh, sm] = sorted[i].start_time.split(':').map(Number)
            const gap = (sh * 60 + sm) - (eh * 60 + em)
            if (gap > 0) gapMins += gap
        }
        return gapMins / 60
    })()
    const hasGap = gapHours > 0
    const slotCount = allSelectedSlots?.length || 1

    // Reset sameEvent mode if gaps disappear during slot selection
    useEffect(() => {
        if (!hasGap && !sameEvent) {
            setSameEvent(true)
        }
    }, [hasGap, sameEvent])

    // ── Count separate event segments (groups of consecutive slots) ────────────
    const numSegments = (() => {
        if (!allSelectedSlots || allSelectedSlots.length <= 1) return 1
        const sorted = [...allSelectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time))
        let segs = 1
        for (let i = 1; i < sorted.length; i++) {
            const prevEnd = sorted[i - 1].end_time.replace(/:(\d{2})$/, '') // strip seconds
            const currStart = sorted[i].start_time.replace(/:(\d{2})$/, '')
            if (currStart !== prevEnd) segs++
        }
        return segs
    })()

    useEffect(() => {
        // Don't reset guest count if initialDraft provided
        if (!initialDraft) {
            setGuestCount(selectedPackage?.max_people || hall.base_capacity || 10)
        }
    }, [selectedPackage?.id])

    // When restoring from a draft, jump straight to the Review (last) step once pricing loads
    useEffect(() => {
        if (initialDraft && pricing) {
            setStep(prev => prev === 1 ? 999 : prev) // trigger jump only on first load
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!pricing])



    // ─── Pricing fetch ─────────────────────────────────────────────────────────
    // `overrideSameEvent` lets the toggle buttons pass the NEW value immediately.
    // `reqIdRef` ensures stale out-of-order API responses are never applied.
    const fetchPricing = async (overrideSameEvent?: boolean) => {
        if (!hall?.id) return
        if (abortRef.current) abortRef.current.abort()
        abortRef.current = new AbortController()

        const thisReqId = ++reqIdRef.current
        const _sameEvent = overrideSameEvent !== undefined ? overrideSameEvent : sameEvent
        
        setIsCalculating(true)
        try {
            const r = await api.post('/bookings/calculate_price/', {
                hall_id:                  hall.id,
                package_id:               selectedPackage?.id || null,
                start_time:               startTime,
                end_time:                 endTime,
                guest_count:              guestCount,
                addon_ids:                selectedAddonIds,
                addon_quantities:         addonQuantities,
                slot_count:               slotCount,
                gap_hours:                gapHours,
                same_event:               _sameEvent,
                num_event_segments:       numSegments,
                duration_hours_override:  slotCount > 1 ? slotCount : null,
            }, { signal: abortRef.current.signal })

            if (reqIdRef.current === thisReqId) setPricing(r.data)
        } catch (e: any) {
            if (e.name === 'AbortError' || e.name === 'CanceledError') return
            if (reqIdRef.current === thisReqId) console.error('Pricing error', e?.response?.data)
        } finally {
            if (reqIdRef.current === thisReqId) setIsCalculating(false)
        }
    }

    // Auto-recalculate when time / guests / addons / slots change.
    // Pass current sameEvent explicitly so the closure is never stale.
    useEffect(() => {
        if (!hall?.id) return
        const _se = sameEvent   // capture now, before any async gap
        let cancelled = false
        const t = setTimeout(async () => {
            if (!cancelled) await fetchPricing(_se)
        }, 400)
        return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startTime, endTime, guestCount, selectedAddonIds, addonQuantities,
        selectedPackage?.id, sameEvent, slotCount, gapHours, numSegments, hall?.id])

    const toggleAddon = (id: string, isFood?: boolean) => {
        setSelectedAddonIds(prev => {
            if (prev.includes(id)) {
                setAddonQuantities(q => { const n = { ...q }; delete n[id]; return n })
                return prev.filter(a => a !== id)
            }
            if (isFood) setAddonQuantities(q => ({ ...q, [id]: guestCount }))
            return [...prev, id]
        })
    }

    const updateQty = (id: string, delta: number) =>
        setAddonQuantities(prev => ({ ...prev, [id]: Math.max(1, (prev[id] || 1) + delta) }))

    const addonServices: any[] = hall.addon_services || []
    const hasDecor = addonServices.some(a => a.category !== 'food')
    const hasFood = addonServices.some(a => a.category === 'food')

    // Build step list
    type WizStep = { icon: React.ReactNode; label: string }
    const wizSteps: WizStep[] = [
        { icon: <Clock className="w-4 h-4" />, label: 'Slots' },
        { icon: <Users className="w-4 h-4" />, label: 'People' },
        ...(hasDecor ? [{ icon: <Sparkles className="w-4 h-4" />, label: 'Decor' }] : []),
        ...(hasFood ? [{ icon: <Utensils className="w-4 h-4" />, label: 'Food' }] : []),
        { icon: <Star className="w-4 h-4" />, label: 'Review' },
    ]
    const total = wizSteps.length
    // Clamp step to valid range — important after draft restore sets step to 999
    const currentStep = Math.min(step, total)
    const isLast = currentStep >= total

    // Step content map (which addon tab shows at which step index)
    const decorStep = 3
    const foodStep = hasDecor ? 4 : 3

    const getFullImageUrl = (url: string) => {
        if (!url) return ''
        if (url.startsWith('/')) return url        // relative /media/... → proxied by Next.js
        if (url.startsWith('http')) return url     // external URL — use as-is
        return `/${url}`
    }

    const pkgPrice = selectedPackage ? parseFloat(selectedPackage.price) : 0
    const baseLimit = selectedPackage ? selectedPackage.max_people : (hall.base_capacity || 50)
    const extraGuests = Math.max(0, guestCount - baseLimit)

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700/80 flex flex-col">

            {/* Gradient progress bar */}
            <div className="h-1 bg-gray-100 dark:bg-gray-700">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${((step - 1) / (total - 1)) * 100}%` }} />
            </div>

            {/* Package badge */}
            {selectedPackage && (
                <div className="mx-4 mt-4 flex items-center justify-between gap-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/10 border border-purple-100 dark:border-purple-800/40 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <Package className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <span className="font-bold text-purple-800 dark:text-purple-300 text-sm truncate">
                            {selectedPackage.name} Package
                        </span>
                        {selectedPackage.is_recommended && (
                            <span className="flex-shrink-0 text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full font-bold">
                                Best Value
                            </span>
                        )}
                    </div>
                    <span className="font-black text-purple-700 dark:text-purple-300 text-sm flex-shrink-0">
                        {inr(pkgPrice)}
                    </span>
                </div>
            )}

            {/* Step pills */}
            <StepPills steps={wizSteps} current={step} />

            {/* Divider */}
            <div className="mx-5 border-t border-gray-100 dark:border-gray-700 mb-1" />

            {/* Content */}
            <div className="p-5 flex-1 min-h-[280px]">
                <AnimatePresence mode="wait">

                    {/* ── STEP 1: Duration & Slots ── */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="space-y-5">

                            {/* Multi-slot summary (non-contiguous) */}
                            {allSelectedSlots && allSelectedSlots.length > 1 ? (
                                <>
                                    <div>
                                        <h3 className="text-base font-black text-gray-900 dark:text-white mb-0.5">Your selected slots</h3>
                                        <p className="text-xs text-gray-400">You've picked {allSelectedSlots.length} individual slot{allSelectedSlots.length > 1 ? 's' : ''} — {allSelectedSlots.length}h total.</p>
                                    </div>
                                    <div className="space-y-2">
                                        {[...allSelectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((s, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 rounded-xl px-4 py-2.5">
                                                <CalendarDays className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                                <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                                    {fmt12(s.start_time)} – {fmt12(s.end_time)}
                                                </span>
                                                <span className="ml-auto text-[10px] text-purple-400 font-semibold">1h</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Gap warning + same/separate event toggle */}
                                    {hasGap && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
                                            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
                                                ⚠️ Non-consecutive slots — {gapHours}h gap between sessions
                                            </p>
                                            <p className="text-xs text-amber-600 mb-3">How should add-ons and extras be charged?</p>
                                            <div className="flex gap-2 mb-3">
                                                <button
                                                    onClick={() => {
                                                        setSameEvent(true)
                                                        fetchPricing(true)   // ← immediate, no async gap
                                                    }}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                                        sameEvent ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white dark:bg-gray-800 text-amber-700 border-amber-300 hover:bg-amber-50'
                                                    }`}>
                                                    Same event
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSameEvent(false)
                                                        fetchPricing(false)  // ← immediate, no async gap
                                                    }}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                                        !sameEvent ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white dark:bg-gray-800 text-amber-700 border-amber-300 hover:bg-amber-50'
                                                    }`}>
                                                    {numSegments} separate events
                                                </button>
                                            </div>
                                            {/* Explanation of what each option means */}
                                            <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-3 py-2 leading-relaxed">
                                                {sameEvent ? (
                                                    <span>🔗 <strong>Same event:</strong> Gap holding fee applies ({gapHours}h × ₹{hall.gap_fee_per_hour ?? 200}/hr). Add-ons charged once.</span>
                                                ) : (
                                                    <span>🔀 <strong>Separate events:</strong> No gap fee. Add-ons &amp; extra guests charged ×{numSegments} (once per event). No multi-slot discount.</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {pricing && (
                                        <div className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-xl py-2">
                                            <span className="text-xs text-gray-400">Total duration: </span>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{allSelectedSlots.length}h</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Single slot — show time picker */
                                <>
                                    <div>
                                        <h3 className="text-base font-black text-gray-900 dark:text-white mb-0.5">Pick your time</h3>
                                        <p className="text-xs text-gray-400">Adjust start &amp; end within your selected slot window.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <TimeSelector label="Start Time" value={startTime} onChange={setStartTime} min={slot.start_time} max={endTime} />
                                        <TimeSelector label="End Time" value={endTime} onChange={setEndTime} min={startTime} max={slot.end_time} />
                                    </div>
                                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 rounded-xl px-4 py-2.5">
                                        <CalendarDays className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                        <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                                            Slot window: {fmt12(slot.start_time)} – {fmt12(slot.end_time)}
                                        </p>
                                    </div>
                                    {pricing && (
                                        <div className="text-center">
                                            <span className="text-xs text-gray-400">Duration: </span>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{pricing.duration_hours}h</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* ── STEP 2: Number of People ── */}
                    {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="space-y-5">
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white mb-0.5">Number of people</h3>
                                <p className="text-xs text-gray-400">
                                    {selectedPackage
                                        ? `Package includes up to ${selectedPackage.max_people} people. Extra guests billed at ₹${hall.extra_guest_fee || 50}/person.`
                                        : `Hall fits ${hall.capacity_min}–${hall.capacity_max} guests.`}
                                </p>
                            </div>

                            {/* Big guest counter */}
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-200 dark:border-gray-600 p-4">
                                <button onClick={() => setGuestCount((c: number) => Math.max(hall.capacity_min || 1, c - 1))}
                                    className="w-11 h-11 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xl font-black text-gray-700 dark:text-gray-200 hover:border-purple-400 hover:text-purple-700 active:scale-90 transition-all flex items-center justify-center shadow-sm">
                                    −
                                </button>
                                <div className="text-center">
                                    <p className="text-4xl font-black text-purple-700 dark:text-purple-400 leading-none">{guestCount}</p>
                                    <p className="text-xs text-gray-400 mt-1">guests</p>
                                </div>
                                <button onClick={() => setGuestCount((c: number) => Math.min(hall.capacity_max || 200, c + 1))}
                                    className="w-11 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-xl font-black text-white active:scale-90 transition-all flex items-center justify-center shadow-md shadow-purple-200 dark:shadow-purple-900">
                                    +
                                </button>
                            </div>

                            {/* Info rows */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 rounded-xl px-4 py-2.5 text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Package limit</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-100">
                                        {selectedPackage ? `${selectedPackage.max_people} people included` : `Min ${hall.capacity_min || 1}`}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 rounded-xl px-4 py-2.5 text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Hall maximum</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-100">Max {hall.capacity_max || 200} people</span>
                                </div>
                            </div>

                            {/* Extra guest warning */}
                            {extraGuests > 0 && (
                                <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3.5 py-3">
                                    <span className="text-lg flex-shrink-0">⚠️</span>
                                    <div>
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                            {extraGuests} extra guest{extraGuests > 1 ? 's' : ''} beyond package limit
                                        </p>
                                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                                            +{inr(pricing?.extra_guest_total)} extra guest fee
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── STEP 3: Decor & Extras ── */}
                    {hasDecor && step === decorStep && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="space-y-4">
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white mb-0.5">Add-on services</h3>
                                <p className="text-xs text-gray-400">Enhance your event with these extras. All amounts per booking.</p>
                            </div>
                            <div className="space-y-2.5">
                                {addonServices.filter(a => a.category !== 'food').map(addon => (
                                    <AddonCard key={addon.id} addon={addon}
                                        isSelected={selectedAddonIds.includes(addon.id)}
                                        qty={addonQuantities[addon.id] || 1}
                                        onToggle={() => toggleAddon(addon.id)}
                                        onQtyChange={d => updateQty(addon.id, d)}
                                        isFood={false} />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP food: Food & Drinks ── */}
                    {hasFood && step === foodStep && (
                        <motion.div key="s4" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="space-y-4">
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white mb-0.5">Food &amp; Drinks</h3>
                                <p className="text-xs text-gray-400">Priced per plate. Default quantity = your guest count.</p>
                            </div>
                            <div className="space-y-2.5">
                                {addonServices.filter(a => a.category === 'food').map(addon => (
                                    <AddonCard key={addon.id} addon={addon}
                                        isSelected={selectedAddonIds.includes(addon.id)}
                                        qty={addonQuantities[addon.id] || guestCount}
                                        onToggle={() => toggleAddon(addon.id, true)}
                                        onQtyChange={d => updateQty(addon.id, d)}
                                        isFood={true} />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── LAST STEP: Review & Confirm ── */}
                    {isLast && (
                        <motion.div key="review" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="space-y-4">
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white">Review &amp; confirm</h3>
                                <p className="text-xs text-gray-400">Please confirm your booking details below.</p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl px-4 py-1 overflow-hidden">
                                <ReviewRow label="Date" value={slot?.date ? new Date(slot.date + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'} />
                                {/* Slots display */}
                                {allSelectedSlots && allSelectedSlots.length > 1 ? (
                                    <ReviewRow label="Slots" value={`${allSelectedSlots.length} slots · ${allSelectedSlots.length}h total`} />
                                ) : (
                                    <ReviewRow label="Slots" value={`${fmt12(startTime)} – ${fmt12(endTime)}`} />
                                )}
                                <ReviewRow label="Duration" value={pricing ? `${pricing.duration_hours}h` : '—'} />

                                {/* Per-slot package pricing */}
                                {selectedPackage && pricing && (() => {
                                    const subtotal = pricing.package_subtotal || (parseFloat(selectedPackage.price) * slotCount)
                                    const discount = pricing.multi_slot_discount || 0
                                    const pkgTotal = pricing.package_total || pricing.base_price
                                    return (
                                        <>
                                            <ReviewRow label={`${selectedPackage.name} × ${slotCount} slot${slotCount > 1 ? 's' : ''}`} value={inr(subtotal)} />
                                            {discount > 0 && (
                                                <div className="flex items-center justify-between py-2 px-1 border-b border-gray-100 dark:border-gray-700/60">
                                                    <span className="text-sm text-green-600 dark:text-green-400">Multi-slot discount (10%)</span>
                                                    <span className="text-sm font-bold text-green-600 dark:text-green-400">−{inr(discount)}</span>
                                                </div>
                                            )}
                                            <ReviewRow label="Package total" value={inr(pkgTotal)} />
                                        </>
                                    )
                                })()}
                                {!selectedPackage && (
                                    <ReviewRow label="Base" value={inr(pricing?.base_price)} />
                                )}

                                <ReviewRow label="Guests" value={String(guestCount)} />
                                <ReviewRow
                                    label={!sameEvent && numSegments > 1
                                        ? `Extra guests (×${numSegments} events)`
                                        : 'Extra guests'}
                                    value={extraGuests > 0
                                        ? `${extraGuests}${!sameEvent && numSegments > 1 ? ` × ${numSegments}` : ''} × ₹500 = ${inr(pricing?.extra_guest_total)}`
                                        : 'None'}
                                />
                                {(pricing?.addons_total ?? 0) > 0 && (
                                    <ReviewRow
                                        label={!sameEvent && numSegments > 1
                                            ? `Add-ons (×${numSegments} events)`
                                            : `Add-ons (${selectedAddonIds.length})`}
                                        value={inr(pricing?.addons_total)}
                                    />
                                )}
                                {/* Gap holding fee — only for same event */}
                                {sameEvent && (pricing?.gap_holding_fee ?? 0) > 0 && (
                                    <div className="flex items-center justify-between py-2 px-1 border-b border-gray-100 dark:border-gray-700/60">
                                        <span className="text-sm text-orange-600 dark:text-orange-400">
                                            Gap holding fee ({pricing!.gap_hours}h × ₹{pricing!.gap_fee_per_hour ?? 200}/hr)
                                        </span>
                                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{inr(pricing?.gap_holding_fee)}</span>
                                    </div>
                                )}
                                {/* Separate events note */}
                                {!sameEvent && hasGap && (
                                    <div className="flex items-center justify-between py-2 px-1 border-b border-gray-100 dark:border-gray-700/60">
                                        <span className="text-sm text-blue-600 dark:text-blue-400">
                                            🔀 {numSegments} separate events (no gap fee)
                                        </span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">―</span>
                                    </div>
                                )}
                                <ReviewRow label="Total" value={inr(pricing?.grand_total)} accent topBorder />
                            </div>

                            {/* Package inclusions */}
                            {selectedPackage?.inclusions && selectedPackage.inclusions.length > 0 && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl px-4 py-3">
                                    <p className="text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest mb-2">Included in {selectedPackage.name}</p>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                        {selectedPackage.inclusions.map((inc, i) => (
                                            <p key={i} className="text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                <span className="truncate">{inc}</span>
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-3">
                {/* Price summary */}
                <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Total</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                        {pricing ? inr(pricing.grand_total) : '—'}
                    </p>
                    {selectedPackage && (
                        <p className="text-[10px] text-gray-400 leading-tight">{selectedPackage.name} {inr(pkgPrice)}</p>
                    )}
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center gap-2">
                    {step > 1 && (
                        <button onClick={() => setStep(s => s - 1)}
                            className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 flex items-center justify-center transition-all active:scale-90">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    {!isLast ? (
                        <button onClick={() => setStep(s => s + 1)} disabled={!pricing}
                            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-95 text-sm shadow-md shadow-purple-200 dark:shadow-purple-900">
                            Continue <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button disabled={!pricing}
                            onClick={() => onComplete({
                                start_time: startTime,
                                end_time: endTime,
                                guest_count: guestCount,
                                addon_ids: selectedAddonIds,
                                addon_quantities: addonQuantities,
                                pricing,
                                same_event: sameEvent,
                                package_id: selectedPackage?.id || null,
                                package_name: selectedPackage?.name || null,
                                hall_name: hall.name,
                                hall_image: getFullImageUrl(
                                    hall.images?.find((i: any) => i.is_primary)?.image
                                    || hall.images?.[0]?.image || hall.images?.[0]?.url || ''
                                ),
                            })}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all active:scale-95 text-sm shadow-lg shadow-pink-200 dark:shadow-pink-900">
                            <CheckCircle className="w-4 h-4" /> Book now
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
