'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// Auto-fetch if initialHalls is empty (handles stale ISR cache from build-time fetch failure)
import { motion } from 'framer-motion'
import { MapPin, Users, Star, Search, Navigation, ChevronDown, X } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'
import api from '@/lib/api'

const CITIES = ['', 'Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Tirunelveli']
const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Highest Rated' },
]
const RADIUS_OPTIONS = [5, 10, 20, 30, 50]

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

interface Props {
  initialHalls: Hall[]
  initialTotal: number
}

export default function HallsClient({ initialHalls, initialTotal }: Props) {
  const [halls, setHalls]       = useState<Hall[]>(initialHalls)
  const [loading, setLoading]   = useState(false)
  const [pincode, setPincode]   = useState('')
  const [radius, setRadius]     = useState(20)
  const [city, setCity]         = useState('')
  const [sort, setSort]         = useState('trending')
  const [capacity, setCapacity] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [searched, setSearched] = useState(true)           // true = show initial results
  const [totalCount, setTotalCount] = useState(initialTotal)
  const pincodeRef = useRef<HTMLInputElement>(null)


  const fetchHalls = useCallback(async (params?: Record<string, string>) => {
    setLoading(true)
    setSearched(true)
    try {
      const query: Record<string, string> = {
        sort,
        ...(pincode.length === 6 ? { pincode, radius: String(radius) } : {}),
        ...(city     ? { city }           : {}),
        ...(capacity ? { capacity }       : {}),
        ...(maxPrice ? { max_price: maxPrice } : {}),
        ...params,
      }
      const res  = await api.get('/halls/', { params: query })
      const data = res.data.results || res.data
      setTotalCount(res.data.count || data.length)
      setHalls(data)
    } catch {
      setHalls([])
    } finally {
      setLoading(false)
    }
  }, [pincode, radius, city, capacity, maxPrice, sort])

  // Auto-fetch on mount if ISR cached empty halls (Django was down during build)
  useEffect(() => {
    if (initialHalls.length === 0) {
      fetchHalls()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePincodeSearch = (e: React.FormEvent) => { e.preventDefault(); fetchHalls() }
  const clearPincode = () => { setPincode(''); fetchHalls({ pincode: '' }) }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Navbar />

      {/* Hero with search */}
      <div className="bg-party-gradient pt-24 pb-14 sm:pt-28 sm:pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-heading mb-3"
          >
            Find Your Party Hall
          </motion.h1>
          <p className="text-white/70 mb-8">Search by pincode to find venues near you</p>

          {/* View toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex gap-1 bg-white/10 backdrop-blur-sm rounded-2xl p-1">
              <span className="px-4 py-1.5 rounded-xl bg-white text-purple-700 text-sm font-bold">🏛️ Grid</span>
              <Link href="/halls/map" className="px-4 py-1.5 rounded-xl text-white/80 hover:text-white text-sm font-medium transition-colors">🗺️ Map</Link>
            </div>
          </div>

          {/* Pincode search */}
          <form onSubmit={handlePincodeSearch} className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={pincodeRef}
                type="text" value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter pincode (e.g. 600001)"
                maxLength={6}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white shadow-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 tracking-widest"
              />
              {pincode && (
                <button type="button" onClick={clearPincode} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select value={radius} onChange={e => setRadius(Number(e.target.value))}
              className="bg-white rounded-2xl px-3 py-3.5 text-sm text-gray-700 font-medium shadow-xl focus:outline-none">
              {RADIUS_OPTIONS.map(r => <option key={r} value={r}>{r} km</option>)}
            </select>
            <button type="submit" className="px-5 py-3.5 bg-white text-purple-700 font-bold rounded-2xl shadow-xl hover:bg-purple-50 transition-colors text-sm">
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative">
            <select value={city} onChange={e => { setCity(e.target.value); fetchHalls({ city: e.target.value }) }}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="">All Cities</option>
              {CITIES.filter(Boolean).map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)}
            placeholder="Min capacity" min={1}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-gray-200 w-36 focus:outline-none focus:ring-2 focus:ring-purple-400" />

          <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
            placeholder="Max ₹/slot" min={0}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-gray-200 w-36 focus:outline-none focus:ring-2 focus:ring-purple-400" />

          <div className="relative ml-auto">
            <select value={sort} onChange={e => { setSort(e.target.value); fetchHalls({ sort: e.target.value }) }}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400">
              {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button onClick={() => fetchHalls()}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
            Apply Filters
          </button>
        </div>

        {/* Results header */}
        {searched && !loading && (
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            {halls.length === 0 ? 'No halls found' : `${totalCount} hall${totalCount !== 1 ? 's' : ''} found`}
            {pincode.length === 6 ? ` within ${radius} km of ${pincode}` : ''}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
                <div className="h-48 shimmer" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-2/3 shimmer rounded" />
                  <div className="h-4 w-1/2 shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : halls.length === 0 && searched ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏛️</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No halls found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {pincode.length === 6
                ? `No approved halls within ${radius} km of pincode ${pincode}`
                : 'Try searching by pincode to find venues near you'}
            </p>
            {pincode && <button onClick={clearPincode} className="text-purple-600 underline text-sm">Clear pincode search</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {halls.map((hall, i) => {
              const primaryImgObj = hall.images?.find(img => img.is_primary) || hall.images?.[0]
              const img   = hall.primary_image || primaryImgObj?.image || primaryImgObj?.url
              const price = parseFloat(hall.price_per_slot || '0')
              return (
                <motion.div
                  key={hall.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group card-hover"
                >
                  <Link href={`/halls/${encodeURIComponent(hall.slug || hall.id)}`}>
                    <div className="relative h-48 bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden">
                      {img ? (
                        <img src={img} alt={hall.name} loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }} />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center text-5xl ${img ? 'hidden' : ''}`}>🎉</div>
                      {hall.is_featured && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow">⭐ Featured</span>
                      )}
                      {hall.instant_confirmation && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow mt-8">✓ Instant</span>
                      )}
                      {hall.distance_km !== undefined && (
                        <span className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
                          📍 {hall.distance_km} km
                        </span>
                      )}
                      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-3 left-3 text-white text-sm font-semibold">
                        From ₹{price.toLocaleString('en-IN')}/slot
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1 line-clamp-1">{hall.name}</h3>
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm mb-3">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="line-clamp-1">{hall.address ? `${hall.address}, ${hall.city}` : hall.city}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-purple-500" />
                          <span className="text-gray-600 dark:text-gray-300 text-sm">{hall.capacity_min}–{hall.capacity_max} people</span>
                        </div>
                        {parseFloat(hall.rating_avg) > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{Number(hall.rating_avg).toFixed(1)}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">({hall.total_reviews})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="px-4 pb-4">
                    <Link href={`/halls/${encodeURIComponent(hall.slug || hall.id)}`}
                      className="block w-full py-2.5 text-center text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all">
                      View &amp; Book
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
