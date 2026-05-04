'use client'

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    Box, Drawer, AppBar, Toolbar, Typography, IconButton,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Divider, Avatar, Tooltip, useTheme, alpha, Chip, Badge,
} from '@mui/material'
import {
    Dashboard, Store, BookOnline, AttachMoney, Subscriptions,
    Menu as MenuIcon, ChevronLeft, Logout,
    Brightness4, Brightness7, Apartment,
} from '@mui/icons-material'
import { useThemeMode } from '@/components/berry/BerryThemeProvider'

const DRAWER_WIDTH = 260

const NAV_ITEMS = [
    { label: 'Dashboard', icon: <Dashboard />, href: '/partner' },
    { label: 'My Hall', icon: <Store />, href: '/partner/hall' },
    { label: 'Slot Manager', icon: <Apartment />, href: '/partner/slots' },
    { label: 'Bookings', icon: <BookOnline />, href: '/partner/bookings' },
    { label: 'Earnings', icon: <AttachMoney />, href: '/partner/earnings' },
    { label: 'Subscription', icon: <Subscriptions />, href: '/partner/subscription' },
]

export default function PartnerMuiLayout({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(true)
    const { mode, toggleTheme } = useThemeMode()
    const theme = useTheme()
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        router.push('/login')
    }

    const sidebarBg = mode === 'dark'
        ? 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)'
        : 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)'

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
                        boxShadow: '4px 0 24px rgba(49,46,129,0.25)',
                    },
                }}
            >
                {/* Logo */}
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2.5, minHeight: 64 }}>
                    <Box
                        sx={{
                            width: 40, height: 40, borderRadius: 2,
                            background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                    >
                        <Dashboard sx={{ color: '#fff', fontSize: 20 }} />
                    </Box>
                    {open && (
                        <Box sx={{ ml: 1.5 }}>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>
                                PartyHub
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                Partner Portal
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                <List sx={{ px: 1, py: 1, flexGrow: 1 }}>
                    {NAV_ITEMS.map((item) => {
                        const active = pathname === item.href || pathname?.startsWith(item.href + '/')
                        return (
                            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    component={Link}
                                    href={item.href}
                                    sx={{
                                        borderRadius: 2, minHeight: 44,
                                        px: open ? 1.5 : 1,
                                        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
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
                                            primaryTypographyProps={{
                                                fontSize: 14, fontWeight: active ? 700 : 500,
                                                color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            </ListItem>
                        )
                    })}
                </List>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Box sx={{ p: 1 }}>
                    <ListItemButton onClick={toggleTheme} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                        <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: open ? 36 : 'auto' }}>
                            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                        </ListItemIcon>
                        {open && <ListItemText primary={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} primaryTypographyProps={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }} />}
                    </ListItemButton>
                    <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                        <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: open ? 36 : 'auto' }}>
                            <Logout />
                        </ListItemIcon>
                        {open && <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }} />}
                    </ListItemButton>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                        <IconButton onClick={() => setOpen(!open)} size="small">
                            {open ? <ChevronLeft /> : <MenuIcon />}
                        </IconButton>
                        <Box sx={{ flexGrow: 1 }} />
                        <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                            <IconButton onClick={toggleTheme} size="small">
                                {mode === 'dark' ? <Brightness7 sx={{ color: '#c084fc' }} /> : <Brightness4 sx={{ color: '#7c3aed' }} />}
                            </IconButton>
                        </Tooltip>
                        <Chip
                            avatar={<Avatar sx={{ bgcolor: '#312e81', color: '#fff', fontSize: 12 }}>P</Avatar>}
                            label="Partner"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    </Toolbar>
                </AppBar>
                <Box
                    component="main"
                    sx={{ flexGrow: 1, p: 3, overflow: 'auto', background: theme.palette.background.default }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    )
}
