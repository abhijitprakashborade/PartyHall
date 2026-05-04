'use client'

import { useEffect, useState, useRef } from 'react'
import React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    Calendar, Clock, MapPin, Users, Package,
    CheckCircle, XCircle, Loader2, QrCode, IndianRupee,
    Utensils, Camera, Sparkles, Star, Home
} from 'lucide-react'
import dynamic from 'next/dynamic'
import api from '@/lib/api'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

interface BookingDetail {
    booking_ref: string
    qr_code_token: string
    status: string
    hall_name: string
    hall_address: string
    hall_city: string
    hall_image: string | null
    slot_date: string
    start_time: string
    end_time: string
    guest_count: number
    special_notes: string
    package: {
        name: string
        price: string
        duration_hours: number
        max_people: number
        inclusions: string[]
    } | null
    addons: {
        name: string
        category: string
        description: string
        quantity: number
        unit_price: string
        total: string
    }[]
    base_amount: string
    addons_amount: string
    total_amount: string
    checked_in_at: string | null
    checked_out_at: string | null
    created_at: string
    // Individual slots for non-contiguous multi-slot bookings
    selected_slots?: { start_time: string; end_time: string; start_raw: string; end_raw: string }[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: <CheckCircle className="w-4 h-4" /> },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', icon: <Clock className="w-4 h-4" /> },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: <XCircle className="w-4 h-4" /> },
    completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <CheckCircle className="w-4 h-4" /> },
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    photography: <Camera className="w-4 h-4" />,
    food: <Utensils className="w-4 h-4" />,
    decoration: <Sparkles className="w-4 h-4" />,
    entry_effect: <Star className="w-4 h-4" />,
    other: <Package className="w-4 h-4" />,
}

