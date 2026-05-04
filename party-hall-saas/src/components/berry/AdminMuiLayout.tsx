'use client'

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    Box, Drawer, AppBar, Toolbar, Typography, IconButton, List,
    ListItem, ListItemButton, ListItemIcon, ListItemText, Divider,
    Avatar, Tooltip, useTheme, alpha, Chip,
} from '@mui/material'
import {
    Dashboard, People, Store, BookOnline, Star, Receipt,
    Assessment, Assignment, Menu as MenuIcon, ChevronLeft,
    Logout, Brightness4, Brightness7, AdminPanelSettings,
} from '@mui/icons-material'
import { useThemeMode } from '@/components/berry/BerryThemeProvider'

const DRAWER_WIDTH = 260

const NAV_ITEMS = [
    { label: 'Dashboard', icon: <Dashboard />, href: '/admin' },
    { label: 'Halls & Partners', icon: <Store />, href: '/admin/partners' },
    { label: 'Bookings', icon: <BookOnline />, href: '/admin/bookings' },
    { label: 'Users', icon: <People />, href: '/admin/users' },
    { label: 'Reviews', icon: <Star />, href: '/admin/reviews' },
    { label: 'Packages', icon: <Assessment />, href: '/admin/packages' },
    { label: 'Refunds', icon: <Receipt />, href: '/admin/refunds' },
    { label: 'Audit Logs', icon: <Assignment />, href: '/admin/logs' },
]

export default function AdminMuiLayout({ children }: { children: React.ReactNode }) {
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
        ? 'linear-gradient(180deg, #1a0a2e 0%, #160d35 100%)'
        : 'linear-gradient(180deg, #4c1d95 0%, #7c3aed 100%)'

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Drawer
                variant="permanent"
                open={open}
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
                    <Box
                        sx={{
                            width: 40, height: 40, borderRadius: 2,
                            background: 'linear-gradient(135deg, #a78bfa, #f9a8d4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <AdminPanelSettings sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    {open && (
                        <Box sx={{ ml: 1.5 }}>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>
                                PartyHub
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                Admin Panel
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                {/* Nav Items */}
                <List sx={{ px: 1, py: 1, flexGrow: 1 }}>
                    {NAV_ITEMS.map((item) => {
                        const active = pathname === item.href || pathname?.startsWith(item.href + '/')
                        return (
                            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    component={Link}
                                    href={item.href}
                                    sx={{
                                        borderRadius: 2,
                                        minHeight: 44,
                                        px: open ? 1.5 : 1,
                                        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                                        backdropFilter: active ? 'blur(10px)' : 'none',
                                        '&:hover': { background: 'rgba(255,255,255,0.1)' },
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                                            minWidth: open ? 36 : 'auto',
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    {open && (
                                        <ListItemText
                                            primary={item.label}
                                            primaryTypographyProps={{
                                                fontSize: 14,
                                                fontWeight: active ? 700 : 500,
                                                color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                                            }}
                                        />
                                    )}
                                    {open && active && (
                                        <Box
                                            sx={{
                                                width: 6, height: 6, borderRadius: '50%',
                                                background: '#f9a8d4', flexShrink: 0,
                                            }}
                                        />
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
                        <ListItemButton
                            onClick={toggleTheme}
                            sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                        >
                            <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: open ? 36 : 'auto' }}>
                                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                            </ListItemIcon>
                            {open && <ListItemText primary={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} primaryTypographyProps={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }} />}
                        </ListItemButton>
                    </Tooltip>
                    <Tooltip title="Logout" placement="right">
                        <ListItemButton
                            onClick={handleLogout}
                            sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                        >
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
                        background: theme.palette.background.paper,
                        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <Toolbar sx={{ gap: 1 }}>
                        <IconButton onClick={() => setOpen(!open)} size="small">
                            {open ? <ChevronLeft /> : <MenuIcon />}
                        </IconButton>

                        <Box sx={{ flexGrow: 1 }} />

                        {/* Theme toggle in header too */}
                        <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                            <IconButton onClick={toggleTheme} size="small">
                                {mode === 'dark' ? <Brightness7 sx={{ color: '#f9a8d4' }} /> : <Brightness4 sx={{ color: '#7c3aed' }} />}
                            </IconButton>
                        </Tooltip>

                        <Chip
                            avatar={<Avatar sx={{ bgcolor: '#7c3aed', color: '#fff', fontSize: 12 }}>A</Avatar>}
                            label="Admin"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    </Toolbar>
                </AppBar>

                {/* Page content */}
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        overflow: 'auto',
                        background: theme.palette.background.default,
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    )
}
