'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Navbar from '@/components/shared/Navbar'
import Link from 'next/link'
import { MapPin, LayoutGrid } from 'lucide-react'
import api from '@/lib/api'

// Matches Hall interface in HallMap.tsx exactly
interface MapHall {
    id: string
    name: string
    slug: string
    address: string
    city: string
    price_per_slot: string | number
    latitude: number | null
    longitude: number | null
    primary_image?: string | null
    capacity_min: number
    capacity_max: number
    instant_confirmation: boolean
}

// Dynamically import the map to avoid SSR issues with Leaflet
const HallMap = dynamic(() => import('@/components/halls/HallMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-500">
                <MapPin className="w-10 h-10 mx-auto mb-2 animate-bounce text-purple-400" />
                <p className="font-medium">Loading Map…</p>
            </div>
        </div>
    ),
})

export default function HallsMapPage() {
    const [halls, setHalls] = useState<MapHall[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<MapHall | null>(null)

    useEffect(() => {
        api.get('/halls/', { params: { sort: 'trending', page_size: 100 } })
            .then(res => {
                const data: MapHall[] = res.data?.results || res.data || []
                setHalls(data.filter(h => h.latitude && h.longitude))
            })
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="pt-20 pb-8 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Halls Near You</h1>
                            <p className="text-gray-500 text-sm">{halls.length} venues on map</p>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href="/halls"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                            >
                                <LayoutGrid className="w-4 h-4" /> Grid View
                            </Link>
                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium">
                                <MapPin className="w-4 h-4" /> Map View
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>
                        {/* Map */}
                        <div className="flex-1 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                            {loading ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                    <div className="animate-pulse text-gray-400">Loading halls…</div>
                                </div>
                            ) : (
                                <HallMap halls={halls} selected={selected} onSelect={setSelected} />
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="w-80 flex-shrink-0 overflow-y-auto space-y-3 pr-1">
                            {halls.map(hall => (
                                <button
                                    key={hall.id}
                                    onClick={() => setSelected(hall)}
                                    className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border transition-all ${selected?.id === hall.id
                                        ? 'border-purple-500 shadow-purple-100 shadow-md'
                                        : 'border-gray-100 hover:border-purple-300 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex-shrink-0 overflow-hidden">
                                            {hall.primary_image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={hall.primary_image} alt={hall.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl">🎉</div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-gray-900 text-sm truncate">{hall.name}</h3>
                                            <p className="text-gray-500 text-xs truncate mt-0.5">{hall.city}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-purple-700 font-bold text-sm">
                                                    ₹{Number(hall.price_per_slot).toLocaleString('en-IN')}
                                                </span>
                                                {hall.instant_confirmation && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                                        ⚡ Instant
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {selected?.id === hall.id && (
                                        <Link
                                            href={`/halls/${hall.slug || hall.id}`}
                                            className="mt-3 block text-center py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold rounded-xl"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            View &amp; Book
                                        </Link>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
