'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Menu, X, PartyPopper, LogOut, LayoutDashboard,
    CalendarDays, ChevronDown, Sun, Moon, User
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useThemeMode } from '@/components/berry/BerryThemeProvider'

export default function Navbar() {
    const [mounted, setMounted] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const { user, logout } = useAuth()
    const { mode, toggleTheme } = useThemeMode()

    useEffect(() => {
        setMounted(true)
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    if (!mounted) {
        // Return a simplified navbar skeleton or empty height to prevent layout shift if possible
        // but often returning null or a minimal version is safest for hydration.
        return <div className="h-16 lg:h-20" /> 
    }

    const handleLogout = async () => {
        setIsProfileOpen(false)
        setIsMenuOpen(false)
        await logout()
        router.push('/')
    }

    const getDashboardLink = () => {
        if (!user) return '/'
        if (user.role === 'admin') return '/admin'
        if (user.role === 'partner') return '/partner'
        return '/account/orders'
    }

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/halls', label: 'Party Halls' },
        { href: '/about', label: 'About' },
    ]

    const isHomePage = pathname === '/'
    const isDark = isHomePage && !scrolled

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled || !isHomePage
            ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-lg shadow-purple-500/5 border-b border-purple-100/20 dark:border-purple-900/30'
            : 'bg-transparent'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 lg:h-20">

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="relative">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/30">
                                <PartyPopper className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                        </div>
                        <span className={`text-xl font-bold font-heading tracking-tight transition-colors ${isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                            Party<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Hub</span>
                        </span>
                    </Link>

                    {/* Desktop Nav Links */}
                    <div className="hidden lg:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${pathname === link.href
                                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                    : isDark
                                        ? 'text-white/80 hover:text-white hover:bg-white/10'
                                        : 'text-gray-600 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                                    }`}>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Auth + Theme Toggle */}
                    <div className="hidden lg:flex items-center gap-3">

                        {/* ── Dark / Light Toggle Button ───────────────────── */}
                        <button
                            onClick={toggleTheme}
                            id="theme-toggle"
                            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            className={`p-2 rounded-xl transition-all duration-300 ${isDark
                                ? 'text-white/80 hover:text-white hover:bg-white/10'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300'
                                }`}
                        >
                            {mode === 'dark'
                                ? <Sun className="w-5 h-5" />
                                : <Moon className="w-5 h-5" />
                            }
                        </button>

                        {user ? (
                            <div className="relative">
                                <button onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-purple-50 dark:hover:bg-purple-900/30 text-gray-700 dark:text-gray-200'}`}>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                                        {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium max-w-24 truncate">{user.full_name || user.email}</span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isProfileOpen && (
                                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-purple-500/10 border border-purple-100 dark:border-purple-800 py-2 z-50">
                                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.email}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block capitalize ${user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : user.role === 'partner' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                            <Link href={getDashboardLink()} onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                                                <LayoutDashboard className="w-4 h-4" /> Dashboard
                                            </Link>
                                            <Link href="/account/profile" onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                                                <User className="w-4 h-4" /> My Profile
                                            </Link>
                                            {user.role === 'customer' && (
                                                <Link href="/user/bookings" onClick={() => setIsProfileOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                                                    <CalendarDays className="w-4 h-4" /> My Bookings
                                                </Link>
                                            )}
                                            <button onClick={handleLogout}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full">
                                                <LogOut className="w-4 h-4" /> Sign Out
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <>
                                <Link href="/login"
                                    className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30'}`}>
                                    Login
                                </Link>
                                <Link href="/halls"
                                    className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-300">
                                    Book Now
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile: Theme Toggle + Menu button */}
                    <div className="lg:hidden flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            id="theme-toggle-mobile"
                            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            className={`p-2 rounded-xl transition-colors ${isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                            {mode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                        className="lg:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-xl">
                        <div className="px-4 py-4 space-y-1">
                            {navLinks.map((link) => (
                                <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}
                                    className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === link.href ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300'}`}>
                                    {link.label}
                                </Link>
                            ))}
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                                {user ? (
                                    <>
                                        <div className="px-4 py-2">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                        </div>
                                        <Link href={getDashboardLink()} onClick={() => setIsMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl">
                                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                                        </Link>
                                        {user.role === 'customer' && (
                                            <Link href="/account/orders" onClick={() => setIsMenuOpen(false)}
                                                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl">
                                                <CalendarDays className="w-4 h-4" /> My Bookings
                                            </Link>
                                        )}
                                        <button onClick={handleLogout}
                                            className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 w-full rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <LogOut className="w-4 h-4" /> Sign Out
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/login" onClick={() => setIsMenuOpen(false)}
                                            className="block px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700">
                                            Login
                                        </Link>
                                        <Link href="/halls" onClick={() => setIsMenuOpen(false)}
                                            className="block px-4 py-3 text-center text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl">
                                            Book Now
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
