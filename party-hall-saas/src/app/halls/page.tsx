// Server Component — no 'use client'
// ISR: rebuilds every 60 seconds so new halls appear automatically
import HallsClient from './HallsClient'

export const revalidate = 60

interface Hall {
  id: string
  name: string
  slug: string
  address: string
  city: string
  pincode: string
  capacity_min: number
  capacity_max: number
  price_per_slot: string
  rating_avg: string
  total_reviews: number
  is_featured: boolean
  instant_confirmation: boolean
  primary_image: string | null
  images?: { url: string; image?: string; is_primary: boolean }[]
  distance_km?: number | null
}

async function getTrendingHalls(): Promise<{ halls: Hall[]; total: number }> {
  try {
    // For server-side fetch use internal localhost URL (not the public network IP)
    const baseUrl =
      process.env.SERVER_API_URL ||          // set this in .env.local for prod
      process.env.NEXT_PUBLIC_API_URL ||     // fallback to public URL
      'http://localhost:8000/api'

    const url = `${baseUrl.replace(/\/$/, '')}/halls/?sort=trending`
    const res = await fetch(url, {
      next: { revalidate: 60 },              // Next.js ISR cache tag
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) return { halls: [], total: 0 }

    const data = await res.json()
    const halls: Hall[] = data.results || data
    return { halls, total: data.count ?? halls.length }
  } catch {
    // If server-side fetch fails (e.g. Django not running), return empty
    // The client component will still show the filter UI and fetch on interaction
    return { halls: [], total: 0 }
  }
}

export default async function HallsPage() {
  const { halls, total } = await getTrendingHalls()

  return <HallsClient initialHalls={halls} initialTotal={total} />
}
