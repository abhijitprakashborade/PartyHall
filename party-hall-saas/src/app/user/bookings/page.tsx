'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Calendar, Clock, MapPin, Package, IndianRupee,
    ChevronDown, ChevronUp, QrCode as QrCodeIcon,
    RefreshCw, Ticket, AlertCircle, CheckCircle2,
    XCircle, Loader2, Star, ExternalLink, Copy, CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'
import api from '@/lib/api'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })
import { differenceInHours, parseISO } from 'date-fns'
import {
    Dialog, DialogTitle, DialogContent,
    DialogActions, DialogContentText, Button, CircularProgress
} from '@mui/material'

function getRefundInfo(bookingDate: string, startTime: string, totalPaid: number) {
    const bookingStart = parseISO(`${bookingDate}T${startTime}`)
    const hoursUntil = differenceInHours(bookingStart, new Date())

    if (hoursUntil >= 3) return {
        pct: 50, amount: totalPaid * 0.5,
        label: '50% refund', window: '3+ hours before', eligible: true,
        color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20'
    }
    if (hoursUntil >= 2) return {
        pct: 25, amount: totalPaid * 0.25,
        label: '25% refund', window: '2–3 hours before', eligible: true,
        color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20'
    }
    if (hoursUntil >= 0) return {
        pct: 0, amount: 0,
        label: 'No refund', window: 'Under 2 hours', eligible: true,
        color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20'
    }
    return { pct: 0, amount: 0, label: 'Cannot cancel', eligible: false, color: '', bg: '' }
}

interface Booking {
    id: string
    booking_ref: string
    hall_name: string
    hall_id: string
    slot_date: string
    slot_start_time: string
    slot_end_time: string
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
    total_amount: string
    guest_count: number
    package_name?: string
    package_price?: string
    special_notes?: string
    qr_code_token?: string
    created_at: string
    addons?: { name: string; price: string; quantity: number }[]
    refund_status?: string
    refund_amount?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    confirmed: { label: 'Confirmed', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
    completed: { label: 'Completed', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: CheckCircle2 },
    pending: { label: 'Pending', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Loader2 },
    cancelled: { label: 'Cancelled', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle },
}

const formatTo12h = (t: string) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    let hr = parseInt(h)
    const ap = hr >= 12 ? 'PM' : 'AM'
    hr = hr % 12 || 12
    return `${hr}:${m} ${ap}`
}

const formatDate = (d: string) =>
    new Date(d + 'T00:00').toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    })

