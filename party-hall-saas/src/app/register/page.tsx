'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Phone, PartyPopper, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { registerWithDjango, useAuth } from '@/hooks/useAuth'
import { setCachedUser } from '@/lib/authCache'

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        fullName: '', email: '', phone: '', password: '', role: 'customer'
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { setUser } = useAuth()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }
        setLoading(true)
        try {
            const user = await registerWithDjango({
                email: formData.email,
                password: formData.password,
                full_name: formData.fullName,
                phone: formData.phone || undefined,
                role: formData.role,
            })

            // ✅ Update AuthContext + cache immediately — no refresh needed
            setUser(user)
            setCachedUser(user)

            toast.success('Account created! Welcome to PartyHub 🎉')
            if (user.role === 'admin') router.push('/admin')
            else if (user.role === 'partner') router.push('/partner')
            else router.push('/')
        } catch (err: any) {
            const data = err.response?.data
            // DRF returns field errors as objects
            const msg = data?.email?.[0]
                || data?.password?.[0]
                || data?.detail
                || data?.non_field_errors?.[0]
                || err.message
                || 'Registration failed.'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-party-gradient flex items-center justify-center p-4 sm:p-6">
            {/* Background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 right-1/4 w-48 sm:w-72 h-48 sm:h-72 bg-pink-600/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-48 sm:w-72 h-48 sm:h-72 bg-purple-600/20 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="relative z-10 w-full max-w-sm sm:max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-5 sm:mb-7">
                    <Link href="/" className="inline-flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <PartyPopper className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl sm:text-2xl font-bold text-white">
                            Party<span className="text-pink-300">Hub</span>
                        </span>
                    </Link>
                    <p className="text-white/60 mt-1.5 text-xs sm:text-sm">Create your free account</p>
                </div>

                <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-5 text-center">Join PartyHub</h1>

                    {/* Role selector */}
                    <div className="grid grid-cols-2 gap-2 mb-4 sm:mb-5">
                        {[
                            { value: 'customer', label: '🎉 Customer', desc: 'Book celebrations' },
                            { value: 'partner', label: '🏢 Hall Owner', desc: 'List your hall' },
                        ].map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => setFormData((p) => ({ ...p, role: r.value }))}
                                className={`p-2.5 sm:p-3 rounded-xl border-2 text-center transition-all ${formData.role === r.value
                                        ? 'border-purple-400 bg-purple-500/20 text-white'
                                        : 'border-white/20 text-white/60 hover:border-white/40'
                                    }`}
                            >
                                <div className="font-semibold text-xs sm:text-sm">{r.label}</div>
                                <div className="text-xs opacity-70 mt-0.5 hidden sm:block">{r.desc}</div>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleRegister} className="space-y-3">
                        {[
                            { name: 'fullName', type: 'text', icon: User, placeholder: 'Full Name', autocomplete: 'name', required: true },
                            { name: 'email', type: 'email', icon: Mail, placeholder: 'Email Address', autocomplete: 'email', required: true },
                            { name: 'phone', type: 'tel', icon: Phone, placeholder: 'Phone (optional)', autocomplete: 'tel', required: false },
                        ].map((field) => (
                            <div key={field.name} className="relative">
                                <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                <input
                                    name={field.name}
                                    type={field.type}
                                    required={field.required}
                                    value={(formData as any)[field.name]}
                                    onChange={handleChange}
                                    autoComplete={field.autocomplete}
                                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all"
                                    placeholder={field.placeholder}
                                />
                            </div>
                        ))}

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                            <input
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="new-password"
                                className="w-full pl-10 pr-11 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all"
                                placeholder="Password (min 8 characters)"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
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
                                    Creating Account…
                                </>
                            ) : (
                                <>Create Account <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-white/50 text-xs sm:text-sm mt-4 sm:mt-5">
                        Already have an account?{' '}
                        <Link href="/login" className="text-purple-300 hover:text-purple-200 font-medium">Sign in</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
