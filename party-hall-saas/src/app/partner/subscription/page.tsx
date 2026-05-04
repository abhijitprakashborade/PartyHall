'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Box, LinearProgress, Chip, Typography, Divider
} from '@mui/material'
import {
    Crown, Zap, Clock, CheckCircle, AlertTriangle,
    Star, Loader2, ArrowRight, Shield, RefreshCw, XCircle, Building2
} from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { differenceInDays, parseISO, format } from 'date-fns'

interface SubStatus {
    status: string           // 'none' | 'trial' | 'active' | 'expired' | 'cancelled'
    plan_id?: string
    expires_at?: string
    is_trial?: boolean
    is_valid?: boolean
    trial_used?: boolean
    trial_started_at?: string
    days_remaining?: number
    can_change_plan?: boolean
    plan_info?: {
        name: string
        price: number
        hall_limit: number
        has_advanced_analytics: boolean
        features: string[]
    }
}

interface Plan {
    id: string
    name: string
    slug: string
    price: number | string
    hall_limit: number
    has_advanced_analytics: boolean
    features: string[]
    default_duration_days?: number | null
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
    starter: <Zap className="w-6 h-6" />,
    pro: <Star className="w-6 h-6" />,
    elite: <Crown className="w-6 h-6" />,
}

const PLAN_COLORS: Record<string, string> = {
    starter: 'from-blue-500 to-cyan-500',
    pro: 'from-purple-500 to-pink-500',
    elite: 'from-amber-500 to-orange-500',
}

function getPlanIcon(slug: string | undefined) {
    return PLAN_ICONS[slug || ''] || <Shield className="w-6 h-6" />
}

function getPlanColor(slug: string | undefined) {
    return PLAN_COLORS[slug || ''] || 'from-gray-500 to-slate-500'
}

function formatPlanName(name: string) {
    if (!name) return ''
    // Capitalize each word and remove duplicate "Plan" if it already exists in the name
    const formatted = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    return formatted.toLowerCase().includes('plan') ? formatted : `${formatted} Plan`
}

function useCountdown(expiresAt: string | undefined) {
    const [remaining, setRemaining] = useState('')

    useEffect(() => {
        if (!expiresAt) return
        const interval = setInterval(() => {
            const diff = new Date(expiresAt).getTime() - Date.now()
            if (diff <= 0) { setRemaining('Expired'); clearInterval(interval); return }
            const m = Math.floor(diff / 60000)
            const s = Math.floor((diff % 60000) / 1000)
            setRemaining(`${m}m ${s}s`)
        }, 1000)
        return () => clearInterval(interval)
    }, [expiresAt])

    return remaining
}

