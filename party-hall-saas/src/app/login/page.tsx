'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, PartyPopper, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { loginWithDjango, useAuth } from '@/hooks/useAuth'
import { setCachedUser } from '@/lib/authCache'

function LoginContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { setUser } = useAuth()
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect') || null
    const restore = searchParams.get('restore')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const user = await loginWithDjango(email, password)

            // ✅ Update AuthContext + cache immediately — no refresh needed
            setUser(user)
            setCachedUser(user)

            toast.success(`Welcome back, ${user.full_name?.split(' ')[0] || 'there'}! 🎉`)

            // Role-based redirect — preserve restore flag so hall page can restore draft
            if (redirect) {
                const destination = restore ? `${redirect}?restore=${restore}` : redirect
                router.push(destination)
                router.refresh()
            } else if (user.role === 'admin') {
                router.push('/admin')
            } else if (user.role === 'partner') {
                router.push('/partner')
            } else {
                router.push('/')
            }
        } catch (err: any) {
            const msg = err.response?.data?.detail
                || err.response?.data?.non_field_errors?.[0]
                || err.message
                || 'Login failed. Check your credentials.'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-party-gradient flex items-center justify-center p-4 sm:p-6">
            {/* Background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-48 sm:w-72 h-48 sm:h-72 bg-purple-600/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-72 h-48 sm:h-72 bg-pink-600/20 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45 }}
                className="relative z-10 w-full max-w-sm sm:max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-6 sm:mb-8">
                    <Link href="/" className="inline-flex items-center gap-2.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <span className="text-xl sm:text-2xl font-bold text-white">
                            Party<span className="text-pink-300">Hub</span>
                        </span>
                    </Link>
                    <p className="text-white/60 mt-2 text-sm">Sign in to your account</p>
                </div>

                <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-5 sm:mb-6 text-center">Welcome Back</h1>

                    <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                        <div>
                            <label className="text-white/70 text-xs sm:text-sm font-medium mb-1.5 block">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-white/70 text-xs sm:text-sm font-medium mb-1.5 block">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="w-full pl-10 pr-11 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 text-sm sm:text-base mt-1"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" opacity="0.3" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    Signing in…
                                </>
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>



                    <p className="text-center text-white/50 text-xs sm:text-sm mt-5 sm:mt-6">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-purple-300 hover:text-purple-200 font-medium">
                            Sign up free
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-party-gradient flex items-center justify-center"><div className="text-white text-xl">Loading…</div></div>}>
            <LoginContent />
        </Suspense>
    )
}
