'use client'

/**
 * useAuth hook — reads JWT tokens from localStorage and provides
 * user info + logout. Works with the Django JWT backend.
 */

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { getCachedUser, setCachedUser, clearCachedUser } from '@/lib/authCache'

interface User {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'partner' | 'customer'
    phone?: string
    created_at?: string
}

interface AuthContextType {
    user: User | null
    loading: boolean
    logout: () => void
    setUser: (u: User | null) => void
    refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: () => { },
    setUser: () => { },
    refetchUser: async () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const refetchUser = async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
        if (!token) { setUser(null); return }
        // Use cache first — avoids API call on every tab focus
        const cached = getCachedUser()
        if (cached) { setUser(cached); return }
        try {
            const res = await api.get('/auth/me/')
            setCachedUser(res.data)
            setUser(res.data)
        } catch {
            clearCachedUser()
            setUser(null)
        }
    }

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
        if (!token) { setLoading(false); return }

        // Check cache before making API call
        const cached = getCachedUser()
        if (cached) {
            setUser(cached)
            setLoading(false)
        } else {
            api.get('/auth/me/')
                .then((res) => { setCachedUser(res.data); setUser(res.data) })
                .catch(() => {
                    clearCachedUser()
                    localStorage.removeItem('access_token')
                    localStorage.removeItem('refresh_token')
                })
                .finally(() => setLoading(false))
        }

        // Re-fetch user whenever the tab regains focus — cache prevents excess API calls
        const handleFocus = () => refetchUser()
        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [])

    const logout = () => {
        const refresh = localStorage.getItem('refresh_token')
        if (refresh) api.post('/auth/logout/', { refresh }).catch(() => { })
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        // Clear middleware cookie and auth cache
        document.cookie = 'ph_access=; path=/; max-age=0; SameSite=Lax'
        clearCachedUser()
        setUser(null)
        router.push('/login')
    }

    return (
        <AuthContext.Provider value={{ user, loading, logout, setUser, refetchUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)

/**
 * loginWithDjango — call Django JWT /auth/login/, store tokens, return user
 */
export async function loginWithDjango(email: string, password: string): Promise<User> {
    const res = await api.post('/auth/login/', { email, password })
    const { access, refresh, user } = res.data
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    // Also set cookie for middleware edge detection (30 days)
    document.cookie = `ph_access=${access}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    return user
}

/**
 * registerWithDjango — call Django /auth/register/, store tokens, return user
 */
export async function registerWithDjango(data: {
    email: string
    password: string
    full_name: string
    phone?: string
    role?: string
}): Promise<User> {
    const res = await api.post('/auth/register/', data)
    const { access, refresh, user } = res.data
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    document.cookie = `ph_access=${access}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    return user
}
