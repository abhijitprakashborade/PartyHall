'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    Box, Drawer, AppBar, Toolbar, IconButton, Typography,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Divider, Tooltip, Avatar, Chip, alpha, useTheme,
    SwipeableDrawer,
} from '@mui/material'
import {
    Dashboard, Store, BookOnline,
    AttachMoney, Subscriptions, Logout,
    Menu as MenuIcon, ChevronLeft,
    Brightness4, Brightness7, PartyMode, QrCodeScanner, EventSeat, AccountCircle,
    Insights, Assessment, PriceChange,
} from '@mui/icons-material'
import { useThemeMode } from '@/components/berry/BerryThemeProvider'
import { toast } from 'sonner'
import api from '@/lib/api'

const DRAWER_WIDTH = 260

const NAV_ITEMS = [
    { href: '/partner', label: 'Dashboard', icon: <Dashboard />, exact: true },
    { href: '/partner/hall', label: 'My Hall', icon: <Store /> },
    { href: '/partner/slots', label: 'Slot Manager', icon: <EventSeat /> },
    { href: '/partner/packages', label: 'Booking Packages', icon: <Assessment /> },
    { href: '/partner/pricing', label: 'Pricing Settings', icon: <PriceChange /> },
    { href: '/partner/bookings', label: 'Bookings', icon: <BookOnline /> },
    { href: '/partner/checkin', label: 'QR Check-In', icon: <QrCodeScanner /> },
    { href: '/partner/analytics', label: 'Analytics', icon: <Insights />, featureGate: 'has_advanced_analytics' },
    { href: '/partner/earnings', label: 'Earnings', icon: <AttachMoney /> },
    { href: '/partner/subscription', label: 'Subscription', icon: <Subscriptions /> },
    { href: '/account/profile', label: 'My Profile', icon: <AccountCircle /> },
]

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(true)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [partnerName, setPartnerName] = useState('')
    const { mode, toggleTheme } = useThemeMode()
    const theme = useTheme()
    const pathname = usePathname()
    const router = useRouter()

    const [subscription, setSubscription] = useState<any>(null)

    useEffect(() => {
        // Fetch User and Re-validate on navigation (Issue #6 Fix)
        api.get('/auth/me/', { headers: { 'Cache-Control': 'no-store' } })
            .then((res) => {
                if (res.data.role !== 'partner' && res.data.role !== 'admin') { router.push('/'); return }
                setPartnerName(res.data.full_name)
            })
            .catch(() => { router.push('/login') })

        // Fetch Subscription for gating
        api.get('/subscriptions/', { headers: { 'Cache-Control': 'no-store' } })
            .then(res => setSubscription(res.data))
            .catch(() => { })
    }, [router, pathname]) // Added pathname to deps

    const handleLogout = () => {
        api.post('/auth/logout/', {}).catch(() => {})
        document.cookie = 'ph_access=; path=/; max-age=0; SameSite=Lax'
        document.cookie = 'ph_refresh=; path=/; max-age=0; SameSite=Lax'
        toast.success('Logged out')
        router.push('/login')
    }

    const sidebarBg = mode === 'dark'
        ? 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)'
        : 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)'

    const isActive = (href: string, exact = false) =>
        exact ? pathname === href : pathname.startsWith(href)

    const SidebarContent = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', background: sidebarBg }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2.5, minHeight: 64 }}>
                <Box sx={{
                    width: 40, height: 40, borderRadius: 2,
                    background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <PartyMode sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                {open && (
                    <Box sx={{ ml: 1.5 }}>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>PartyHub</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Partner Portal</Typography>
                    </Box>
                )}
            </Box>

            {/* Partner Avatar */}
            {open && partnerName && (
                <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                            {partnerName?.charAt(0) || 'P'}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {partnerName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Partner</Typography>
                        </Box>
                    </Box>
                </Box>
            )}

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Nav */}
            <List sx={{ px: 1, py: 1, flexGrow: 1 }}>
                {NAV_ITEMS.map((item) => {
                    // Feature Gating
                    if (item.featureGate && !subscription?.plan_info?.[item.featureGate as keyof typeof subscription.plan_info]) {
                        return null
                    }

                    const active = isActive(item.href, item.exact)
                    return (
                        <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                component={Link}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                sx={{
                                    borderRadius: 2, minHeight: 44, px: open ? 1.5 : 1,
                                    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                                    backdropFilter: active ? 'blur(10px)' : 'none',
                                    '&:hover': { background: 'rgba(255,255,255,0.1)' },
                                    transition: 'all 0.2s',
                                }}
                            >
                                <ListItemIcon sx={{ color: active ? '#fff' : 'rgba(255,255,255,0.6)', minWidth: open ? 36 : 'auto' }}>
                                    {item.icon}
                                </ListItemIcon>
                                {open && (
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.7)' }}
                                    />
                                )}
                                {open && active && (
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#c084fc', flexShrink: 0 }} />
                                )}
                            </ListItemButton>
                        </ListItem>
                    )
                })}
            </List>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Bottom actions */}
            <Box sx={{ p: 1 }}>
                <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} placement="right">
                    <ListItemButton onClick={toggleTheme} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                        <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: open ? 36 : 'auto' }}>
                            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                        </ListItemIcon>
                        {open && <ListItemText primary={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} primaryTypographyProps={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }} />}
                    </ListItemButton>
                </Tooltip>
                <Tooltip title="Logout" placement="right">
                    <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                        <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: open ? 36 : 'auto' }}>
                            <Logout />
                        </ListItemIcon>
                        {open && <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }} />}
                    </ListItemButton>
                </Tooltip>
            </Box>
        </Box>
    )

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Desktop Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', lg: 'block' },
                    width: open ? DRAWER_WIDTH : 72,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: open ? DRAWER_WIDTH : 72,
                        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
                        overflowX: 'hidden',
                        border: 'none',
                        boxShadow: '4px 0 24px rgba(49,46,129,0.25)',
                        background: sidebarBg,
                    },
                }}
            >
                <SidebarContent />
            </Drawer>

            {/* Mobile Drawer */}
            <SwipeableDrawer
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                onOpen={() => setMobileOpen(true)}
                sx={{
                    display: { xs: 'block', lg: 'none' },
                    '& .MuiDrawer-paper': { width: DRAWER_WIDTH, background: sidebarBg, border: 'none' },
                }}
            >
                <SidebarContent />
            </SwipeableDrawer>

            {/* Main content */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Top AppBar */}
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        background: alpha(theme.palette.background.paper, 0.8),
                        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    <Toolbar sx={{ gap: 1 }}>
                        {/* Mobile menu button */}
                        <IconButton
                            onClick={() => setMobileOpen(true)}
                            size="small"
                            sx={{ display: { xs: 'flex', lg: 'none' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        {/* Desktop collapse button */}
                        <IconButton
                            onClick={() => setOpen(!open)}
                            size="small"
                            sx={{ display: { xs: 'none', lg: 'flex' } }}
                        >
                            {open ? <ChevronLeft /> : <MenuIcon />}
                        </IconButton>
                        <Box sx={{ flexGrow: 1 }} />
                        <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                            <IconButton onClick={toggleTheme} size="small">
                                {mode === 'dark' ? <Brightness7 sx={{ color: '#c084fc' }} /> : <Brightness4 sx={{ color: '#7c3aed' }} />}
                            </IconButton>
                        </Tooltip>
                        <Chip
                            avatar={<Avatar sx={{ bgcolor: '#312e81', color: '#fff', fontSize: 12 }}>{partnerName?.charAt(0) || 'P'}</Avatar>}
                            label={partnerName || 'Partner'}
                            size="small"
                            sx={{ fontWeight: 600, maxWidth: { xs: 80, sm: 130 } }}
                        />
                    </Toolbar>
                </AppBar>

                {/* Page content */}
                <Box
                    key={pathname}
                    component="main"
                    sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, overflowY: 'auto', overflowX: 'hidden', background: theme.palette.background.default }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    )
}
