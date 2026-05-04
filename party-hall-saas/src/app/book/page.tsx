'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy booking page — the new flow is /halls -> /halls/[id] -> /booking/checkout
 * Redirect customers to the hall search page.
 */
export default function BookRedirect() {
    const router = useRouter()
    useEffect(() => { router.replace('/halls') }, [router])
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Redirecting to hall search…</p>
            </div>
        </div>
    )
}
