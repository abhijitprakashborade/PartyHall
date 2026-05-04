'use client'

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react'
import {
    ThemeProvider as MuiThemeProvider,
    createTheme,
    CssBaseline,
    alpha,
} from '@mui/material'

// ── Berry MUI Color Palette ─────────────────────────
const BERRY_PRIMARY = '#7c3aed'   // violet-700
const BERRY_SECONDARY = '#ec4899' // pink-500
const BERRY_SUCCESS = '#22c55e'
const BERRY_WARNING = '#f59e0b'
const BERRY_ERROR = '#ef4444'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
    mode: ThemeMode
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'light',
    toggleTheme: () => { },
})

export const useThemeMode = () => useContext(ThemeContext)

export function BerryThemeProvider({ children }: { children: React.ReactNode }) {
    // Always start with 'light' to match SSR — then correct on the client
    const [mode, setMode] = useState<ThemeMode>('light')

    // ── Restore saved preference on mount ──────────────────
    // NOTE: We cannot read localStorage during SSR. Starting with 'light' ensures
    // the server and initial client renders match, preventing hydration warnings.
    useEffect(() => {
        const saved = localStorage.getItem('theme-mode') as ThemeMode | null
        if (saved === 'dark' || saved === 'light') {
            setMode(saved)
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setMode('dark')
        }
    }, [])

    // ── Propagate mode to <html> element ───────────────────
    // This is the KEY FIX: CSS `dark:` classes and `[data-theme="dark"]`
    // selectors only work when the html element has the right attribute/class.
    useEffect(() => {
        const root = document.documentElement
        if (mode === 'dark') {
            root.classList.add('dark')
            root.setAttribute('data-theme', 'dark')
        } else {
            root.classList.remove('dark')
            root.setAttribute('data-theme', 'light')
        }
    }, [mode])

    const toggleTheme = () => {
        setMode((prev) => {
            const next = prev === 'light' ? 'dark' : 'light'
            localStorage.setItem('theme-mode', next)
            return next
        })
    }

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: { main: BERRY_PRIMARY, light: '#a78bfa', dark: '#4c1d95' },
                    secondary: { main: BERRY_SECONDARY, light: '#f9a8d4', dark: '#9d174d' },
                    success: { main: BERRY_SUCCESS },
                    warning: { main: BERRY_WARNING },
                    error: { main: BERRY_ERROR },
                    background: {
                        default: mode === 'dark' ? '#0f0f1a' : '#f8f7ff',
                        paper: mode === 'dark' ? '#1a1a2e' : '#ffffff',
                    },
                    text: {
                        primary: mode === 'dark' ? '#f1f0ff' : '#1e1b4b',
                        secondary: mode === 'dark' ? '#a78bfa' : '#6d28d9',
                    },
                },
                typography: {
                    fontFamily: '"Inter", "Roboto", sans-serif',
                    h1: { fontWeight: 800 },
                    h2: { fontWeight: 700 },
                    h3: { fontWeight: 700 },
                    h4: { fontWeight: 600 },
                    h5: { fontWeight: 600 },
                    h6: { fontWeight: 600 },
                },
                shape: { borderRadius: 12 },
                components: {
                    MuiCard: {
                        defaultProps: { elevation: 0 },
                        styleOverrides: {
                            root: ({ theme }) => ({
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                                },
                            }),
                        },
                    },
                    MuiButton: {
                        styleOverrides: {
                            root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
                            contained: ({ theme }) => ({
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                                },
                            }),
                        },
                    },
                    MuiPaper: {
                        defaultProps: { elevation: 0 },
                        styleOverrides: {
                            root: ({ theme }) => ({
                                backgroundImage: 'none',
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                            }),
                        },
                    },
                    MuiChip: {
                        styleOverrides: {
                            root: { fontWeight: 600 },
                        },
                    },
                    MuiTableCell: {
                        styleOverrides: {
                            head: { fontWeight: 700 },
                        },
                    },
                },
            }),
        [mode]
    )

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    )
}
