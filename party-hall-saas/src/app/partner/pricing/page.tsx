'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { IndianRupee, Percent, Users, AlertCircle, Save, CheckCircle, Info } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

interface HallPricingData {
    id: string
    name: string
    gap_fee_per_hour: number
    multi_slot_discount_pct: number
    extra_guest_fee_per_head: number
}

function FieldCard({
    icon: Icon,
    title,
    description,
    preview,
    children,
}: {
    icon: any
    title: string
    description: string
    preview?: string
    children: React.ReactNode
}) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-3">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </div>
            </div>
            {children}
            {preview && (
                <p className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
                    {preview}
                </p>
            )}
        </div>
    )
}

function NumericInput({
    value,
    onChange,
    prefix,
    suffix,
    min = 0,
    max = 9999,
    step = 1,
}: {
    value: number
    onChange: (v: number) => void
    prefix?: string
    suffix?: string
    min?: number
    max?: number
    step?: number
}) {
    return (
        <div className="flex items-center gap-2 mt-1">
            {prefix && (
                <span className="flex items-center justify-center w-9 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-500 dark:text-gray-400 text-sm font-bold">
                    {prefix}
                </span>
            )}
            <input
                type="number"
                value={value}
                onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
                min={min}
                max={max}
                step={step}
                className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            {suffix && (
                <span className="flex items-center justify-center px-3 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-500 dark:text-gray-400 text-sm font-bold">
                    {suffix}
                </span>
            )}
        </div>
    )
}

export default function PricingSettingsPage() {
    const router = useRouter()
    const [hall, setHall] = useState<HallPricingData | null>(null)
    const [gapFee, setGapFee] = useState(200)
    const [discountPct, setDiscountPct] = useState(10)
    const [extraGuestFee, setExtraGuestFee] = useState(500)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        api.get('/halls/my-hall/').then(res => {
            const h = res.data
            setHall(h)
            setGapFee(parseFloat(h.gap_fee_per_hour ?? 200))
            setDiscountPct(parseFloat(h.multi_slot_discount_pct ?? 10))
            setExtraGuestFee(parseFloat(h.extra_guest_fee_per_head ?? 500))
        }).catch(() => toast.error('Could not load hall data.'))
    }, [])

    const handleSave = async () => {
        if (!hall) return
        setSaving(true)
        setSaved(false)
        try {
            await api.patch('/halls/my-hall/', {
                gap_fee_per_hour: gapFee,
                multi_slot_discount_pct: discountPct,
                extra_guest_fee_per_head: extraGuestFee,
            })
            setSaved(true)
            toast.success('Pricing rates saved successfully!')
            setTimeout(() => setSaved(false), 3000)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    if (!hall) {
        return (
            <div className="flex items-center justify-center h-60">
                <div className="w-8 h-8 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
            </div>
        )
    }

    // Live preview calculation
    const exampleSlots   = 3
    const examplePkg     = 4999
    const subtotal       = examplePkg * exampleSlots
    const discount       = Math.round(subtotal * (discountPct / 100))
    const exampleGapHrs  = 2
    const gapTotal       = gapFee * exampleGapHrs
    const exampleGuests  = 15
    const exampleMaxPpl  = 10
    const extraPpl       = Math.max(0, exampleGuests - exampleMaxPpl)
    const extraGuestTotal = extraPpl * extraGuestFee
    const grandTotal     = subtotal - discount + gapTotal + extraGuestTotal

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-6"
        >
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pricing Settings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Customise the rates applied when customers book <span className="font-semibold text-purple-600">{hall.name}</span>.
                    All changes are reflected live in customer booking previews.
                </p>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>These rates apply to all bookings at this hall. Changes take effect immediately for new bookings. Existing confirmed bookings are not affected.</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Gap Fee */}
                <FieldCard
                    icon={IndianRupee}
                    title="Gap Holding Fee"
                    description="Charged per hour of gap between non-consecutive slots"
                    preview={`Customer books 2–3 PM + 6–7 PM → 3h gap → ₹${(gapFee * 3).toLocaleString('en-IN')} fee`}
                >
                    <NumericInput
                        value={gapFee}
                        onChange={setGapFee}
                        prefix="₹"
                        suffix="/hr"
                        min={0}
                        max={5000}
                        step={50}
                    />
                </FieldCard>

                {/* Multi-slot discount */}
                <FieldCard
                    icon={Percent}
                    title="Multi-Slot Discount"
                    description="Discount % off package subtotal when >1 slot is selected"
                    preview={`3 slots × ₹4,999 = ₹14,997 → ${discountPct}% off → save ₹${Math.round(14997 * discountPct / 100).toLocaleString('en-IN')}`}
                >
                    <NumericInput
                        value={discountPct}
                        onChange={setDiscountPct}
                        suffix="%"
                        min={0}
                        max={50}
                        step={1}
                    />
                    {discountPct === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> 0% = no discount applied
                        </p>
                    )}
                </FieldCard>

                {/* Extra guest fee */}
                <FieldCard
                    icon={Users}
                    title="Extra Guest Fee"
                    description="Charged per guest beyond the package's max capacity"
                    preview={`15 guests, package max 10 → 5 extra × ₹${extraGuestFee} = ₹${(5 * extraGuestFee).toLocaleString('en-IN')}`}
                >
                    <NumericInput
                        value={extraGuestFee}
                        onChange={setExtraGuestFee}
                        prefix="₹"
                        suffix="/head"
                        min={0}
                        max={10000}
                        step={50}
                    />
                </FieldCard>
            </div>

            {/* Live Preview */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl p-6">
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-4">
                    Live Preview — Example booking: Royal package, 3 slots, {exampleGapHrs}h gap, {exampleGuests} guests
                </p>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Royal × {exampleSlots} slots</span>
                        <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                            <span>Multi-slot discount ({discountPct}%)</span>
                            <span className="font-bold">−₹{discount.toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    {gapTotal > 0 && (
                        <div className="flex justify-between text-orange-600 dark:text-orange-400">
                            <span>Gap holding fee ({exampleGapHrs}h)</span>
                            <span className="font-bold">₹{gapTotal.toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    {extraGuestTotal > 0 && (
                        <div className="flex justify-between text-gray-700 dark:text-gray-300">
                            <span>Extra guests ({extraPpl})</span>
                            <span className="font-semibold">₹{extraGuestTotal.toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-purple-200 dark:border-purple-700">
                        <span className="font-bold text-gray-900 dark:text-white">Total</span>
                        <span className="font-black text-purple-700 dark:text-purple-300 text-lg">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-200 dark:shadow-purple-900"
                >
                    {saving ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                    ) : saved ? (
                        <><CheckCircle className="w-4 h-4" /> Saved!</>
                    ) : (
                        <><Save className="w-4 h-4" /> Save Pricing Rates</>
                    )}
                </button>
            </div>
        </motion.div>
    )
}
