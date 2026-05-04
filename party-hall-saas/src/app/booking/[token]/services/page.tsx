import React from 'react'
import ServicesClient from './ServicesClient'

/**
 * Server Component for the Services page.
 * In Next.js 15/16, 'params' is a Promise that must be awaited.
 */
export default async function BookingServicesPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params

    return (
        <ServicesClient token={token} />
    )
}