export default function BookingTokenPageClient() {
    const [mounted, setMounted] = useState(false)
    const params = useParams()
    const token = params?.token as string

    const [booking, setBooking] = useState<BookingDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [ticketUrl, setTicketUrl] = useState('')
    const fetchedRef = useRef(false)

    useEffect(() => {
        setMounted(true)
        if (!token || fetchedRef.current) return
        fetchedRef.current = true

        setTicketUrl(`${window.location.origin}/booking/${token}`)
        
        api.get(`/bookings/token/${token}/`)
            .then(res => setBooking(res.data))
            .catch(() => setError('Booking not found or QR code is invalid.'))
            .finally(() => setLoading(false))
    }, [token])

    const fmt = (d: string) => {
        if (!d) return '---'
        const date = new Date(d + 'T00:00')
        if (isNaN(date.getTime())) return d
        return date.toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
    }

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        </div>
    )

    // Guard final render for browser-only elements
    if (!mounted) return null

    if (error || !booking) return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-950 dark:to-gray-900 flex flex-col items-center justify-center p-6 text-center">
            <QrCode className="w-16 h-16 text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid QR Code</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
            <Link href="/" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors">
                <Home className="w-4 h-4" /> Go Home
            </Link>
        </div>
    )

    // Guard final render for browser-only elements
    if (!mounted) return null

    const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending
    const total = parseFloat(booking.total_amount || '0')
    const isCheckedIn = !!booking.checked_in_at
    const isCheckedOut = !!booking.checked_out_at

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-950 dark:to-gray-900 py-8 px-4">
            <div className="max-w-lg mx-auto">

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-500/30">
                        <QrCode className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Ticket</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Ref: <span className="font-mono font-bold text-purple-600">{booking.booking_ref}</span>
                    </p>
                </div>

                {/* Status Badge */}
                <div className={`flex items-center gap-2 justify-center mx-auto w-fit px-4 py-1.5 rounded-full text-sm font-semibold mb-6 ${statusCfg.color}`}>
                    {statusCfg.icon} {statusCfg.label}
                </div>

                {/* Check-in / Check-out status */}
                {(isCheckedIn || isCheckedOut) && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 mb-5 flex gap-4 text-sm text-green-800 dark:text-green-300">
                        {isCheckedIn && (
                            <div>✅ <strong>Checked In:</strong> {new Date(booking.checked_in_at!).toLocaleTimeString('en-IN')}</div>
                        )}
                        {isCheckedOut && (
                            <div>🏁 <strong>Checked Out:</strong> {new Date(booking.checked_out_at!).toLocaleTimeString('en-IN')}</div>
                        )}
                    </div>
                )}

                {/* Main Ticket Card */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-purple-500/10 overflow-hidden border border-purple-100 dark:border-purple-900/30">

                    {/* Hall Image */}
                    {booking.hall_image && (
                        <div className="relative h-48 overflow-hidden">
                            <img src={booking.hall_image} alt={booking.hall_name}
                                className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-4 left-4 text-white">
                                <div className="text-xs text-white/70 uppercase tracking-wider">Venue</div>
                                <div className="text-xl font-bold">{booking.hall_name}</div>
                            </div>
                        </div>
                    )}

                    <div className="p-6 space-y-5">

                        {/* Hall name (if no image) */}
                        {!booking.hall_image && (
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{booking.hall_name}</div>
                        )}

                        {/* Location */}
                        <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                {booking.hall_address}, {booking.hall_city}
                            </div>
                        </div>

                        <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

                        {/* Date */}
                        <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <div>
                                <div className="text-xs text-gray-400 mb-0.5">Date</div>
                                <div className="font-semibold text-gray-900 dark:text-white">{fmt(booking.slot_date)}</div>
                            </div>
                        </div>

                        {/* Time Slot */}
                        <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="text-xs text-gray-400 mb-0.5">Time Slot (IST)</div>
                                {booking.selected_slots && booking.selected_slots.length > 1 ? (
                                    <div className="space-y-1.5">
                                        {booking.selected_slots.map((s: any, i: number) => (
                                            <div key={i} className="font-semibold text-gray-900 dark:text-white text-sm">
                                                {s.start_time} – {s.end_time}
                                            </div>
                                        ))}
                                        <div className="text-xs text-gray-400 mt-1">
                                            {booking.selected_slots.length} slots · {booking.selected_slots.length}h total
                                        </div>
                                    </div>
                                ) : (
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {booking.start_time} – {booking.end_time}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Guests */}
                        <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <div>
                                <div className="text-xs text-gray-400 mb-0.5">People</div>
                                <div className="font-semibold text-gray-900 dark:text-white">{booking.guest_count} people</div>
                            </div>
                        </div>

                        {/* Package */}
                        {booking.package && (
                            <>
                                <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className="w-4 h-4 text-purple-500" />
                                        <span className="text-xs text-gray-400">Package Selected</span>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-purple-700 dark:text-purple-300 text-lg">
                                                {booking.package.name}
                                            </span>
                                            <span className="font-bold text-purple-600">
                                                ₹{parseFloat(booking.package.price).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                            {booking.package.duration_hours}h · Max {booking.package.max_people} people
                                        </div>
                                        {booking.package.inclusions.length > 0 && (
                                            <ul className="space-y-1">
                                                {booking.package.inclusions.map((inc, i) => (
                                                    <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                        {inc}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Add-on Services */}
                        {booking.addons.length > 0 && (
                            <>
                                <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-purple-500" />
                                        <span className="text-xs text-gray-400">Add-on Services</span>
                                    </div>
                                    <div className="space-y-2">
                                        {booking.addons.map((addon, i) => (
                                            <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-purple-500">
                                                        {CATEGORY_ICONS[addon.category] || <Package className="w-4 h-4" />}
                                                    </span>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{addon.name}</div>
                                                        <div className="text-xs text-gray-400">Qty: {addon.quantity}</div>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                    ₹{parseFloat(addon.total).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Special Notes */}
                        {booking.special_notes && (
                            <>
                                <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-sm text-yellow-900 dark:text-yellow-200">
                                    <span className="font-semibold">📝 Special Notes: </span>{booking.special_notes}
                                </div>
                            </>
                        )}

                        {/* Price Breakdown */}
                        <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                <span>Base Amount</span>
                                <span>₹{parseFloat(booking.base_amount || '0').toLocaleString('en-IN')}</span>
                            </div>
                            {parseFloat(booking.addons_amount || '0') > 0 && (
                                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                    <span>Add-ons</span>
                                    <span>₹{parseFloat(booking.addons_amount || '0').toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-gray-900 dark:text-white text-lg pt-1 border-t border-gray-100 dark:border-gray-700">
                                <span>Total Paid</span>
                                <span className="text-purple-600">₹{total.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* QR Codes */}
                        <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />
                        <div className="p-6">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Verification & Services</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Entry QR */}
                                <div className="flex flex-col items-center bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-100 dark:border-purple-800">
                                    <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-2">🚪 Entry QR</span>
                                    <div className="p-2 bg-white rounded-xl shadow-sm mb-2">
                                        {ticketUrl ? (
                                            <QRCode value={ticketUrl} size={90} level="M" />
                                        ) : (
                                            <div className="w-[90px] h-[90px] bg-gray-100 animate-pulse rounded-lg" />
                                        )}
                                    </div>
                                    <p className="text-[8px] text-gray-400 text-center">Show at gate</p>
                                </div>

                                {/* Services QR */}
                                <div className="flex flex-col items-center bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-4 border border-pink-100 dark:border-pink-800">
                                    <span className="text-[9px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest mb-2">🎪 Services QR</span>
                                    <div className="p-2 bg-white rounded-xl shadow-sm mb-2">
                                        {ticketUrl ? (
                                            <QRCode value={`${ticketUrl}/services`} size={90} level="M" fgColor="#be185d" />
                                        ) : (
                                            <div className="w-[90px] h-[90px] bg-gray-100 animate-pulse rounded-lg" />
                                        )}
                                    </div>
                                    <p className="text-[8px] text-gray-400 text-center">For venue staff</p>
                                </div>
                            </div>

                            <div className="text-center mt-4">
                                <p className="text-[10px] text-gray-400 font-mono tracking-tighter truncate opacity-50">{token}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Footer */}
                <div className="text-center mt-6 text-xs text-gray-400">
                    Booked via PartyHub · {new Date(booking.created_at).toLocaleDateString('en-IN')}
                </div>
            </div>
        </div>
    )
}
