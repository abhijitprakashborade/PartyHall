'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    CalendarDays, Package, QrCode, Clock, CheckCircle2, XCircle,
    AlertCircle, ArrowRight, Star, RefreshCw, TrendingUp,
    Wallet, PartyPopper, Award
} from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/shared/Navbar'
import QRCode from 'react-qr-code'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'text-green-400 bg-green-500/10' },
    pending: { label: 'Pending', icon: Clock, color: 'text-amber-400 bg-amber-500/10' },
    cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-400 bg-red-500/10' },
    completed: { label: 'Completed', icon: CheckCircle2, color: 'text-blue-400 bg-blue-500/10' },
    refunded: { label: 'Refunded', icon: AlertCircle, color: 'text-purple-400 bg-purple-500/10' },
}

function StatCard({
    icon, label, value, sub, gradient, delay,
}: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string;
    gradient: string; delay: number
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
            style={{ background: gradient }}
        >
            {/* decorative circle */}
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/10" />
            <div className="relative z-10">
                <div className="mb-3 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    {icon}
                </div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-extrabold mt-1">{value}</p>
                {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
            </div>
        </motion.div>
    )
}

export default function CustomerDashboard() {
    const { user } = useAuth()
    const [bookings, setBookings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedQr, setExpandedQr] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'upcoming' | 'all'>('upcoming')

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/bookings/')
            setBookings(res.data.results || res.data)
        } catch { toast.error('Failed to load bookings') }
        finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    const handleCancel = async (bookingId: string, bookingRef: string) => {
        if (!confirm(`Cancel booking ${bookingRef}? Refund is subject to hall cancellation policy.`)) return
        try {
            await api.post(`/bookings/${bookingId}/cancel/`, { cancellation_reason: 'Customer requested cancellation' })
            toast.success('Booking cancelled. Refund will be processed per policy.')
            load()
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to cancel')
        }
    }

    // Compute stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcoming = bookings.filter(b =>
        (b.status === 'confirmed' || b.status === 'pending') &&
        b.slot_date && new Date(b.slot_date) >= today
    )
    const completed = bookings.filter(b => b.status === 'completed')
    const totalSpent = bookings
        .filter(b => b.status !== 'cancelled' && b.status !== 'refunded')
        .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0)

    // Next upcoming booking
    const nextBooking = upcoming.sort((a, b) =>
        new Date(a.slot_date).getTime() - new Date(b.slot_date).getTime()
    )[0]

    const displayedBookings = activeTab === 'upcoming' ? upcoming : bookings

    const initials = user
        ? (user.full_name || user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U'

    const joinedDate = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : ''

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 py-24">

                {/* ─── Hero / greeting ─────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl mb-8 text-white shadow-xl"
                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' }}
                >
                    {/* decorative blobs */}
                    <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

                    <div className="relative z-10 p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* avatar */}
                        <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl font-extrabold shrink-0">
                            {initials}
                        </div>
                        <div className="flex-1">
                            <p className="text-white/60 text-sm">Welcome back,</p>
                            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                                {user?.full_name || user?.email || 'Guest'} 👋
                            </h1>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-white/70">
                                <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full capitalize">
                                    <Award className="w-3.5 h-3.5" /> {user?.role}
                                </span>
                                {joinedDate && (
                                    <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full">
                                        <CalendarDays className="w-3.5 h-3.5" /> Member since {joinedDate}
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Next event teaser */}
                        {nextBooking && (
                            <div className="hidden sm:block text-right shrink-0">
                                <p className="text-white/60 text-xs uppercase tracking-wider">Next Event</p>
                                <p className="text-lg font-bold">{nextBooking.hall_name}</p>
                                <p className="text-white/70 text-sm">{nextBooking.slot_date}</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* ─── Stats cards ─────────────────────────────── */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        {[1, 2, 3, 4].map(i => <div key={i} className="rounded-2xl h-32 shimmer" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            icon={<CalendarDays className="w-5 h-5 text-white" />}
                            label="Total Bookings" value={bookings.length}
                            sub="All time"
                            gradient="linear-gradient(135deg, #7c3aed, #6d28d9)"
                            delay={0.05}
                        />
                        <StatCard
                            icon={<PartyPopper className="w-5 h-5 text-white" />}
                            label="Upcoming" value={upcoming.length}
                            sub="Events scheduled"
                            gradient="linear-gradient(135deg, #0ea5e9, #2563eb)"
                            delay={0.1}
                        />
                        <StatCard
                            icon={<CheckCircle2 className="w-5 h-5 text-white" />}
                            label="Completed" value={completed.length}
                            sub="Parties celebrated"
                            gradient="linear-gradient(135deg, #10b981, #059669)"
                            delay={0.15}
                        />
                        <StatCard
                            icon={<Wallet className="w-5 h-5 text-white" />}
                            label="Total Spent"
                            value={`₹${totalSpent.toLocaleString('en-IN')}`}
                            sub="Across all bookings"
                            gradient="linear-gradient(135deg, #f59e0b, #d97706)"
                            delay={0.2}
                        />
                    </div>
                )}

                {/* ─── Booking list ─────────────────────────────── */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    {/* Tabs + refresh */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                            {(['upcoming', 'all'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all capitalize ${activeTab === tab
                                        ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    {tab === 'upcoming' ? `Upcoming (${upcoming.length})` : `All (${bookings.length})`}
                                </button>
                            ))}
                        </div>
                        <button onClick={load} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors" title="Refresh">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl shimmer" />)}</div>
                        ) : displayedBookings.length === 0 ? (
                            <div className="text-center py-16">
                                <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {activeTab === 'upcoming' ? 'No upcoming events' : 'No bookings yet'}
                                </h2>
                                <p className="text-gray-500 mb-6">
                                    {activeTab === 'upcoming'
                                        ? 'Plan your next celebration!'
                                        : 'Book your first celebration at PartyHub!'}
                                </p>
                                <Link
                                    href="/halls"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                                >
                                    Browse Halls <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {displayedBookings.map((booking: any, i) => {
                                    const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
                                    const StatusIcon = status.icon
                                    const accentColor =
                                        booking.status === 'confirmed' ? 'from-green-400 to-emerald-500'
                                            : booking.status === 'completed' ? 'from-blue-400 to-cyan-500'
                                                : booking.status === 'cancelled' ? 'from-red-400 to-red-500'
                                                    : 'from-purple-400 to-pink-500'

                                    return (
                                        <motion.div
                                            key={booking.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-gray-850"
                                        >
                                            <div className={`h-1 bg-gradient-to-r ${accentColor}`} />
                                            <div className="p-5">
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                            <span className="font-mono text-purple-600 dark:text-purple-400 text-xs font-bold bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-lg">
                                                                {booking.booking_ref}
                                                            </span>
                                                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                                                                <StatusIcon className="w-3.5 h-3.5" /> {status.label}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white text-base">{booking.hall_name}</h3>
                                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                                                            <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" />{booking.slot_date}</span>
                                                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{booking.slot_start_time?.slice(0, 5)}</span>
                                                            {booking.package_name && <span className="flex items-center gap-1"><Package className="w-4 h-4" />{booking.package_name}</span>}
                                                        </div>
                                                        <div className="mt-2 text-lg font-extrabold text-gray-900 dark:text-white">
                                                            ₹{parseFloat(booking.total_amount || 0).toLocaleString('en-IN')}
                                                        </div>
                                                    </div>

                                                    {/* QR Code */}
                                                    {booking.qr_code_token && booking.status !== 'cancelled' && (
                                                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                                                            <button
                                                                onClick={() => setExpandedQr(expandedQr === booking.id ? null : booking.id)}
                                                                className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:border-purple-400 transition-all group"
                                                                title="Tap to show QR"
                                                            >
                                                                {expandedQr === booking.id ? (
                                                                    <div className="p-1 bg-white rounded-lg">
                                                                        <QRCode value={booking.qr_code_token} size={68} />
                                                                    </div>
                                                                ) : (
                                                                    <QrCode className="w-9 h-9 text-purple-400 group-hover:text-purple-600 transition-colors" />
                                                                )}
                                                            </button>
                                                            <span className="text-xs text-gray-400">{expandedQr === booking.id ? 'Tap to hide' : 'Show QR'}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {booking.refund_amount && parseFloat(booking.refund_amount) > 0 && (
                                                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 rounded-xl text-sm text-green-700 dark:text-green-300">
                                                        ✅ Refund of <strong>₹{parseFloat(booking.refund_amount).toLocaleString('en-IN')}</strong> processed
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {booking.status === 'confirmed' && (
                                                        <button
                                                            onClick={() => handleCancel(booking.id, booking.booking_ref)}
                                                            className="text-xs px-4 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium"
                                                        >
                                                            Cancel Booking
                                                        </button>
                                                    )}
                                                    {booking.status === 'completed' && !booking.is_reviewed && (
                                                        <Link
                                                            href={`/review/${booking.id}`}
                                                            className="text-xs px-4 py-1.5 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1 font-medium"
                                                        >
                                                            <Star className="w-3.5 h-3.5" /> Leave Review
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Quick actions ───────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                    <Link
                        href="/halls"
                        className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-purple-300 hover:shadow-md transition-all"
                    >
                        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center shrink-0 group-hover:bg-purple-600 transition-colors">
                            <PartyPopper className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Book a Hall</p>
                            <p className="text-xs text-gray-500">Browse premium party venues</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors ml-auto" />
                    </Link>

                    <Link
                        href="/account/profile"
                        className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-pink-300 hover:shadow-md transition-all"
                    >
                        <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-950 flex items-center justify-center shrink-0 group-hover:bg-pink-500 transition-colors">
                            <TrendingUp className="w-6 h-6 text-pink-500 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">My Profile</p>
                            <p className="text-xs text-gray-500">Update your info & password</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-pink-500 transition-colors ml-auto" />
                    </Link>
                </motion.div>

            </div>
        </div>
    )
}
