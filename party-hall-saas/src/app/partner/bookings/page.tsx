'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Calendar, Clock, Users, Package, ChevronDown, ChevronUp,
    CheckCircle, XCircle, Loader2, Copy, ExternalLink,
    Utensils, Camera, Sparkles, Star, IndianRupee,
    LogIn, LogOut as LogOutIcon, RefreshCw, QrCode, Building2
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/api'

interface BookingAddon {
    name: string
    category: string
    quantity: number
    unit_price: string
}

interface BookingItem {
    id: string
    booking_ref: string
    qr_code_token: string
    status: string
    slot_date: string
    slot_start_time: string
    slot_end_time: string
    guest_count: number
    special_notes: string
    base_amount: string
    addons_amount: string
    total_amount: string
    checked_in_at: string | null
    checked_out_at: string | null
    created_at: string
    customer: { full_name: string; email: string; phone?: string }
    hall: { name: string; city: string }
    package: { name: string; price: string; inclusions: string[] } | null
    booking_addons: BookingAddon[]
}

const STATUS_COLORS: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    photography: <Camera className="w-3.5 h-3.5" />,
    food: <Utensils className="w-3.5 h-3.5" />,
    decoration: <Sparkles className="w-3.5 h-3.5" />,
    entry_effect: <Star className="w-3.5 h-3.5" />,
}

