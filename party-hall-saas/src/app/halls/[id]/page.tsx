// Server Component — no 'use client'
// force-dynamic: each request fetches from Django, avoids ISR stale-slug 404s
import { notFound } from 'next/navigation'
import HallDetailClient from './HallDetailClient'

export const dynamic = 'force-dynamic'


interface Hall {
    id: string
    name: string
    description: string
    address: string
    city: string
    pincode: string
    latitude: number | null
    longitude: number | null
    capacity_min: number
    base_capacity: number
    capacity_max: number
    opening_time: string
    closing_time: string
    price_per_slot: string
    hourly_rate: string
    extra_guest_fee: string
    rating_avg: string
    total_reviews: number
    amenity_projector: boolean
    amenity_sound_system: boolean
    amenity_wifi: boolean
    amenity_decoration: boolean
    amenity_ac: boolean
    amenity_parking: boolean
    amenity_led_letters: boolean
    amenity_fog_machine: boolean
    refund_percentage_3h: number
    refund_percentage_2h: number
    refund_percentage_1h: number
    instant_confirmation: boolean
    images: { id: string; url: string; image?: string; is_primary: boolean; caption: string }[]
    packages: { id: string; name: string; price: string; duration_hours: number; max_people: number; inclusions: string[]; is_recommended: boolean }[]
    addon_services: any[]
}

/** Normalize slug: replace spaces (from old stale URLs) with hyphens */
function normalizeSlug(raw: string): string {
    return raw.replace(/ /g, '-')
}

async function getHall(idOrSlug: string): Promise<Hall | null> {
    try {
        const baseUrl =
            process.env.SERVER_API_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            'http://localhost:8000/api'

        // Normalize: spaces → hyphens (guard against stale ISR slugs)
        const safeSlug = normalizeSlug(idOrSlug)
        const url = `${baseUrl.replace(/\/$/, '')}/halls/${encodeURIComponent(safeSlug)}/`
        const res = await fetch(url, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

// SEO: generate per-hall metadata so Google indexes each hall correctly
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const hall = await getHall(id)
    if (!hall) return { title: 'Hall Not Found — PartyHub' }
    return {
        title: `${hall.name} — Book Party Hall in ${hall.city} | PartyHub`,
        description: hall.description
            ? hall.description.slice(0, 160)
            : `Book ${hall.name} in ${hall.city}. Capacity: ${hall.capacity_min}–${hall.capacity_max} people. Starting at ₹${parseFloat(hall.price_per_slot).toLocaleString('en-IN')}/slot.`,
    }
}

export default async function HallDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const normalizedId = normalizeSlug(id)
    const hall = await getHall(normalizedId)

    if (!hall) notFound()

    return <HallDetailClient hall={hall} hallId={normalizedId} />
}
