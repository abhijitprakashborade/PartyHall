'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Mail, Lock, User, Phone, Eye, EyeOff,
    ArrowRight, Building2, Star, TrendingUp, Shield, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { registerWithDjango, useAuth } from '@/hooks/useAuth'
import { setCachedUser } from '@/lib/authCache'

const BENEFITS = [
    { icon: Building2, title: 'List Your Hall', desc: 'Publish your party hall and get discovered by thousands of customers.' },
    { icon: TrendingUp, title: 'Grow Revenue', desc: 'Real-time booking management, analytics and payout tracking.' },
    { icon: Star, title: 'Build Reputation', desc: 'Collect verified reviews and boost your hall\'s visibility.' },
    { icon: Shield, title: 'Secure Platform', desc: 'Trusted payment system with partner-first support.' },
]

export default function PartnerRegisterPage() {
    const [formData, setFormData] = useState({
        fullName: '', email: '', phone: '', password: '',
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { setUser } = useAuth()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
        setLoading(true)
        try {
            const user = await registerWithDjango({
                email: formData.email,
                password: formData.password,
                full_name: formData.fullName,
                phone: formData.phone || undefined,
                role: 'partner',           // always partner
            })
            setUser(user)
            setCachedUser(user)
            toast.success('Partner account created! Welcome to PartyHub 🎉')
            router.push('/partner')
        } catch (err: any) {
            const data = err.response?.data
            const msg = data?.email?.[0] || data?.password?.[0] || data?.detail
                || data?.non_field_errors?.[0] || err.message || 'Registration failed.'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 flex">
            {/* LEFT — benefits */}
            <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 bg-gradient-to-br from-purple-900/40 to-pink-900/20 border-r border-white/5">
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                    <Link href="/" className="flex items-center gap-2.5 mb-12">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">
                            Party<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Hub</span>
                            <span className="ml-2 text-sm font-normal text-purple-300">for Partners</span>
                        </span>
                    </Link>

                    <h1 className="text-4xl font-extrabold text-white mb-3 leading-tight">
                        List Your Hall.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            Grow Your Business.
                        </span>
                    </h1>
                    <p className="text-gray-400 text-lg mb-10 max-w-md">
                        Join hundreds of venue owners who trust PartyHub to fill their calendars with quality bookings.
                    </p>

                    <div className="space-y-5">
                        {BENEFITS.map((b, i) => (
                            <motion.div
                                key={b.title}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className="flex items-start gap-4"
                            >
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                                    <b.icon className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">{b.title}</p>
                                    <p className="text-gray-400 text-xs mt-0.5">{b.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/10">
                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Free 1-hour trial — no credit card required
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* RIGHT — form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile logo */}
                    <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">
                            Party<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Hub</span>
                        </span>
                    </Link>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">Become a Partner</h2>
                        <p className="text-gray-400">Create your free partner account and start listing your venue today.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full name */}
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                name="fullName" type="text" required placeholder="Full name"
                                value={formData.fullName} onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/8 transition-all text-sm"
                            />
                        </div>

                        {/* Email */}
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                name="email" type="email" required placeholder="Business email"
                                value={formData.email} onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/8 transition-all text-sm"
                            />
                        </div>

                        {/* Phone */}
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                name="phone" type="tel" placeholder="Phone number (optional)"
                                value={formData.phone} onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/8 transition-all text-sm"
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                name="password" type={showPassword ? 'text' : 'password'} required
                                placeholder="Password (min 8 chars)"
                                value={formData.password} onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/8 transition-all text-sm"
                            />
                            <button type="button" onClick={() => setShowPassword(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-purple-900/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Create Partner Account <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-gray-500 text-sm mt-6">
                        Already have a partner account?{' '}
                        <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">Sign in</Link>
                    </p>
                    <p className="text-center text-gray-500 text-sm mt-2">
                        Looking to book a hall instead?{' '}
                        <Link href="/register" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">Customer sign up</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