function fmt12h(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PartnerBookingsPage() {
    const { user } = useAuth()
    const [bookings, setBookings] = useState<BookingItem[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [filter, setFilter] = useState('all')
    const [hallFilter, setHallFilter] = useState('all')
    const [halls, setHalls] = useState<any[]>([])
    const [copying, setCopying] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [bkRes, hlRes] = await Promise.all([
                api.get('/bookings/'),
                api.get('/halls/')
            ])
            setBookings(bkRes.data?.results ?? bkRes.data ?? [])
            setHalls(hlRes.data?.results ?? hlRes.data ?? [])
        } catch { } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const FILTERS = ['all', 'confirmed', 'pending', 'completed', 'cancelled']

    const visible = bookings.filter(b => {
        const matchesStatus = filter === 'all' || b.status === filter
        const matchesHall = hallFilter === 'all' || b.hall?.name === hallFilter
        return matchesStatus && matchesHall
    })

    const copyLink = async (token: string) => {
        const url = `${window.location.origin}/booking/${token}`
        await navigator.clipboard.writeText(url)
        setCopying(token)
        setTimeout(() => setCopying(null), 1500)
    }

    const doCheckin = async (id: string) => {
        setActionLoading(id + '_in')
        try {
            await api.post(`/bookings/${id}/checkin/`)
            await load()
        } catch { } finally { setActionLoading(null) }
    }

    const doCheckout = async (id: string) => {
        setActionLoading(id + '_out')
        try {
            await api.post(`/bookings/${id}/checkout/`)
            await load()
        } catch { } finally { setActionLoading(null) }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guest Bookings</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} total
                        </p>
                    </div>
                    <button onClick={load} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                    {FILTERS.map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all capitalize ${
                                filter === f
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300'
                            }`}>
                            {f === 'all' ? `All (${bookings.length})` : (f || '').charAt(0).toUpperCase() + (f || '').slice(1)}
                        </button>
                    ))}
                </div>

                {/* Hall Filter */}
                {halls.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-xs font-bold text-gray-400 uppercase flex items-center px-2">Venue:</span>
                        <button onClick={() => setHallFilter('all')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                hallFilter === 'all'
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}>
                            All
                        </button>
                        {halls.map(h => (
                            <button key={h.id} onClick={() => setHallFilter(h.name)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                    hallFilter === h.name
                                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}>
                                {h.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="text-center py-20">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 dark:text-gray-500">No bookings yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visible.map(bk => {
                            const isExpanded = expanded === bk.id
                            const total = parseFloat(bk.total_amount)

                            return (
                                <motion.div key={bk.id} layout
                                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">

                                    {/* Card Header — always visible */}
                                    <div className="p-4 flex items-start gap-4">
                                        {/* Left: date block */}
                                        <div className="flex-shrink-0 w-14 h-14 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex flex-col items-center justify-center">
                                            <span className="text-xs text-purple-500 font-medium">
                                                {bk.slot_date ? new Date(bk.slot_date).toLocaleString('en-IN', { month: 'short' }) : '--'}
                                            </span>
                                            <span className="text-2xl font-bold text-purple-700 dark:text-purple-300 leading-none">
                                                {bk.slot_date ? new Date(bk.slot_date).getDate() : '--'}
                                            </span>
                                        </div>

                                        {/* Middle: info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-900 dark:text-white text-sm truncate">
                                                    {bk.customer?.full_name || bk.customer?.email}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[bk.status] || STATUS_COLORS.pending}`}>
                                                    {(bk.status || 'pending').charAt(0).toUpperCase() + (bk.status || 'pending').slice(1)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {fmt12h(bk.slot_start_time)} – {fmt12h(bk.slot_end_time)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {bk.guest_count}
                                                </span>
                                                {bk.package && (
                                                    <span className="flex items-center gap-1 text-purple-500">
                                                        <Package className="w-3 h-3" />
                                                        {bk.package.name}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 font-bold text-indigo-500">
                                                    <Building2 className="w-3 h-3" />
                                                    {bk.hall.name}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5 font-mono">{bk.booking_ref}</div>
                                        </div>

                                        {/* Right: amount + expand */}
                                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                ₹{total.toLocaleString('en-IN')}
                                            </span>
                                            <button onClick={() => setExpanded(isExpanded ? null : bk.id)}
                                                className="text-gray-400 hover:text-purple-500 transition-colors">
                                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                                                className="border-t border-gray-100 dark:border-gray-700 overflow-hidden">
                                                <div className="p-4 space-y-4">

                                                    {/* Customer info */}
                                                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
                                                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer</div>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{bk.customer?.full_name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{bk.customer?.email}</div>
                                                        {bk.customer?.phone && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">{bk.customer.phone}</div>
                                                        )}
                                                    </div>

                                                    {/* Package */}
                                                    {bk.package && (
                                                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                                                            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Package Selected</div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="font-bold text-purple-700 dark:text-purple-300">{bk.package.name}</span>
                                                                <span className="font-bold text-purple-600">₹{parseFloat(bk.package.price).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            {bk.package.inclusions?.length > 0 && (
                                                                <ul className="space-y-1">
                                                                    {bk.package.inclusions.map((inc, i) => (
                                                                        <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                                                            <CheckCircle className="w-3 h-3 text-green-500" /> {inc}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Add-ons */}
                                                    {bk.booking_addons?.length > 0 && (
                                                        <div>
                                                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Add-on Services</div>
                                                            <div className="space-y-1.5">
                                                                {bk.booking_addons.map((addon, i) => (
                                                                    <div key={i} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                                                                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                                                            {CATEGORY_ICONS[addon.category] || <Package className="w-3.5 h-3.5" />}
                                                                            <span>{addon.name}</span>
                                                                            <span className="text-xs text-gray-400">×{addon.quantity}</span>
                                                                        </div>
                                                                        <span className="font-medium text-gray-700 dark:text-gray-200">
                                                                            ₹{(parseFloat(addon.unit_price) * addon.quantity).toLocaleString('en-IN')}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Notes */}
                                                    {bk.special_notes && (
                                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-sm text-yellow-900 dark:text-yellow-200">
                                                            <span className="font-semibold">📝 Notes: </span>{bk.special_notes}
                                                        </div>
                                                    )}

                                                    {/* Price breakdown */}
                                                    <div className="space-y-1 text-sm">
                                                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                                            <span>Base</span><span>₹{parseFloat(bk.base_amount).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        {parseFloat(bk.addons_amount) > 0 && (
                                                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                                                <span>Add-ons</span><span>₹{parseFloat(bk.addons_amount).toLocaleString('en-IN')}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-100 dark:border-gray-700 pt-1">
                                                            <span>Total</span><span className="text-purple-600">₹{total.toLocaleString('en-IN')}</span>
                                                        </div>
                                                    </div>

                                                    {/* Check-in status */}
                                                    {(bk.checked_in_at || bk.checked_out_at) && (
                                                        <div className="flex gap-4 text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                                                            {bk.checked_in_at && <span>✅ Checked in {new Date(bk.checked_in_at).toLocaleTimeString('en-IN')}</span>}
                                                            {bk.checked_out_at && <span>🏁 Checked out {new Date(bk.checked_out_at).toLocaleTimeString('en-IN')}</span>}
                                                        </div>
                                                    )}

                                                    {/* Action Row */}
                                                    <div className="flex gap-2 flex-wrap pt-1">
                                                        {/* Copy booking link */}
                                                        <button onClick={() => copyLink(bk.qr_code_token)}
                                                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors">
                                                            {copying === bk.qr_code_token ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                            {copying === bk.qr_code_token ? 'Copied!' : 'Copy Link'}
                                                        </button>

                                                        {/* Open booking page */}
                                                        <a href={`/booking/${bk.qr_code_token}`} target="_blank" rel="noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors">
                                                            <ExternalLink className="w-3.5 h-3.5" /> View Ticket
                                                        </a>

                                                        {/* Check-in button */}
                                                        {bk.status === 'confirmed' && !bk.checked_in_at && (
                                                            <button onClick={() => doCheckin(bk.id)}
                                                                disabled={actionLoading === bk.id + '_in'}
                                                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                                                                {actionLoading === bk.id + '_in' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                                                                Check In
                                                            </button>
                                                        )}

                                                        {/* Check-out button */}
                                                        {bk.checked_in_at && !bk.checked_out_at && (
                                                            <button onClick={() => doCheckout(bk.id)}
                                                                disabled={actionLoading === bk.id + '_out'}
                                                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
                                                                {actionLoading === bk.id + '_out' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOutIcon className="w-3.5 h-3.5" />}
                                                                Check Out
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
