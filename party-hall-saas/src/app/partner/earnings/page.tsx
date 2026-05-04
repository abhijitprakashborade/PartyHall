'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { IndianRupee, TrendingUp, CalendarDays, ArrowUpRight, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

interface EarningsData {
    total: number
    this_month: number
    last_month: number
    confirmed_bookings: number
    monthly_breakdown: { month: string; amount: number }[]
}

export default function PartnerEarningsPage() {
    const [data, setData] = useState<EarningsData | null>(null)
    const [loading, setLoading] = useState(true)

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/bookings/')
            const bookings: any[] = res.data.results || res.data
            const confirmed = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')

            const now = new Date()
            const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

            const byMonth: Record<string, number> = {}
            confirmed.forEach(b => {
                const key = b.slot_date?.slice(0, 7) || ''
                byMonth[key] = (byMonth[key] || 0) + parseFloat(b.total_amount || 0)
            })

            const total = confirmed.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0)
            const thisMonth = byMonth[thisMonthKey] || 0
            const lastMonth = byMonth[lastMonthKey] || 0

            const monthly_breakdown = Object.entries(byMonth)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-6)
                .map(([month, amount]) => ({
                    month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                    amount
                }))

            setData({ total, this_month: thisMonth, last_month: lastMonth, confirmed_bookings: confirmed.length, monthly_breakdown })
        } catch {
            toast.error('Failed to load earnings')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const pct = data && data.last_month > 0 ? Math.round(((data.this_month - data.last_month) / data.last_month) * 100) : null

    const cards = data ? [
        { label: 'Total Earnings', value: `₹${data.total.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'from-purple-500 to-purple-700' },
        { label: 'This Month', value: `₹${data.this_month.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'from-green-500 to-emerald-700', badge: pct !== null ? `${pct >= 0 ? '+' : ''}${pct}% vs last` : undefined },
        { label: 'Last Month', value: `₹${data.last_month.toLocaleString('en-IN')}`, icon: CalendarDays, color: 'from-blue-500 to-blue-700' },
        { label: 'Confirmed Bookings', value: data.confirmed_bookings, icon: ArrowUpRight, color: 'from-pink-500 to-rose-600' },
    ] : []

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Earnings</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Your hall's financial summary</p>
                </div>
                <button onClick={load} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {cards.map((c, i) => (
                    <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-3`}>
                            <c.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : c.value}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{c.label}</div>
                        {c.badge && !loading && (
                            <div className={`text-xs mt-1 font-medium ${pct! >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{c.badge}</div>
                        )}
                    </motion.div>
                ))}
            </div>

            {data && data.monthly_breakdown.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-gray-100 dark:border-white/5">
                        <h2 className="text-gray-900 dark:text-white font-semibold">Monthly Breakdown</h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {[...data.monthly_breakdown].reverse().map(({ month, amount }) => (
                            <div key={month} className="px-5 py-4 flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-300 text-sm">{month}</span>
                                <span className="text-gray-900 dark:text-white font-semibold">₹{amount.toLocaleString('en-IN')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && data?.total === 0 && (
                <div className="text-center py-16 text-gray-500 dark:text-gray-500">
                    <IndianRupee className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No earnings yet. Start accepting bookings to see revenue here.</p>
                </div>
            )}
        </div>
    )
}