export default function PartnerSubscriptionPage() {
    const [sub, setSub] = useState<SubStatus | null>(null)
    const [plans, setPlans] = useState<Plan[]>([])
    const [hallUsage, setHallUsage] = useState<{ hall_count: number; hall_limit: number; halls_remaining: number; plan_name: string; published_count: number; published_limit: number } | null>(null)
    const [loading, setLoading] = useState(true)
    const [trialLoading, setTrialLoading] = useState(false)
    const [payLoading, setPayLoading] = useState<string | null>(null)
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    const countdown = useCountdown(sub?.is_trial ? sub?.expires_at : undefined)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [subRes, plansRes, usageRes] = await Promise.all([
                api.get('/subscriptions/'),
                api.get('/subscriptions/plans/'),
                api.get('/subscriptions/hall-status/').catch(() => ({ data: null })),
            ])
            setSub(subRes.data)
            setPlans(Array.isArray(plansRes.data) ? plansRes.data : [])
            if (usageRes.data) setHallUsage(usageRes.data)
        } catch { } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const startTrial = async () => {
        setTrialLoading(true)
        setErrorMsg('')
        try {
            const res = await api.post('/subscriptions/start-trial/')
            setSuccessMsg(res.data.message || 'Trial started! Your hall is now live.')
            await load()
        } catch (e: any) {
            setErrorMsg(e?.response?.data?.error || 'Could not start trial.')
        } finally { setTrialLoading(false) }
    }

    const subscribe = async (planId: string) => {
        // Guard: never call the API if current plan is still active (prevents repeated 400s)
        if (sub?.is_valid && !sub?.is_trial) {
            setErrorMsg('Your current plan is still active. You can subscribe to a new plan after it expires.')
            setSelectedPlan(null)
            return
        }
        setPayLoading(planId)
        setErrorMsg('')
        try {
            // Create Razorpay order (use plan slug from the plan object)
            const planObj = plans.find(p => p.id === planId)
            const planSlug = planObj?.slug || planId
            const orderRes = await api.post('/subscriptions/', { plan_id: planSlug })
            const { order_id, amount, key, dummy } = orderRes.data

            if (dummy || order_id.startsWith('dummy_')) {
                // Demo mode: skip Razorpay UI, directly verify
                await api.put('/subscriptions/', {
                    razorpay_order_id: order_id,
                    razorpay_payment_id: 'demo_pay',
                    razorpay_signature: '',
                    plan_id: planSlug,
                    dummy: true,
                })
                setSuccessMsg(`🎉 ${formatPlanName(planObj?.name || planSlug)} activated! Your halls are now live.`)
                toast.success(`${formatPlanName(planObj?.name || planSlug)} activated!`, {
                    description: 'Your halls are now live and visible to customers.',
                    duration: 4000
                })
                await load()
            } else {
                // Real Razorpay
                const Razorpay = (window as any).Razorpay
                if (!Razorpay) {
                    setErrorMsg('Razorpay not loaded. Refresh and try again.')
                    return
                }
                const rzp = new Razorpay({
                    key,
                    amount,
                    currency: 'INR',
                    name: 'PartyHub Subscription',
                    description: `${planObj?.name || planSlug} Plan`,
                    order_id,
                    handler: async (response: any) => {
                        try {
                            await api.put('/subscriptions/', {
                                razorpay_order_id: order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                plan_id: planSlug,
                            })
                            setSuccessMsg('🎉 Subscription activated! Your halls are live.')
                            toast.success('Subscription activated!', {
                                description: 'Your halls are now live and visible to customers.',
                                duration: 4000
                            })
                            await load()
                        } catch {
                            setErrorMsg('Payment verified but activation failed. Contact support.')
                        }
                    },
                    prefill: { name: 'Partner', email: '' },
                    theme: { color: '#7c3aed' },
                })
                rzp.open()
            }
        } catch (e: any) {
            const data = e?.response?.data
            const status = e?.response?.status

            if (status === 400) {
                // Backend explicitly blocked the request — show their message
                const msg = data?.error || data?.detail || data?.message || 'Cannot process subscription right now.'
                setErrorMsg(msg)
                if (msg.toLowerCase().includes('still active') || msg.toLowerCase().includes('already have')) {
                    // Plan is active — clear selection so CTA disappears
                    setSelectedPlan(null)
                    await load()  // refresh status card
                }
            } else if (status === 402) {
                setErrorMsg(data?.message || 'Subscription required. Please choose a plan.')
            } else {
                setErrorMsg(data?.error || data?.detail || 'Payment failed. Please try again.')
            }
        } finally { setPayLoading(null) }
    }

    if (loading) return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
    )

    const isTrialActive = sub?.status === 'trial' && sub?.is_valid
    const isPlanActive = sub?.status === 'active' && sub?.is_valid && !sub?.is_trial
    const isExpired = sub?.status === 'expired' || sub?.status === 'cancelled' || (sub?.is_valid === false && sub?.status !== 'none')
    const noSub = sub?.status === 'none'
    const canUpgrade = sub?.can_change_plan !== false

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Manage your plan to keep your halls live</p>
                    </div>
                    <button onClick={load} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        <RefreshCw className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Alerts */}
                {successMsg && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-green-900 dark:text-green-200 text-sm">{successMsg}</p>
                    </motion.div>
                )}
                {errorMsg && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-900 dark:text-red-200 text-sm">{errorMsg}</p>
                            <button onClick={() => setErrorMsg('')} className="text-xs text-red-500 mt-1">Dismiss</button>
                        </div>
                    </motion.div>
                )}

                {/* ── STATUS CARDS ─────────────────────────────────── */}

                {/* No subscription — trial available */}
                {(noSub || (!sub?.trial_used && !isPlanActive)) && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl p-6 mb-8 text-white shadow-2xl shadow-purple-500/30">
                        <div className="flex items-center gap-3 mb-3">
                            <Zap className="w-7 h-7" />
                            <h2 className="text-xl font-bold">Try Free for 1 Hour</h2>
                        </div>
                        <p className="text-white/80 text-sm mb-5">
                            Publish your hall for 1 hour — completely free. See how it works before subscribing.
                        </p>
                        <ul className="space-y-1.5 mb-6">
                            {['Publish 1 hall immediately', 'Real slot bookings', 'No credit card needed'].map(f => (
                                <li key={f} className="flex items-center gap-2 text-sm text-white/90">
                                    <CheckCircle className="w-4 h-4 text-white/70" /> {f}
                                </li>
                            ))}
                        </ul>
                        <button onClick={startTrial} disabled={trialLoading}
                            className="w-full py-3 rounded-xl bg-white text-purple-600 font-bold hover:bg-purple-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                            {trialLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            {trialLoading ? 'Starting Trial…' : 'Start Free Trial'}
                        </button>
                    </motion.div>
                )}

                {/* Trial active — countdown */}
                {isTrialActive && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-5 mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-600" />
                                <span className="font-bold text-amber-900 dark:text-amber-200">Free Trial Active</span>
                            </div>
                            <span className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-300">{countdown}</span>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            Your hall is live! Subscribe before your trial ends to keep it visible to users.
                        </p>
                        {/* Trial progress bar */}
                        <div className="mt-3 h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-amber-500 rounded-full"
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: sub?.expires_at ? (new Date(sub.expires_at).getTime() - Date.now()) / 1000 : 3600, ease: 'linear' }}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Active paid plan */}
                {isPlanActive && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 border-2 border-green-500/20 dark:border-green-500/10 rounded-3xl p-6 mb-8 shadow-xl shadow-green-500/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {formatPlanName(sub?.plan_info?.name || sub?.plan_id || '')}
                                    </h3>
                                    <Chip label="Active" size="small" color="success" className="font-bold h-6" />
                                </div>
                            </div>
                            <Clock className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1.5 text-gray-600 dark:text-gray-400">
                                    <span>{sub?.days_remaining} days remaining · Expires <strong>{sub?.expires_at ? format(parseISO(sub.expires_at), 'dd MMM yyyy') : '---'}</strong></span>
                                </div>
                                
                                {(() => {
                                    const totalDays = sub?.plan_info ? (plans.find(p => p.slug === sub.plan_id)?.default_duration_days || 30) : 30
                                    const daysUsed = Math.max(0, totalDays - (sub?.days_remaining || 0))
                                    const progress = (daysUsed / totalDays) * 100
                                    const isCritical = (sub?.days_remaining || 0) <= 7

                                    return (
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-green-600 dark:text-green-400 min-w-[50px]">{sub?.days_remaining}d left</span>
                                            <div className="flex-1">
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={100 - progress} 
                                                    color={isCritical ? "error" : "success"}
                                                    sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.05)' }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400">{totalDays}d total</span>
                                        </div>
                                    )
                                })()}
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                <Chip icon={<Building2 className="w-3.5 h-3.5" />} label={`${sub?.plan_info?.hall_limit} Halls`} size="small" variant="outlined" className="bg-gray-50/50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700" />
                                {sub?.plan_info?.has_advanced_analytics && (
                                    <Chip icon={<Zap className="w-3.5 h-3.5 text-amber-500" />} label="Advanced Analytics" size="small" variant="outlined" className="bg-gray-50/50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700" />
                                )}
                                {sub?.plan_info?.features?.map(f => (
                                    <Chip key={f} label={f} size="small" variant="outlined" className="bg-gray-50/50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700" />
                                ))}
                            </div>

                            {!canUpgrade && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                                    You can switch plans after your current plan expires.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Expired */}
                {isExpired && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-5 mb-8">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <span className="font-bold text-red-900 dark:text-red-200">Subscription Expired</span>
                        </div>
                        <p className="text-sm text-red-700 dark:text-red-300">
                            Your halls are hidden from users. Subscribe to reactivate them instantly.
                        </p>
                    </motion.div>
                )}

                {/* ── HALL USAGE WIDGET ─────────────────────────────── */}
                {hallUsage && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Building2 className="w-5 h-5 text-purple-500" />
                                    <span className="font-bold text-gray-900 dark:text-white text-sm">Hall Slots</span>
                                    {hallUsage.plan_name && (
                                        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                                            {hallUsage.plan_name} Plan
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {hallUsage.hall_count} of {hallUsage.hall_limit} hall{hallUsage.hall_limit !== 1 ? 's' : ''} created
                                    {hallUsage.halls_remaining > 0
                                        ? ` · ${hallUsage.halls_remaining} slot${hallUsage.halls_remaining !== 1 ? 's' : ''} remaining`
                                        : ' · Limit reached'}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`text-2xl font-bold ${
                                    hallUsage.halls_remaining === 0 ? 'text-red-500' :
                                    hallUsage.halls_remaining === 1 ? 'text-amber-500' : 'text-green-500'
                                }`}>{hallUsage.hall_count}/{hallUsage.hall_limit}</span>
                            </div>
                        </div>
                        {(() => {
                            const usage = (hallUsage.hall_count / (hallUsage.hall_limit || 1)) * 100
                            const color = usage >= 100 ? 'error' : usage >= 75 ? 'warning' : 'success'
                            return (
                                <LinearProgress 
                                    variant="determinate" 
                                    value={Math.min(100, usage)} 
                                    color={color}
                                    sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(0,0,0,0.05)' }}
                                />
                            )
                        })()}
                        {hallUsage.halls_remaining === 0 && (
                            <p className="text-xs text-red-500 mt-2">
                                ⚠️ You've reached your hall limit. Upgrade your plan below to create more halls.
                            </p>
                        )}
                    </motion.div>
                )}

                {/* ── PLAN CARDS ─────────────────────────────────── */}
                <div className="mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {canUpgrade ? 'Choose a Plan' : 'Available Plans'}
                    </h2>
                    {!canUpgrade && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Plans are locked while your current subscription is active</p>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3 mb-8">
                    {plans.map(plan => {
                        const isCurrent = sub?.plan_id === plan.id && sub?.is_valid && !sub?.is_trial
                        const isLocked = !canUpgrade && !isCurrent

                        return (
                            <motion.div key={plan.id} whileHover={!isLocked ? { y: -4 } : {}}>
                                <div
                                    onClick={() => !isLocked && setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
                                    className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                                        isCurrent ? 'border-green-400 bg-green-50 dark:bg-green-900/20' :
                                        selectedPlan === plan.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' :
                                        isLocked ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed' :
                                        'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300'
                                    }`}>

                                    {isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-0.5 rounded-full font-semibold">
                                            Current
                                        </div>
                                    )}

                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getPlanColor(plan.slug)} flex items-center justify-center text-white mb-3`}>
                                        {getPlanIcon(plan.slug)}
                                    </div>

                                    <div className="font-bold text-gray-900 dark:text-white">
                                        {formatPlanName(plan.name)}
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        ₹{Number(plan.price).toLocaleString('en-IN')}
                                        <span className="text-sm text-gray-400 font-normal">/mo</span>
                                    </div>
                                    <div className="text-xs text-gray-400 mb-3">{plan.hall_limit || 1} hall{plan.hall_limit > 1 ? 's' : ''} published</div>

                                    <ul className="space-y-1.5">
                                        {plan.features.map(f => (
                                            <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                {/* Subscribe CTA */}
                <AnimatePresence>
                    {selectedPlan && canUpgrade && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-purple-200 dark:border-purple-800 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white">
                                        Subscribe to {formatPlanName(plans.find(p => p.id === selectedPlan)?.name || '')}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        ₹{plans.find(p => p.id === selectedPlan)?.price.toLocaleString('en-IN')}/month · {plans.find(p => p.id === selectedPlan)?.default_duration_days || 30} days
                                    </div>
                                </div>
                                <Shield className="w-8 h-8 text-purple-400" />
                            </div>
                            <button onClick={() => subscribe(selectedPlan!)}
                                disabled={!!payLoading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                {payLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                                ) : (
                                    <><ArrowRight className="w-4 h-4" /> Pay & Activate</>
                                )}
                            </button>
                            <p className="text-xs text-gray-400 text-center mt-2">Secured by Razorpay · Cancel anytime after expiry</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
