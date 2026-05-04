'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Star, Send, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/shared/Navbar'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function ReviewPage() {
    const { bookingId } = useParams()
    const router = useRouter()
    const [booking, setBooking] = useState<any>(null)
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get(`/bookings/${bookingId}/`)
                const b = res.data
                if (b.status !== 'completed') {
                    toast.error('This booking cannot be reviewed yet')
                    router.push('/account/orders')
                    return
                }
                setBooking(b)
            } catch {
                toast.error('Booking not found')
                router.push('/account/orders')
            } finally {
                setLoading(false)
            }
        }
        if (bookingId) load()
    }, [bookingId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (rating === 0) { toast.error('Please select a star rating'); return }
        if (comment.trim().length < 10) { toast.error('Please write at least 10 characters'); return }
        setSubmitting(true)
        try {
            await api.post('/reviews/', {
                hall: booking.hall,
                booking: booking.id,
                rating,
                comment: comment.trim(),
            })
            toast.success('Review submitted! Thank you 🎉')
            router.push('/account/orders')
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

    if (loading) return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-lg mx-auto px-4 pt-24 pb-16">
                <div className="bg-white rounded-3xl p-8 shimmer h-80" />
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-lg mx-auto px-4 pt-20 sm:pt-24 pb-16">
                <Link href="/account/orders" className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back to My Bookings
                </Link>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-6 text-white">
                        <h1 className="text-xl sm:text-2xl font-bold font-heading">Rate Your Experience</h1>
                        <p className="text-white/70 text-sm mt-1">{booking?.hall_name}</p>
                        <p className="text-white/50 text-xs mt-0.5">{booking?.slot_date} · {booking?.package_name}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="text-center">
                            <p className="text-gray-700 font-semibold mb-4">How was your celebration?</p>
                            <div className="flex items-center justify-center gap-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button key={star} type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="transition-transform hover:scale-110 focus:outline-none">
                                        <Star className={`w-10 h-10 transition-all duration-150 ${star <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-100'}`} />
                                    </button>
                                ))}
                            </div>
                            {(hoverRating || rating) > 0 && (
                                <p className="text-purple-600 font-semibold mt-2 text-sm">{labels[hoverRating || rating]}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-700 block mb-2">
                                Share your experience <span className="text-gray-400 font-normal">(min 10 chars)</span>
                            </label>
                            <textarea value={comment} onChange={e => setComment(e.target.value)}
                                rows={5} maxLength={500}
                                placeholder="Tell others about decoration, sound quality, service, cleanliness…"
                                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400" />
                            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/500</p>
                        </div>

                        <button type="submit" disabled={submitting || rating === 0}
                            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                            <Send className="w-4 h-4" />
                            {submitting ? 'Submitting…' : 'Submit Review'}
                        </button>
                        <p className="text-xs text-gray-400 text-center">Your review will be visible after admin approval</p>
                    </form>
                </motion.div>
            </div>
        </div>
    )
}
