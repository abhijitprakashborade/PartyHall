/**
 * Axios client for Django REST API
 * All API calls go to Django backend on port 8000
 */
import axios from 'axios'

const getApiBase = () => {
    // In browser, use current hostname if visiting via IP or localhost
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        return `http://${hostname}:8000/api`
    }
    // Server-side or fallback
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
}

const API_BASE = getApiBase()

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
})

// Issue #4: Refresh Lock Pattern
let isRefreshing = false
let failedQueue: Array<{ resolve: Function, reject: Function }> = []

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
    }
    return config
})

// Response interceptor — auto-refresh token on 401 or 403
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config
        const status = error.response?.status

        // Retry on 401 (unauthenticated) or 403 (could be stale token hitting ownership check)
        if ((status === 401 || status === 403) && !original._retry) {
            
            // If already refreshing, wait in queue
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                .then(token => {
                    original.headers.Authorization = `Bearer ${token}`
                    return api(original)
                })
                .catch(err => Promise.reject(err))
            }

            // If refresh fails itself or we're on refresh endpoint, don't retry loop
            if (original.url.includes('/auth/refresh/')) {
                const returnPath = encodeURIComponent(window.location.pathname)
                window.location.href = `/login?next=${returnPath}`
                return Promise.reject(error)
            }

            original._retry = true
            isRefreshing = true

            try {
                // First try refresh token from localStorage (fallback)
                const refresh = localStorage.getItem('refresh_token')
                const { data } = await axios.post(`${API_BASE}/auth/refresh/`, { refresh }, { withCredentials: true })
                
                const newToken = data.access
                localStorage.setItem('access_token', newToken)
                if (data.refresh) localStorage.setItem('refresh_token', data.refresh)
                
                original.headers.Authorization = `Bearer ${newToken}`
                processQueue(null, newToken)
                
                // Retry the original request with fresh token
                return api(original)
            } catch (refreshError) {
                processQueue(refreshError, null)
                // Refresh token also expired — clear auth and redirect to login
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                const returnPath = encodeURIComponent(window.location.pathname)
                window.location.href = `/login?next=${returnPath}`
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }
        return Promise.reject(error)
    }
)

export default api

// ── Auth ──────────────────────────────────────────────
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login/', { email, password }),
    register: (data: { email: string; password: string; full_name: string; phone?: string; role?: string }) =>
        api.post('/auth/register/', data),
    logout: () => {
        if (typeof window === 'undefined') return Promise.resolve({ data: {} })
        const refresh = localStorage.getItem('refresh_token')
        return api.post('/auth/logout/', { refresh })
    },
    me: () => api.get('/auth/me/'),
}

// ── Halls ─────────────────────────────────────────────
export const hallsApi = {
    list: (params?: Record<string, string | number>) => api.get('/halls/', { params }),
    detail: (id: string) => api.get(`/halls/${id}/`),
    create: (data: unknown) => api.post('/halls/', data),
    update: (id: string, data: unknown) => api.patch(`/halls/${id}/`, data),
    approve: (id: string) => api.post(`/halls/${id}/approve/`),
    reject: (id: string, reason: string) => api.post(`/halls/${id}/reject/`, { reason }),
    search: (pincode: string, radius = 20) =>
        api.get('/halls/', { params: { pincode, radius } }),
}

// ── Bookings ──────────────────────────────────────────
export const bookingsApi = {
    list: (params?: Record<string, string>) => api.get('/bookings/', { params }),
    detail: (id: string) => api.get(`/bookings/${id}/`),
    create: (data: unknown) => api.post('/bookings/create_booking/', data),
    cancel: (id: string, reason: string) => api.post(`/bookings/${id}/cancel/`, { reason }),
    lockSlot: (slotId: string) => api.post(`/slots/${slotId}/lock/`),
    releaseSlot: (slotId: string) => api.post(`/slots/${slotId}/release/`),
    slots: (hallId: string, date?: string) =>
        api.get('/slots/', { params: { hall_id: hallId, date } }),
}

// ── Payments ──────────────────────────────────────────
export const paymentsApi = {
    createOrder: (bookingId: string) => api.post('/payments/create-order/', { booking_id: bookingId }),
    verify: (data: unknown) => api.post('/payments/verify/', data),
    refund: (bookingId: string, amount: number) =>
        api.post(`/payments/refund/${bookingId}/`, { amount }),
}

// ── Subscriptions ─────────────────────────────────────
export const subscriptionsApi = {
    get: () => api.get('/subscriptions/'),
    createOrder: (planId: string) => api.post('/subscriptions/', { plan_id: planId }),
    verify: (data: unknown) => api.put('/subscriptions/', data),
}

// ── Admin ─────────────────────────────────────────────
export const adminApi = {
    users: (params?: Record<string, string>) => api.get('/admin/users/', { params }),
    logs: () => api.get('/admin/logs/'),
}

// ── Reviews ───────────────────────────────────────────
export const reviewsApi = {
    list: (params?: Record<string, string>) => api.get('/reviews/', { params }),
    approve: (id: string) => api.post(`/reviews/${id}/approve/`),
    remove: (id: string) => api.delete(`/reviews/${id}/remove/`),
}
