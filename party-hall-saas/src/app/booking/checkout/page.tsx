'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Calendar, Clock, Package, IndianRupee, ShieldCheck, ArrowLeft, Loader2, AlertTriangle, Users } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import dynamic from 'next/dynamic'

const Navbar = dynamic(() => import('@/components/shared/Navbar'), { ssr: false })

interface BookingDraft {
    hall_id: string
    hall_name: string
    slot_date: string
    start_time: string
    end_time: string
    slot_start?: string
    slot_end?: string
    guest_count: number
    addon_ids: string[]
    addon_quantities: Record<string, number>
    slot_id: string
    slot_ids?: string[]
    duration_hours?: number
    same_event?: boolean
    selected_slot_times?: { start: string; end: string }[]  // individual slots for display
    package_id: string
    package_name?: string
    package_price?: string
    pricing: {
        base_price: number
        package_subtotal?: number
        multi_slot_discount?: number
        package_total?: number
        duration_hours: number
        extra_guests: number
        extra_guest_total: number
        addons_total: number
        gap_hours?: number
        gap_holding_fee?: number
        grand_total: number
    }
}

declare global {
    interface Window { Razorpay: any }
}

export default function CheckoutPage() {
    const router = useRouter()
    const { user } = useAuth()
    const [draft, setDraft] = useState<BookingDraft | null>(null)
    const [guestCount, setGuestCount] = useState(10)
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'summary' | 'paying'>('summary')
    // Mandatory acknowledgement checkboxes
    const [agreedNoAlcohol, setAgreedNoAlcohol] = useState(false)
    const [agreedNoFireworks, setAgreedNoFireworks] = useState(false)
    const [agreedNonRefundable, setAgreedNonRefundable] = useState(false)
    const canPay = agreedNoAlcohol && agreedNoFireworks && agreedNonRefundable

    useEffect(() => {
        const raw = sessionStorage.getItem('booking_draft')
        if (!raw) { router.push('/halls'); return }
        setDraft(JSON.parse(raw))
        // Load Razorpay script
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        document.body.appendChild(script)
    }, [router])

    const formatTo12h = (timeStr: string) => {
        if (!timeStr) return ""
        const [hours, minutes] = timeStr.split(':')
        let hr = parseInt(hours)
        const ampm = hr >= 12 ? 'PM' : 'AM'
        hr = hr % 12
        hr = hr ? hr : 12
        return `${hr}:${minutes} ${ampm}`
    }

    const handlePay = async () => {
        if (!draft) return
        setLoading(true)
        try {
        // 1. Create booking — CRITICAL: pass slot_start_time/slot_end_time
        // so the backend stores the full multi-slot range (e.g. 11:00–15:00)
        // instead of falling back to the locked slot's own 1-hour window
        const startTime = draft.start_time || draft.slot_start || ''
        const endTime   = draft.end_time   || draft.slot_end   || ''
        const bookingRes = await api.post('/bookings/create_booking/', {
            hall_id: draft.hall_id,
            slot_ids: draft.slot_ids || [draft.slot_id],  // multi-slot support
            slot_id: draft.slot_id,  // legacy fallback
            package_id: draft.package_id,
            guest_count: draft.guest_count || 10,
            special_notes: notes,
            addon_ids: draft.addon_ids || [],
            addon_quantities: draft.addon_quantities || {},
            slot_start_time: startTime,
            slot_end_time: endTime,
            // Pass total hours for non-contiguous slots (e.g., 9-10 AM + 3-4 PM = 2h, not 7h)
            duration_hours_override: draft.duration_hours || null,
            same_event: draft.same_event ?? true,
        })
            const booking = bookingRes.data

            // 2. Create Order via Backend (factory selects dummy/razorpay)
            const orderRes = await api.post('/payments/create-order/', { booking_id: booking.id })
            const { order_id, amount, key, key_id, booking_ref, gateway, auto_confirm } = orderRes.data
            console.log('DEBUG: orderData:', orderRes.data)

            // 3. Handle Dummy Gateway (Auto-confirm)
            if (gateway === 'dummy' || auto_confirm) {
                try {
                    const verifyRes = await api.post('/payments/verify/', {
                        razorpay_order_id: order_id,
                        razorpay_payment_id: 'pay_dummy_' + Math.random().toString(36).slice(2),
                        razorpay_signature: 'dummy_sig',
                    })
                    // ✅ Read qr_token from the VERIFY response (authoritative source)
                    const qr_code_token = verifyRes.data.qr_token || booking.qr_code_token || ''
                    sessionStorage.removeItem('booking_draft')
                    sessionStorage.setItem('booking_success', JSON.stringify({
                        ...draft,
                        booking_ref,
                        booking_id: booking.id,
                        qr_code_token,
                    }))
                    router.push('/booking/success')
                    return
                } catch (e) {
                    toast.error('Dummy verification failed')
                    return
                }
            }

            setStep('paying')

            // 4. Open Razorpay checkout (if not dummy)
            const rzp = new window.Razorpay({
                key: key || key_id,
                amount,
                currency: 'INR',
                name: 'PartyHub',
                description: `Booking ${booking_ref}`,
                order_id,
                handler: async (response: any) => {
                    try {
                        const verifyRes = await api.post('/payments/verify/', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        })
                        // ✅ Read qr_token from verify response
                        const qr_code_token = verifyRes.data.qr_token || booking.qr_code_token || ''
                        sessionStorage.removeItem('booking_draft')
                        sessionStorage.setItem('booking_success', JSON.stringify({
                            ...draft,
                            booking_ref,
                            booking_id: booking.id,
                            qr_code_token,
                        }))
                        router.push('/booking/success')
                    } catch {
                        toast.error('Payment verification failed. Contact support.')
                    }
                },
                prefill: { name: 'Guest', email: '' },
                theme: { color: '#7c3aed' },
                modal: {
                    ondismiss: () => {
                        setStep('summary')
                        setLoading(false)
                        toast.error('Payment cancelled. Your slot is still held for a few minutes.')
                    }
                }
            })
            rzp.open()
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create booking')
            setStep('summary')
        } finally {
            setLoading(false)
        }
    }

    if (!draft) return null

    const price = draft.pricing?.grand_total || 0
    const slotDate = new Date(draft.slot_date + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const startTime = draft.start_time || draft.slot_start || ''
    const endTime   = draft.end_time   || draft.slot_end   || ''

    // Use actual total hours from draft (correct for non-contiguous slots)
    // Fallback to range calculation only for single continuous slots
    const calcDurationHours = draft.duration_hours ?? (() => {
        if (!startTime || !endTime) return draft.pricing?.duration_hours || 1
        const [sh, sm] = startTime.split(':').map(Number)
        const [eh, em] = endTime.split(':').map(Number)
        return ((eh * 60 + em) - (sh * 60 + sm)) / 60
    })()

    // Time display: show individual slots for non-contiguous, range for single
    const slotTimes = draft.selected_slot_times
    const isMultiSlot = slotTimes && slotTimes.length > 1
    const timeDisplay = isMultiSlot
        ? `${slotTimes!.length} slots selected`
        : `${formatTo12h(startTime)} – ${formatTo12h(endTime)} (${calcDurationHours.toFixed(1)}h)`

    // Extra people beyond package base capacity
    const extraPeople = draft.pricing?.extra_guests || 0

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">
                <Link href={`/halls/${draft.hall_id}`} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-purple-600 mb-6 text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back to Hall
                </Link>

                <h1 className="text-2xl font-bold text-gray-900 mb-6">Confirm Booking</h1>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Booking summary */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <h2 className="font-bold text-gray-900 text-lg">{draft.hall_name}</h2>
                        <div className="divide-y divide-gray-100">
                            {[
                                { icon: Calendar, label: 'Date', value: slotDate },
                                { icon: Clock,    label: 'Time', value: timeDisplay },
                                { icon: Users,    label: 'People', value: `${draft.guest_count || 10} people${extraPeople > 0 ? ` (${extraPeople} extra beyond package)` : ''}` },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-center justify-between py-3">
                                    <span className="flex items-center gap-2 text-gray-500 text-sm">
                                        <Icon className="w-4 h-4 text-purple-400" />{label}
                                    </span>
                                    <span className="font-semibold text-gray-800 text-sm">{value}</span>
                                </div>
                            ))}

                            {/* Detailed Pricing Breakdown */}
                            <div className="py-3 space-y-2">
                                {/* Base/Package price */}
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Package {draft.package_name && `(${draft.package_name})`}</span>
                                    <span className="font-semibold text-gray-800">₹{(draft.pricing.package_subtotal || draft.pricing.base_price).toLocaleString('en-IN')}</span>
                                </div>

                                {/* Multi-slot discount */}
                                {(draft.pricing.multi_slot_discount ?? 0) > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Multi-slot discount (10%)</span>
                                        <span className="font-bold">−₹{draft.pricing.multi_slot_discount!.toLocaleString('en-IN')}</span>
                                    </div>
                                )}

                                {/* Extra guest total */}
                                {draft.pricing.extra_guest_total > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Extra guests ({extraPeople})</span>
                                        <span className="font-semibold text-gray-800">₹{draft.pricing.extra_guest_total.toLocaleString('en-IN')}</span>
                                    </div>
                                )}

                                {/* Addons */}
                                {draft.pricing.addons_total > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Add-ons total</span>
                                        <span className="font-semibold text-gray-800">₹{draft.pricing.addons_total.toLocaleString('en-IN')}</span>
                                    </div>
                                )}

                                {/* Gap holding fee */}
                                {(draft.pricing.gap_holding_fee ?? 0) > 0 && (
                                    <div className="flex justify-between text-sm text-orange-600">
                                        <span>Gap holding fee ({draft.pricing.gap_hours}h)</span>
                                        <span className="font-bold">₹{draft.pricing.gap_holding_fee!.toLocaleString('en-IN')}</span>
                                    </div>
                                )}

                                {/* Grand Total */}
                                <div className="flex justify-between pt-2 border-t border-gray-100">
                                    <span className="font-bold text-gray-900 border-purple-500">Total Amount</span>
                                    <span className="font-black text-purple-600 text-lg">₹{price.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                        {/* Individual slot breakdown for multi-slot */}
                        {isMultiSlot && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-400 font-semibold mb-2">Selected time slots:</p>
                                <div className="flex flex-wrap gap-2">
                                    {slotTimes!.sort((a, b) => a.start.localeCompare(b.start)).map((t, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full px-3 py-1">
                                            {formatTo12h(t.start)} – {formatTo12h(t.end)} ·1h
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Total: {calcDurationHours}h across {slotTimes!.length} slots</p>
                            </div>
                        )}
                    </div>

                    {/* guest count + notes (Removed guest count from here as it's in wizard) */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                        <h2 className="font-bold text-gray-900">Event Details</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Requests (optional)</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                rows={3} placeholder="Any special arrangements, decoration theme, dietary requirements…"
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                        </div>
                    </div>

                    {/* ── Important Notes Checkboxes ── */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            Important Notes — Please read and confirm
                        </div>
                        {[
                            { id: 'no-alcohol', label: 'I understand that NO Alcohol is allowed on the premises.', state: agreedNoAlcohol, set: setAgreedNoAlcohol },
                            { id: 'no-fireworks', label: 'I understand that NO Fireworks or Snow Sprays are permitted.', state: agreedNoFireworks, set: setAgreedNoFireworks },
                            { id: 'non-refundable', label: 'I understand the advance payment is Non-Refundable as per the cancellation policy.', state: agreedNonRefundable, set: setAgreedNonRefundable },
                        ].map(({ id, label, state, set }) => (
                            <label key={id} className="flex items-center gap-3 cursor-pointer group min-h-[44px]">
                                <input
                                    type="checkbox"
                                    id={id}
                                    checked={state}
                                    onChange={e => set(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 accent-purple-600 flex-shrink-0"
                                />
                                <span className="text-sm text-amber-800 group-hover:text-amber-900">{label}</span>
                            </label>
                        ))}
                    </div>

                    {/* Trust banner */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-green-50 rounded-xl text-sm text-green-700">
                        <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                        <span>Secure payment powered by Razorpay. Your slot is held for 10 minutes.</span>
                    </div>

                    {/* Pay button */}
                    <button onClick={handlePay} disabled={loading || !canPay}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-2xl text-lg hover:shadow-xl hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Processing…</> : `Pay ₹${price.toLocaleString('en-IN')}`}
                    </button>

                    {!canPay && (
                        <p className="text-xs text-center text-amber-600 font-medium">
                            ⚠️ Please read and agree to all Important Notes above to proceed.
                        </p>
                    )}

                    <p className="text-xs text-gray-400 text-center">By proceeding you agree to our cancellation policy. Refunds are processed within 5–7 business days.</p>
                </motion.div>
            </div>
        </div>
    )
}
