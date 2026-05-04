'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
    TrendingUp, Users, Eye, MousePointer2, 
    Calendar, AlertCircle, Lock, Loader2,
    Trophy, Target, BarChart3
} from 'lucide-react'
import api from '@/lib/api'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const PartnerAnalyticsCharts = dynamic(() => import('@/components/charts/PartnerAnalyticsCharts'), {
    ssr: false,
    loading: () => <div className="h-[300px] flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
})

interface AnalyticsData {
    views: number
    conversion_rate: string
    revenue_trend: number[]
    popular_slots: string[]
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        api.get('/subscriptions/analytics-summary/')
            .then(res => {
                setData(res.data)
                setLoading(false)
            })
            .catch(err => {
                setError(err.response?.data?.error || 'Failed to load analytics')
                setLoading(false)
            })
    }, [])

    if (loading) return (
        <div className="min-h-[400px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
    )

    if (error === 'feature_locked') {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-purple-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Advanced Analytics Locked</h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                    Unlock powerful insights, conversion tracking, and performance trends with our Pro or Elite plans.
                </p>
                <Link 
                    href="/partner/subscription"
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                >
                    Upgrade Now
                </Link>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
            </div>
        )
    }

    const chartData = data?.revenue_trend.map((val, i) => ({ name: `Day ${i+1}`, value: val })) || []

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Analytics</h1>
                <p className="text-gray-500 dark:text-gray-400">Track your hall's success and growing popularity</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Views', value: data?.views.toLocaleString() || '0', icon: <Eye />, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Conversion Rate', value: data?.conversion_rate || '0%', icon: <Target />, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: 'Avg. Booking Value', value: '₹4,500', icon: <TrendingUp />, color: 'text-green-500', bg: 'bg-green-50' },
                    { label: 'Active Slots', value: '12', icon: <Calendar />, color: 'text-orange-500', bg: 'bg-orange-50' },
                ].map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label} 
                        className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                        <div className={`w-12 h-12 ${stat.bg} dark:bg-gray-700 rounded-xl flex items-center justify-center ${stat.color} mb-4`}>
                            {stat.icon}
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-500" />
                            Revenue Trend
                        </h3>
                        <select className="bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-purple-500">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    {/* ISSUE #26 fix: chart container needs explicit height for Recharts SVG to render on mobile */}
                    <div style={{ minHeight: 300 }}>
                        <PartnerAnalyticsCharts chartData={chartData} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Popular Slots
                    </h3>
                    <div className="space-y-4">
                        {data?.popular_slots.map((slot, i) => (
                            <div key={slot} className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500">
                                    {i+1}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{slot}</p>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-1 overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${100 - (i * 20)}%` }}
                                            className="h-full bg-amber-500" 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed font-medium">
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                            Your weekend slots are 85% more likely to be booked than weekdays.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
