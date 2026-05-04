'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    CheckCircle, Calendar, Clock, MapPin, Home, QrCode as QrCodeIcon,
    ExternalLink, Copy, Package, Users, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/shared/Navbar'
import QRCode from 'react-qr-code'

interface SuccessData {
    booking_ref: string
    qr_code_token: string
    hall_name: string
    slot_date: string
    start_time: string
    end_time: string
    hall_image?: string
    slot_start?: string
    slot_end?: string
    package_name?: string
    package_price?: string
    guest_count?: number
    addon_ids?: string[]
    duration_hours?: number
    selected_slot_times?: { start: string; end: string }[]  // individual slots from draft
    pricing?: {
        grand_total: number
        extra_guests?: number
        extra_guest_total?: number
        addons?: { name: string; quantity: number; unit_price: number }[]
        addon_details?: { name: string; quantity: number; unit_price: number }[]
    }
}

export default function BookingSuccessPage() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [data, setData] = useState<SuccessData | null>(null)
    const [copied, setCopied] = useState(false)
    const [ticketUrl, setTicketUrl] = useState('')

    useEffect(() => {
        setMounted(true)
        const raw = sessionStorage.getItem('booking_success')
        if (!raw) { 
            // Only redirect if mounted to avoid flash during hydration
            return 
        }
        try {
            const parsed = JSON.parse(raw)
            setData(parsed)
            if (parsed.qr_code_token) {
                setTicketUrl(`${window.location.origin}/booking/${parsed.qr_code_token}`)
            }
        } catch (e) {
            console.error("Failed to parse booking success data", e)
        }
    }, [])

    // Redirect to home if no data after mounting
    useEffect(() => {
        if (mounted && !data && !sessionStorage.getItem('booking_success')) {
            router.push('/')
        }
    }, [mounted, data, router])

    if (!mounted || !data) return null

    const startTime = data?.start_time || data?.slot_start || ''
    const endTime = data?.end_time || data?.slot_end || ''
    const totalPaid = data?.pricing?.grand_total

    // Normalize addons list from either 'addons' or 'addon_details'
    const addonList = (data?.pricing as any)?.addons || (data?.pricing as any)?.addon_details || []

    const date = data?.slot_date 
        ? new Date(data.slot_date + 'T00:00').toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })
        : '---'

    const formatTo12h = (timeStr: string) => {
        if (!timeStr) return ""
        const parts = timeStr.split(':')
        if (parts.length < 2) return timeStr
        const [hours, minutes] = parts
        let hr = parseInt(hours)
        const ampm = hr >= 12 ? 'PM' : 'AM'
        hr = hr % 12
        hr = hr ? hr : 12
        return `${hr}:${minutes} ${ampm}`
    }

    const copyLink = async () => {
        if (!ticketUrl) return
        try {
            await navigator.clipboard.writeText(ticketUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy link:', err)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-lg mx-auto px-4 pt-24 pb-16 text-center">
                {/* Confetti animation */}
                <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-2xl shadow-green-500/30 mb-6"
                >
                    <CheckCircle className="w-12 h-12 text-white" />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎉</h1>
                    <p className="text-gray-500 mb-8">Your party hall has been booked successfully. See you at the celebration!</p>

                    {/* Booking card */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                        {/* Ticket top */}
                        <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-5 text-white">
                            <div className="text-sm font-medium opacity-80 mb-1">Booking Reference</div>
                            <div className="text-3xl font-bold tracking-widest font-mono">{data?.booking_ref || '---'}</div>
                        </div>

                        {/* Dotted divider */}
                        <div className="relative py-0.5">
                            <div className="absolute inset-x-0 border-t-2 border-dashed border-gray-200" />
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full border border-gray-200" />
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full border border-gray-200" />
                        </div>

                        {/* Details */}
                        <div className="px-6 py-5 space-y-4">
                            <div className="flex items-start gap-3 text-left">
                                <MapPin className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs text-gray-400 mb-0.5">Hall</div>
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold text-gray-900">{data?.hall_name || '---'}</div>
                                        {data?.hall_image && (
                                            <img src={data.hall_image} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100 shadow-sm" />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 text-left">
                                <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-xs text-gray-400 mb-0.5">Date</div>
                                    <div className="font-semibold text-gray-900">{date}</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 text-left">
                                <Clock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs text-gray-400 mb-0.5">Time</div>
                                    {data?.selected_slot_times && data.selected_slot_times.length > 1 ? (
                                        <div className="space-y-1">
                                            {[...data.selected_slot_times]
                                                .sort((a, b) => a.start.localeCompare(b.start))
                                                .map((t, i) => (
                                                    <div key={i} className="font-semibold text-gray-900 text-sm">
                                                        {formatTo12h(t.start)} – {formatTo12h(t.end)} IST
                                                    </div>
                                                ))}
                                            <div className="text-xs text-gray-400 mt-1">
                                                {data.selected_slot_times.length} slots · {data.duration_hours || data.selected_slot_times.length}h total
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="font-semibold text-gray-900">
                                            {formatTo12h(startTime)} – {formatTo12h(endTime)} IST
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Package info */}
                            {data?.package_name && (
                                <div className="flex items-start gap-3 text-left">
                                    <Package className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-xs text-gray-400 mb-0.5">Package</div>
                                        <div className="font-semibold text-gray-900">
                                            {data.package_name}
                                            {data.package_price && (
                                                <span className="text-purple-600 ml-1 text-sm">
                                                    (₹{parseFloat(data.package_price).toLocaleString('en-IN')})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* People + extra fee if applicable */}
                            {data?.guest_count && (
                                <div className="flex items-start gap-3 text-left">
                                    <Users className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-400 mb-0.5">People</div>
                                        <div className="font-semibold text-gray-900">{data.guest_count} people</div>
                                        {(data.pricing as any)?.extra_guests > 0 && (
                                            <div className="text-xs text-orange-600 mt-0.5">
                                                +{(data.pricing as any).extra_guests} extra @ ₹{(
                                                    (data.pricing as any).extra_guest_total / (data.pricing as any).extra_guests
                                                ).toLocaleString('en-IN')}/person = ₹{((data.pricing as any).extra_guest_total || 0).toLocaleString('en-IN')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Add-on Services with unit price */}
                            {addonList && addonList.length > 0 && (
                                <div className="flex items-start gap-3 text-left">
                                    <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-400 mb-1">Add-on Services</div>
                                        <ul className="space-y-1">
                                            {addonList.map((addon: any, i: number) => {
                                                if (!addon) return null
                                                const name = addon.name || 'Extra Service'
                                                const qty = addon.quantity || 1
                                                const unitPrice = parseFloat(addon.unit_price || addon.price || '0')
                                                const total = addon.total || addon.line_total || (qty * unitPrice)

                                                return (
                                                    <li key={i} className="flex justify-between text-sm">
                                                        <span className="text-gray-700">
                                                            {name} {qty > 1 ? `×${qty}` : ''}
                                                            {qty > 1 && unitPrice > 0 && (
                                                                <span className="text-xs text-gray-400 ml-1">@ ₹{unitPrice.toLocaleString('en-IN')}</span>
                                                            )}
                                                        </span>
                                                        <span className="font-semibold text-gray-900">₹{parseFloat(total.toString()).toLocaleString('en-IN')}</span>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Total paid */}
                            {totalPaid && (
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">Total Paid</span>
                                    <span className="text-xl font-bold text-purple-600">₹{totalPaid.toLocaleString('en-IN')}</span>
                                </div>
                            )}

                            {/* ── TWO QR CODES ─────────────────────────── */}
                            <div className="pt-3 border-t border-gray-100">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-4">Your QR Codes</div>

                                {data?.qr_code_token ? (
                                    <div className="grid grid-cols-2 gap-3">

                                        {/* QR 1: Entry / Check-in */}
                                        <div className="flex flex-col items-center bg-gradient-to-b from-purple-50 to-white border-2 border-purple-200 rounded-2xl p-3">
                                            <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2">🚪 Entry QR</div>
                                            <div className="p-2 bg-white rounded-xl shadow-sm mb-2">
                                                {ticketUrl ? (
                                                    <QRCode
                                                        value={ticketUrl}
                                                        size={100}
                                                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                                        viewBox="0 0 256 256"
                                                        level="M"
                                                    />
                                                ) : (
                                                    <div className="w-[100px] h-[100px] bg-gray-100 animate-pulse rounded-lg" />
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 text-center leading-tight mb-2">
                                                Show at gate for check-in &amp; check-out
                                            </p>
                                            <a
                                                href={ticketUrl || '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors"
                                            >
                                                Open Ticket
                                            </a>
                                        </div>

                                        {/* QR 2: Services / Staff */}
                                        <div className="flex flex-col items-center bg-gradient-to-b from-pink-50 to-white border-2 border-pink-200 rounded-2xl p-3">
                                            <div className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-2">🎪 Services QR</div>
                                            <div className="p-2 bg-white rounded-xl shadow-sm mb-2">
                                                {ticketUrl ? (
                                                    <QRCode
                                                        value={`${ticketUrl}/services`}
                                                        size={100}
                                                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                                        viewBox="0 0 256 256"
                                                        level="M"
                                                        fgColor="#be185d"
                                                    />
                                                ) : (
                                                    <div className="w-[100px] h-[100px] bg-gray-100 animate-pulse rounded-lg" />
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 text-center leading-tight mb-2">
                                                For staff — shows package &amp; services ordered
                                            </p>
                                            <a
                                                href={ticketUrl ? `${ticketUrl}/services` : '#'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] px-3 py-1.5 rounded-lg bg-pink-600 text-white font-bold hover:bg-pink-700 transition-colors"
                                            >
                                                View Services
                                            </a>
                                        </div>

                                    </div>
                                ) : null}

                                {/* Copy link */}
                                {ticketUrl && (
                                    <button
                                        onClick={copyLink}
                                        className="w-full mt-3 flex items-center justify-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        {copied ? '✅ Link Copied!' : 'Copy Booking Link'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <Link href="/"
                                className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                <Home className="w-4 h-4" /> Home
                            </Link>
                            <Link href="/halls"
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center justify-center gap-2">
                                Book Another
                            </Link>
                        </div>
                        <Link href="/user/bookings"
                            className="w-full py-3 border-2 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-400 font-bold rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center gap-2">
                            🎫 View My Bookings
                        </Link>
                    </div>

                    <p className="text-xs text-gray-400 mt-4">A confirmation SMS has been sent to your registered mobile number.</p>
                </motion.div>
            </div>
        </div>
    )
}
