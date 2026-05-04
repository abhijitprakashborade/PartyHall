'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

interface Review {
    id: string
    rating: number
    comment: string
    is_approved: boolean
    customer_name: string
    hall_name: string
    created_at: string
}

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'pending' | 'approved' | 'all'>('pending')
    const [acting, setActing] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/reviews/')
            setReviews(res.data.results || res.data)
        } catch {
            toast.error('Failed to load reviews')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const approve = async (id: string) => {
        setActing(id)
        try {
            await api.post(`/reviews/${id}/approve/`)
            toast.success('Review approved and published')
            load()
        } catch { toast.error('Failed to approve') } finally { setActing(null) }
    }

    const remove = async (id: string) => {
        if (!confirm('Remove this review permanently?')) return
        setActing(id)
        try {
            await api.delete(`/reviews/${id}/remove/`)
            toast.success('Review removed')
            load()
        } catch { toast.error('Failed to remove') } finally { setActing(null) }
    }

    const pendingCount = reviews.filter(r => !r.is_approved).length
    const filtered = reviews.filter(r => {
        if (tab === 'pending') return !r.is_approved
        if (tab === 'approved') return r.is_approved
        return true
    })

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Review Moderation</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Approve or remove customer reviews before they go live</p>
                </div>
                <button onClick={load} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="flex gap-2 mb-6">
                {(['pending', 'approved', 'all'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:text-gray-900 dark:hover:text-white'}`}>
                        {t}
                        {t === 'pending' && pendingCount > 0 && (
                            <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 shimmer rounded-2xl" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    No {tab === 'all' ? '' : tab} reviews
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((r, i) => (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap mb-1">
                                        <span className="text-gray-900 dark:text-white font-semibold">{r.customer_name}</span>
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-700'}`} />
                                            ))}
                                        </div>
                                        {r.is_approved && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/20">Published</span>}
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{r.comment}</p>
                                    <div className="text-gray-500 dark:text-gray-500 text-xs">
                                        {r.hall_name} · {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    {!r.is_approved && (
                                        <button onClick={() => approve(r.id)} disabled={acting === r.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-xl hover:bg-green-500 transition-colors disabled:opacity-50">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                        </button>
                                    )}
                                    <button onClick={() => remove(r.id)} disabled={acting === r.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 text-xs font-medium rounded-xl hover:bg-red-600 hover:text-white transition-colors border border-red-500/30 disabled:opacity-50">
                                        <XCircle className="w-3.5 h-3.5" /> Remove
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
