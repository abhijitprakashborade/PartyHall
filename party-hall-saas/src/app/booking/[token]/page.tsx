'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const BookingTokenPageClient = dynamic(() => import('./BookingTokenPageClient'), { ssr: false })

/**
 * Renders an empty div on server (suppressHydrationWarning silences the
 * mismatch caused by MUI emotion injecting a css-global <style> tag).
 * Swaps to the real booking client component after mount.
 */
export default function BookingTokenPage() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    return (
        <div suppressHydrationWarning style={{ minHeight: '100dvh' }}>
            {mounted && <BookingTokenPageClient />}
        </div>
    )
}
