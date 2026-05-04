'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    Box, Drawer, AppBar, Toolbar, IconButton, Typography,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Divider, Tooltip, Avatar, Chip, alpha, useTheme,
} from '@mui/material'
import {
    Dashboard, Store, Star, Assignment,
    Assessment, People, Logout, Menu as MenuIcon, ChevronLeft,
    Brightness4, Brightness7, AdminPanelSettings, CardMembership, AccountCircle,
} from '@mui/icons-material'
import { useThemeMode } from '@/components/berry/BerryThemeProvider'
import { toast } from 'sonner'
import api from '@/lib/api'

const DRAWER_WIDTH = 260

const NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: <Dashboard />, exact: true },
    { href: '/admin/partners', label: 'Partners', icon: <Store /> },
    { href: '/admin/subscriptions', label: 'Subscriptions', icon: <CardMembership /> },
    { href: '/admin/plans', label: 'Manage Plans', icon: <Assignment /> },
    { href: '/admin/reviews', label: 'Reviews', icon: <Star /> },
    { href: '/admin/users', label: 'Users', icon: <People /> },
    { href: '/admin/logs', label: 'Audit Logs', icon: <Assignment /> },
    { href: '/account/profile', label: 'My Profile', icon: <AccountCircle /> },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(true)
    const [adminName, setAdminName] = useState('')
    const { mode, toggleTheme } = useThemeMode()
    const theme = useTheme()
    const pathname = usePathname()
    const router = useRouter()

    // Auth guard: must be admin
    useEffect(() => {
        // Re-validate on navigation (Issue #6 Fix)
        api.get('/auth/me/', { headers: { 'Cache-Control': 'no-store' } })
            .then(res => {
                if (res.data.role !== 'admin') { router.push('/'); return }
                setAdminName(res.data.full_name || res.data.email || 'Admin')
            })
            .catch(() => router.push('/login?redirect=/admin'))
    }, [router, pathname]) // Added pathname to deps

    const handleLogout = () => {
        api.post('/auth/logout/', {}).catch(() => {})
        document.cookie = 'ph_access=; path=/; max-age=0; SameSite=Lax'
        document.cookie = 'ph_refresh=; path=/; max-age=0; SameSite=Lax'
        toast.success('Logged out successfully')
        router.push('/login')
    }

    const sidebarBg = mode === 'dark'
        ? 'linear-gradient(180deg, #1a0a2e 0%, #160d35 100%)'
        : 'linear-gradient(180deg, #4c1d95 0%, #7c3aed 100%)'

    const isActive = (href: string, exact = false) =>
        exact ? pathname === href : pathname.startsWith(href)

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: open ? DRAWER_WIDTH : 72,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: open ? DRAWER_WIDTH : 72,
                        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
                        overflowX: 'hidden',
                        background: sidebarBg,
                        border: 'none',
                        boxShadow: '4px 0 24px rgba(124,58,237,0.15)',
                    },
                }}
            >
                {/* Logo */}
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2.5, minHeight: 64 }}>
                    <Box sx={{
                        width: 40, height: 40, borderRadius: 2,
                        background: 'linear-gradient(135deg, #a78bfa, #f9a8d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <AdminPanelSettings sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    {open && (
                        <Box sx={{ ml: 1.5 }}>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>PartyHub</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Admin Panel</Typography>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                {/* Nav */}
                <List sx={{ px: 1, py: 1, flexGrow: 1 }}>
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item.href, item.exact)
                        return (
                            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    component={Link}
                                    href={item.href}
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
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#f9a8d4', flexShrink: 0 }} />
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
            </Drawer>

            {/* Main content */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Top AppBar */}
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        background: alpha(theme.palette.background.paper, 0.8),
                        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <Toolbar sx={{ gap: 1 }}>
                        <IconButton onClick={() => setOpen(!open)} size="small">
                            {open ? <ChevronLeft /> : <MenuIcon />}
                        </IconButton>
                        <Box sx={{ flexGrow: 1 }} />
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' }, cursor: 'pointer' }}>
                                ← View Site
                            </Typography>
                        </Link>
                        <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                            <IconButton onClick={toggleTheme} size="small">
                                {mode === 'dark' ? <Brightness7 sx={{ color: '#f9a8d4' }} /> : <Brightness4 sx={{ color: '#7c3aed' }} />}
                            </IconButton>
                        </Tooltip>
                        <Chip
                            avatar={<Avatar sx={{ bgcolor: '#7c3aed', color: '#fff', fontSize: 12 }}>{adminName?.charAt(0) || 'A'}</Avatar>}
                            label={adminName || 'Admin'}
                            size="small"
                            sx={{ fontWeight: 600, maxWidth: 160 }}
                        />
                    </Toolbar>
                </AppBar>

                {/* Page content */}
                <Box
                    key={pathname}
                    component="main"
                    sx={{ flexGrow: 1, p: 3, overflow: 'auto', background: theme.palette.background.default }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    )
}
