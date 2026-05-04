'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, CheckCircle, XCircle, Loader2, RefreshCw, Calendar, Clock, Users } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

type ScanState = 'idle' | 'loading' | 'success' | 'error'

export default function PartnerCheckinPage() {
    const [token, setToken] = useState('')
    const [state, setState] = useState<ScanState>('idle')
    const [booking, setBooking] = useState<any>(null)
    const [errorMsg, setErrorMsg] = useState('')
    const [confirming, setConfirming] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { inputRef.current?.focus() }, [])

    // Extract just the token from whatever was scanned/pasted:
    // Handles: full URL "http://localhost:3000/booking/abc123"
    //          full URL with /services suffix
    //          raw token "abc123def456..."
    const extractToken = (raw: string): string => {
        const s = raw.trim()
        // Try to parse as URL and grab the last path segment
        try {
            const url = new URL(s)
            const parts = url.pathname.split('/').filter(Boolean)
            // /booking/<token>  or  /booking/<token>/services
            const bookingIdx = parts.indexOf('booking')
            if (bookingIdx >= 0 && parts[bookingIdx + 1]) {
                return parts[bookingIdx + 1]  // ← just the token part
            }
        } catch {
            // Not a URL — use as-is (raw token or booking ref)
        }
        return s
    }

    const handleLookup = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!token.trim()) return
        setState('loading')
        setBooking(null)
        const resolvedToken = extractToken(token)
        setToken(resolvedToken)  // normalize what's shown in the input
        try {
            const res = await api.get('/bookings/checkin_lookup/', { params: { token: resolvedToken } })
            setBooking(res.data)
            setState('success')
        } catch (err: any) {
            setErrorMsg(err?.response?.data?.error || 'Invalid or expired QR code')
            setState('error')
        }
    }

    const handleCheckin = async () => {
        if (!booking) return
        setConfirming(true)
        try {
            const res = await api.post(`/bookings/${booking.id}/checkin/`)
            toast.success(`✅ ${res.data.customer_name} checked in!`)
            setBooking((prev: any) => ({ ...prev, checked_in_at: res.data.checked_in_at, status: 'confirmed' }))
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Check-in failed')
        } finally {
            setConfirming(false)
        }
    }

    const handleCheckout = async () => {
        if (!booking) return
        setConfirming(true)
        try {
            const res = await api.post(`/bookings/${booking.id}/checkout/`)
            toast.success(`🎉 ${booking.customer_name} checked out! Event completed.`)
            setBooking((prev: any) => ({ ...prev, checked_out_at: res.data.checked_out_at, status: 'completed' }))
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Check-out failed')
        } finally {
            setConfirming(false)
        }
    }

    const reset = () => {
        setToken('')
        setBooking(null)
        setState('idle')
        setErrorMsg('')
        setTimeout(() => inputRef.current?.focus(), 100)
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Venue Check-In / Out</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage venue entrance and exit via QR token</p>
            </div>

            <div className="max-w-lg">
                {/* Token input form */}
                <form onSubmit={handleLookup} className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">QR Token / Booking Code</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                placeholder="Paste QR token here…"
                                className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={state === 'loading' || !token.trim()}
                            className="px-5 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lookup'}
                        </button>
                    </div>
                </form>

                {/* Result */}
                <AnimatePresence mode="wait">
                    {state === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-2xl p-5 flex items-start gap-4"
                        >
                            <XCircle className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-700 dark:text-red-300 font-semibold">QR Code Invalid</p>
                                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errorMsg}</p>
                                <button onClick={reset} className="mt-3 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    <RefreshCw className="w-3.5 h-3.5" /> Try again
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {state === 'success' && booking && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm"
                        >
                            {/* Status banner */}
                            <div className={`px-5 py-3 flex items-center gap-3 ${booking.status === 'completed' ? 'bg-green-100 dark:bg-green-500/20' : booking.checked_in_at ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-purple-50 dark:bg-purple-500/10'} border-b border-gray-100 dark:border-white/5`}>
                                <CheckCircle className={`w-5 h-5 ${booking.status === 'completed' ? 'text-green-600 dark:text-green-400' : booking.checked_in_at ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                        {booking.status === 'completed' ? ' Event Completed' : booking.checked_in_at ? ' Currently Checked In' : '✅ Ready for Check-In'}
                                    </p>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs font-mono">{booking.booking_ref}</p>
                                </div>
                            </div>

                            {/* Booking details */}
                            <div className="p-5 space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{booking.customer_name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {booking.slot_date && (
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                                            <Calendar className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                            {new Date(booking.slot_date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </div>
                                    )}
                                    {booking.slot_start_time && (
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                                            <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                            {booking.slot_start_time?.slice(0, 5)}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                                        <Users className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                        {booking.guest_count} people
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-300 text-sm">
                                        📦 {booking.package_name || '—'}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-2 space-y-2">
                                    {!booking.checked_in_at && (
                                        <button
                                            onClick={handleCheckin}
                                            disabled={confirming}
                                            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                        >
                                            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓ Confirm Check-In'}
                                        </button>
                                    )}

                                    {booking.checked_in_at && !booking.checked_out_at && (
                                        <button
                                            onClick={handleCheckout}
                                            disabled={confirming}
                                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                        >
                                            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : '⇥ Confirm Check-Out'}
                                        </button>
                                    )}

                                    {booking.checked_out_at && (
                                        <div className="py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-center text-gray-600 dark:text-gray-400 font-semibold text-sm border border-gray-200 dark:border-gray-700">
                                            Completed at {new Date(booking.checked_out_at).toLocaleTimeString('en-IN')}
                                        </div>
                                    )}
                                </div>

                                <button onClick={reset} className="w-full py-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm transition-colors flex items-center justify-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5" /> Scan another
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
