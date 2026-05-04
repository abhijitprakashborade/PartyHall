'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Clock, IndianRupee, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function AdminCancellationsPage() {
    const [cancellations, setCancellations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        try {
            // Fetch cancelled bookings with no refund yet
            const res = await api.get('/bookings/', { params: { status: 'cancelled' } })
            const all = res.data.results || res.data
            setCancellations(all.filter((b: any) => !b.refund_status || b.refund_status === 'pending'))
        } catch {
            toast.error('Failed to load cancellations')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const processRefund = async (booking: any) => {
        const refundPercent = booking.refund_percentage ?? 0
        const refundAmount = Math.round((parseFloat(booking.total_amount) * refundPercent) / 100)
        if (!confirm(`Process refund of ₹${refundAmount} (${refundPercent}%) for booking ${booking.booking_ref}?`)) return

        setProcessing(booking.id)
        try {
            await api.post(`/payments/refund/${booking.id}/`)
            toast.success(`Refund of ₹${refundAmount} processed via Razorpay`)
            load()
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Refund failed')
        } finally {
            setProcessing(null)
        }
    }

    const calcHoursDiff = (booking: any) => {
        if (!booking.slot_date || !booking.slot_start_time || !booking.cancelled_at) return null
        const slot = new Date(`${booking.slot_date}T${booking.slot_start_time}`)
        const cancelled = new Date(booking.cancelled_at)
        return Math.floor((slot.getTime() - cancelled.getTime()) / 3600000)
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Refund Processing</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Cancelled bookings awaiting refund</p>
                </div>
                <button onClick={load} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="text-center py-16 text-gray-500">Loading…</div>
            ) : cancellations.length === 0 ? (
                <div className="text-center py-16">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No pending refund requests</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {cancellations.map((booking: any, i) => {
                        const refundPct = booking.refund_percentage ?? 0
                        const refundAmt = Math.round((parseFloat(booking.total_amount || 0) * refundPct) / 100)
                        const hoursDiff = calcHoursDiff(booking)

                        return (
                            <motion.div key={booking.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-mono text-purple-400 text-sm font-bold">{booking.booking_ref}</span>
                                            <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full">Cancelled</span>
                                        </div>
                                        <div className="text-gray-900 dark:text-white font-semibold">{booking.customer_name || booking.customer?.full_name}</div>
                                        <div className="text-gray-500 dark:text-gray-400 text-sm">{booking.hall_name || booking.hall?.name}</div>
                                        <div className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                                            Slot: <strong className="text-gray-700 dark:text-gray-300">{booking.slot_date} {booking.slot_start_time?.slice(0, 5)}</strong>
                                        </div>
                                        {hoursDiff !== null && (
                                            <div className="flex items-center gap-1.5 mt-2 text-sm">
                                                <Clock className="w-4 h-4 text-gray-500" />
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    Cancelled <strong className={hoursDiff >= 3 ? 'text-green-600 dark:text-green-400' : hoursDiff >= 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}>
                                                        {hoursDiff}h
                                                    </strong> before slot
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-transparent rounded-xl p-4 min-w-44 text-center">
                                        <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Total Paid</div>
                                        <div className="text-gray-900 dark:text-white font-bold text-lg">₹{parseFloat(booking.total_amount || 0).toLocaleString('en-IN')}</div>
                                        <div className={`text-xs mt-2 font-medium ${refundPct > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{refundPct}% Policy</div>
                                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">₹{refundAmt.toLocaleString('en-IN')}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500">Refund Amount</div>
                                    </div>

                                    <div className="flex flex-col gap-2 min-w-36">
                                        <button onClick={() => processRefund(booking)} disabled={processing === booking.id || refundAmt === 0}
                                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                                            {processing === booking.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
                                            {refundAmt > 0 ? `Refund ₹${refundAmt}` : 'No Refund Due'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