function BookingCard({ booking, onRefresh }: { booking: Booking; onRefresh: () => void }) {
    const [expanded, setExpanded] = useState(false)
    const [reviewing, setReviewing] = useState(false)
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [reviewed, setReviewed] = useState(false)
    const [copied, setCopied] = useState(false)
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
    const StatusIcon = cfg.icon
    const canShowQR = ['confirmed', 'completed'].includes(booking.status) && booking.qr_code_token
    const isCompleted = booking.status === 'completed'

    // Full ticket URL — this is what the QR encodes
    const ticketUrl = typeof window !== 'undefined' && booking.qr_code_token
        ? `${window.location.origin}/booking/${booking.qr_code_token}`
        : ''

    const copyLink = async () => {
        if (!ticketUrl) return
        await navigator.clipboard.writeText(ticketUrl)
        setCopied(true)
        toast.success('Booking link copied!')
        setTimeout(() => setCopied(false), 2000)
    }

    const submitReview = async () => {
        if (!comment.trim()) { toast.error('Please write a comment before submitting.'); return }
        setSubmitting(true)
        try {
            await api.post('/reviews/', {
                hall: booking.hall_id,
                booking: booking.id,
                rating,
                comment: comment.trim(),
            })
            toast.success('Review submitted! It will go live after admin approval 🎉')
            setReviewing(false)
            setReviewed(true)
        } catch (err: any) {
            // Parse DRF validation errors — they come as { field: ["msg"] } objects
            const data = err.response?.data
            if (data && typeof data === 'object') {
                if (data.booking) {
                    // OneToOneField duplicate
                    toast.error('You have already submitted a review for this booking.')
                } else if (data.non_field_errors) {
                    toast.error(data.non_field_errors[0])
                } else if (data.detail) {
                    toast.error(data.detail)
                } else {
                    // Show the first field error we find
                    const firstKey = Object.keys(data)[0]
                    toast.error(data[firstKey]?.[0] || 'Could not submit review.')
                }
            } else {
                toast.error('Could not submit review. Please try again.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleCancel = async () => {
        setCancelling(true)
        try {
            await api.post(`/bookings/${booking.id}/cancel/`)
            const refund = getRefundInfo(booking.slot_date, booking.slot_start_time, parseFloat(booking.total_amount))
            toast.success(`Booking cancelled. Refund of ₹${refund.amount.toLocaleString('en-IN')} will be processed in 3-5 days.`)
            setCancelDialogOpen(false)
            onRefresh()
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Could not cancel booking. Please try again.')
        } finally {
            setCancelling(false)
        }
    }

    const refundInfo = getRefundInfo(booking.slot_date, booking.slot_start_time, parseFloat(booking.total_amount))
    const isConfirmed = booking.status === 'confirmed'
    const showCancelButton = isConfirmed && refundInfo.eligible

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
            {/* Top colour strip */}
            <div className={`h-1 w-full ${booking.status === 'confirmed' ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : booking.status === 'completed' ? 'bg-gradient-to-r from-blue-400 to-indigo-500'
                : booking.status === 'cancelled' ? 'bg-gradient-to-r from-red-400 to-rose-500'
                : 'bg-gradient-to-r from-yellow-400 to-amber-500'}`} />

            {/* Main row */}
            <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">{booking.booking_ref}</span>
                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
                                <StatusIcon className="w-3 h-3" />{cfg.label}
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">{booking.hall_name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                                {formatDate(booking.slot_date)}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-purple-400" />
                                {formatTo12h(booking.slot_start_time)} – {formatTo12h(booking.slot_end_time)} IST
                            </span>
                        </div>

                        {/* Refund Info Strip */}
                        {isConfirmed && refundInfo.eligible && (
                            <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-[11px] font-bold ${refundInfo.bg} ${refundInfo.color} border border-current opacity-80`}>
                                <AlertCircle className="w-3 h-3" />
                                {refundInfo.pct > 0
                                    ? `Cancel now → get ₹${refundInfo.amount.toLocaleString('en-IN')} back (${refundInfo.pct}%)`
                                    : 'No refund if cancelled now'}
                            </div>
                        )}
                        {booking.status === 'cancelled' && (
                            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 border border-gray-200 dark:border-gray-600">
                                <XCircle className="w-3 h-3 text-red-400" />
                                {booking.refund_amount && parseFloat(booking.refund_amount) > 0
                                    ? `Refund: ₹${parseFloat(booking.refund_amount).toLocaleString('en-IN')} processing`
                                    : 'Cancelled · No refund'}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                            <div className="text-xs text-gray-400">Total Paid</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                ₹{parseFloat(booking.total_amount || '0').toLocaleString('en-IN')}
                            </div>
                        </div>
                        <button onClick={() => setExpanded(e => !e)}
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                        </button>
                    </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 mt-4 border-t border-dashed border-gray-200 dark:border-gray-700 grid sm:grid-cols-2 gap-4">
                                {/* Left — details */}
                                <div className="space-y-3">
                                    {/* Package */}
                                    {booking.package_name && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Package className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Package: </span>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{booking.package_name}</span>
                                                {booking.package_price && (
                                                    <span className="ml-1 text-purple-600 dark:text-purple-400 font-bold">
                                                        (₹{parseFloat(booking.package_price).toLocaleString('en-IN')})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {/* Guests */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <IndianRupee className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <span className="text-gray-500 dark:text-gray-400">People: </span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{booking.guest_count}</span>
                                    </div>
                                    {/* Addons */}
                                    {booking.addons && booking.addons.length > 0 && (
                                        <div className="text-sm">
                                            <p className="text-gray-500 dark:text-gray-400 mb-1">Add-ons:</p>
                                            <ul className="space-y-1">
                                                {booking.addons.map((a, i) => (
                                                    <li key={i} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                                                        <span>{a.name} {a.quantity > 1 ? `×${a.quantity}` : ''}</span>
                                                        <span className="font-semibold">₹{(parseFloat(a.price) * (a.quantity || 1)).toLocaleString('en-IN')}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {/* Notes */}
                                    {booking.special_notes && (
                                        <div className="text-sm">
                                            <p className="text-gray-500 dark:text-gray-400 mb-0.5">Special Requests:</p>
                                            <p className="text-gray-700 dark:text-gray-300 italic text-xs">{booking.special_notes}</p>
                                        </div>
                                    )}
                                    {/* Refund info */}
                                    {booking.status === 'cancelled' && (
                                        <div className="text-xs px-3 py-2 rounded-xl font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/40">
                                            <p className="font-bold uppercase tracking-wider text-[10px] mb-1">Cancellation Summary</p>
                                            {booking.refund_amount && parseFloat(booking.refund_amount) > 0
                                                ? `A refund of ₹${parseFloat(booking.refund_amount).toLocaleString('en-IN')} is being processed to your original payment method.`
                                                : 'This booking was cancelled outside of the refund window. No refund applicable.'}
                                        </div>
                                    )}
                                    {/* Review button / thank-you state for completed bookings */}
                                    {isCompleted && reviewed && (
                                        <div className="flex items-center gap-2 text-sm px-4 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-700/40 font-medium">
                                            <CheckCircle2 className="w-4 h-4" /> Review submitted — pending approval
                                        </div>
                                    )}
                                    {isCompleted && !reviewing && !reviewed && (
                                        <button onClick={() => setReviewing(true)}
                                            className="flex items-center gap-2 text-sm px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-xl border border-yellow-200 dark:border-yellow-700/40 hover:bg-yellow-100 transition-colors font-medium">
                                            <Star className="w-4 h-4" /> Leave a Review
                                        </button>
                                    )}
                                    {/* Review form */}
                                    {reviewing && (
                                        <div className="space-y-2">
                                            <div className="flex gap-1">
                                                {[1,2,3,4,5].map(n => (
                                                    <button key={n} onClick={() => setRating(n)}>
                                                        <Star className={`w-6 h-6 ${n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea value={comment} onChange={e => setComment(e.target.value)}
                                                rows={2} placeholder="Share your experience…"
                                                className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400" />
                                            <div className="flex gap-2">
                                                <button onClick={() => setReviewing(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">Cancel</button>
                                                <button onClick={submitReview} disabled={submitting || !comment}
                                                    className="text-xs px-4 py-1.5 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-50">
                                                    {submitting ? 'Submitting…' : 'Submit'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right — QR codes */}
                                <div className="flex flex-col items-center justify-start">
                                    {canShowQR ? (
                                        <div className={`w-full ${booking.status === 'cancelled' ? 'opacity-20 grayscale pointer-events-none' : ''}`}>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-3">Your QR Codes</p>

                                            <div className="grid grid-cols-2 gap-2">
                                                {/* Entry QR */}
                                                <div className="flex flex-col items-center bg-gradient-to-b from-purple-50 to-white border-2 border-purple-200 rounded-2xl p-2.5">
                                                    <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-1.5">🚪 Entry QR</span>
                                                    <div className="p-1.5 bg-white rounded-xl shadow-sm mb-1.5">
                                                        <QRCode
                                                            value={ticketUrl || booking.qr_code_token!}
                                                            size={85}
                                                            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                                            viewBox="0 0 256 256"
                                                            level="M"
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 text-center leading-tight mb-1.5">Show at gate</p>
                                                    <a
                                                        href={ticketUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[9px] px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors"
                                                    >
                                                        Open
                                                    </a>
                                                </div>

                                                {/* Services QR */}
                                                <div className="flex flex-col items-center bg-gradient-to-b from-pink-50 to-white border-2 border-pink-200 rounded-2xl p-2.5">
                                                    <span className="text-[9px] font-black text-pink-600 uppercase tracking-widest mb-1.5">🎪 Services QR</span>
                                                    <div className="p-1.5 bg-white rounded-xl shadow-sm mb-1.5">
                                                        <QRCode
                                                            value={`${ticketUrl}/services`}
                                                            size={85}
                                                            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                                            viewBox="0 0 256 256"
                                                            level="M"
                                                            fgColor="#be185d"
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 text-center leading-tight mb-1.5">For venue staff</p>
                                                    <a
                                                        href={`${ticketUrl}/services`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[9px] px-2.5 py-1 rounded-lg bg-pink-600 text-white font-bold hover:bg-pink-700 transition-colors"
                                                    >
                                                        View
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Copy link */}
                                            <button
                                                onClick={copyLink}
                                                className="w-full mt-2 flex items-center justify-center gap-1.5 text-[10px] px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                {copied
                                                    ? <><CheckCircle className="w-3 h-3 text-green-500" /> Copied!</>
                                                    : <><Copy className="w-3 h-3" /> Copy Booking Link</>
                                                }
                                            </button>

                                            {showCancelButton && (
                                                <button
                                                    onClick={() => setCancelDialogOpen(true)}
                                                    className="w-full mt-2 flex items-center justify-center gap-1.5 text-[10px] px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <XCircle className="w-3 h-3" /> Cancel Booking
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-300 dark:text-gray-600 py-4">
                                            <QrCodeIcon className="w-16 h-16 mx-auto mb-2 opacity-30" />
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                {booking.status === 'cancelled' ? 'Booking cancelled' : 'QR available after confirmation'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Cancel Confirmation Dialog */}
            <Dialog 
                open={cancelDialogOpen} 
                onClose={() => !cancelling && setCancelDialogOpen(false)}
                PaperProps={{
                    sx: { borderRadius: 4, p: 1, width: '100%', maxWidth: 400 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Cancel Booking?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontSize: '0.95rem' }}>
                        {refundInfo.pct > 0 ? (
                            <>
                                You will receive a <span className="text-green-600 font-bold">₹{refundInfo.amount.toLocaleString('en-IN')} ({refundInfo.pct}%)</span> refund to your original payment method. 
                                This window expires {refundInfo.window}.
                            </>
                        ) : (
                            "You will receive no refund as the booking starts in less than 2 hours."
                        )}
                        <br /><br />
                        Are you sure you want to proceed? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button 
                        onClick={() => setCancelDialogOpen(false)} 
                        disabled={cancelling}
                        variant="outlined"
                        sx={{ borderRadius: 3, textTransform: 'none', px: 3 }}
                    >
                        Keep Booking
                    </Button>
                    <Button 
                        onClick={handleCancel} 
                        disabled={cancelling}
                        variant="contained" 
                        color="error"
                        sx={{ borderRadius: 3, textTransform: 'none', px: 3, fontWeight: 'bold' }}
                        startIcon={cancelling && <CircularProgress size={16} color="inherit" />}
                    >
                        {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                    </Button>
                </DialogActions>
            </Dialog>
        </motion.div>
    )
}

export default function UserBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all')

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/bookings/')
            setBookings(res.data.results || res.data || [])
        } catch {
            toast.error('Failed to load bookings')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const filtered = bookings.filter(b => filter === 'all' || b.status === filter)

    const counts = {
        all: bookings.length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">All your party hall reservations in one place</p>
                    </div>
                    <button onClick={load} disabled={loading}
                        className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    {(['all','confirmed','completed','cancelled'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${filter === f
                                ? 'bg-purple-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}>
                            {f} {counts[f] > 0 && <span className="ml-1 opacity-70">({counts[f]})</span>}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="space-y-4">
                        {[1,2,3].map(i => <div key={i} className="h-28 bg-white dark:bg-gray-800 rounded-2xl shimmer" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                            {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
                        </h3>
                        <p className="text-gray-400 mb-6 text-sm">Book your first party hall and make memories!</p>
                        <Link href="/halls"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-purple-500/30 transition-all">
                            Browse Halls
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((b, i) => (
                            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <BookingCard booking={b} onRefresh={load} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    )
}
