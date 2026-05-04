'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User, ShoppingBag, Heart, LogOut, ChevronRight, PartyPopper } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
    { href: '/account/profile', label: 'My Profile', icon: User, desc: 'Personal info & password' },
    { href: '/account/orders', label: 'My Bookings', icon: ShoppingBag, desc: 'View booking history' },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, logout, loading } = useAuth()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return
        if (!loading && !user) {
            router.push('/login?redirect=' + pathname)
        }
    }, [mounted, loading, user, router, pathname])

    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!user) return null

    const initials = user?.full_name
        ? user.full_name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user?.email?.charAt(0).toUpperCase() || 'U'

    const handleLogout = async () => {
        await logout()
        router.push('/')
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Top Navbar */}
            <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <PartyPopper className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                            Party<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Hub</span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                            {user.full_name || user.email}
                        </span>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                            {initials}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

                    {/* Sidebar */}
                    <aside className="space-y-2">
                        {/* User card */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                                    {initials}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                        {user.full_name || 'No Name Set'}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block capitalize ${
                                        user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                                        user.role === 'partner' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                    }`}>
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Nav links */}
                        <nav className="space-y-1">
                            {NAV_ITEMS.map(({ href, label, icon: Icon, desc }) => {
                                const active = pathname === href
                                return (
                                    <Link key={href} href={href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                                            active
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                                                : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:border-purple-200 dark:hover:border-purple-800 hover:text-purple-700 dark:hover:text-purple-300'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{label}</p>
                                            <p className={`text-xs mt-0.5 truncate ${active ? 'text-purple-200' : 'text-gray-400'}`}>{desc}</p>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${active ? 'text-purple-200' : 'text-gray-300'}`} />
                                    </Link>
                                )
                            })}

                            {/* Role-based dashboard link */}
                            {(user.role === 'admin' || user.role === 'partner') && (
                                <Link
                                    href={user.role === 'admin' ? '/admin' : '/partner'}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:border-purple-200 dark:hover:border-purple-800 hover:text-purple-700 dark:hover:text-purple-300 transition-all group"
                                >
                                    <ChevronRight className="w-4 h-4 flex-shrink-0 rotate-180" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold">
                                            {user.role === 'admin' ? 'Admin Dashboard' : 'Partner Dashboard'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">Back to management</p>
                                    </div>
                                </Link>
                            )}

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-red-500 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-left"
                            >
                                <LogOut className="w-4 h-4 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold">Sign Out</p>
                                    <p className="text-xs text-gray-400 mt-0.5">End your session</p>
                                </div>
                            </button>
                        </nav>
                    </aside>

                    {/* Main content */}
                    <main className="min-w-0">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}
