'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Package2, IndianRupee, RotateCcw, QrCode, ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Status badge colours
const STATUS_STYLES: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
    refunded: 'bg-gray-100 text-gray-500',
}

export default function BookingHistoryPage() {
    const router = useRouter()
    const [bookings, setBookings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all')

    useEffect(() => {
        api.get('/bookings/')
            .then(res => setBookings(res.data?.results || res.data || []))
            .catch(() => toast.error('Failed to load bookings'))
            .finally(() => setLoading(false))
    }, [])

    const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

    const handleRebook = (booking: any) => {
        // Pre-fill session storage with the same hall — redirect to hall detail to re-select slot
        toast.info(`Re-booking at ${booking.hall_name}…`)
        router.push(`/halls/${booking.hall_slug || booking.hall}`)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
                    <Link href="/" className="text-gray-400 hover:text-purple-600">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-gray-900 text-lg">My Bookings</h1>
                        <p className="text-gray-500 text-xs">{bookings.length} total bookings</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                {/* Filter tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {(['all', 'confirmed', 'pending', 'cancelled'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === s
                                    ? 'bg-purple-600 text-white shadow'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
                                }`}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                            {s !== 'all' && (
                                <span className="ml-1.5 text-xs opacity-70">
                                    ({bookings.filter(b => b.status === s).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Booking list */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                                <div className="h-5 w-1/2 bg-gray-200 rounded mb-3" />
                                <div className="h-4 w-1/3 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No bookings found</p>
                        <Link href="/halls" className="mt-3 inline-block text-purple-600 text-sm font-medium">
                            Browse Halls →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((booking, i) => (
                            <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                            >
                                {/* Top ribbon */}
                                <div className="px-5 py-4 border-b border-gray-50">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-gray-900">{booking.hall_name || 'Hall'}</h3>
                                            <p className="text-gray-500 text-xs font-mono mt-0.5">{booking.booking_ref}</p>
                                        </div>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[booking.status] || 'bg-gray-100 text-gray-500'}`}>
                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="px-5 py-3 grid grid-cols-2 gap-3 text-sm">
                                    {booking.slot_date && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                            {new Date(booking.slot_date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    )}
                                    {booking.slot_start_time && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Clock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                            {booking.slot_start_time?.slice(0, 5)} – {booking.slot_end_time?.slice(0, 5)}
                                        </div>
                                    )}
                                    {booking.package_name && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Package2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                            {booking.package_name}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-gray-800 font-semibold">
                                        <IndianRupee className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                        ₹{Number(booking.total_amount || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="px-5 py-3 border-t border-gray-50 flex gap-2">
                                    {/* Re-Book button */}
                                    {['confirmed', 'completed', 'cancelled'].includes(booking.status) && (
                                        <button
                                            onClick={() => handleRebook(booking)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-sm font-semibold hover:bg-purple-100 transition-colors"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> Re-Book
                                        </button>
                                    )}
                                    {/* QR Code button */}
                                    {booking.status === 'confirmed' && booking.qr_code_token && (
                                        <Link
                                            href={`/booking/qr/${booking.id}`}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors"
                                        >
                                            <QrCode className="w-3.5 h-3.5" /> QR Code
                                        </Link>
                                    )}
                                    {/* View details */}
                                    <Link href={`/account/bookings/${booking.id}`}
                                        className="ml-auto flex items-center gap-1 text-gray-400 hover:text-purple-600 text-sm transition-colors"
                                    >
                                        Details <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
