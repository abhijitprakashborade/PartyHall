'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useCompare } from '@/context/CompareContext'
import { Check, X, MapPin, Users, Star, Zap, ArrowLeft } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import Footer from '@/components/shared/Footer'

const AMENITIES = [
    { key: 'amenity_ac', label: 'Air Conditioning' },
    { key: 'amenity_parking', label: 'Parking' },
    { key: 'amenity_wifi', label: 'Wi-Fi' },
    { key: 'amenity_projector', label: 'Projector' },
    { key: 'amenity_sound_system', label: 'Sound System' },
    { key: 'instant_confirmation', label: '⚡ Instant Confirmation' },
] as const

export default function ComparePage() {
    const { items, remove, clear } = useCompare()

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Link href="/halls" className="text-gray-400 hover:text-purple-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Compare Halls</h1>
                            <p className="text-gray-500 text-sm">{items.length} of 3 halls selected</p>
                        </div>
                    </div>
                    {items.length > 0 && (
                        <button onClick={clear} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                            Clear All
                        </button>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">⚖️</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No halls to compare</h3>
                        <p className="text-gray-500 mb-6">Browse halls and click "Compare" to add them here.</p>
                        <Link href="/halls" className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors">
                            Browse Halls
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            {/* Hall header cards */}
                            <thead>
                                <tr>
                                    <th className="w-44 text-left pb-4 text-gray-600 text-sm font-semibold">
                                        Feature
                                    </th>
                                    {items.map((hall, i) => (
                                        <th key={hall.id} className="p-3 min-w-[220px]">
                                            <motion.div
                                                initial={{ opacity: 0, y: -12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.08 }}
                                                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                                            >
                                                <div className="relative h-28 bg-gradient-to-br from-purple-100 to-pink-100">
                                                    {hall.primary_image ? (
                                                        <img src={hall.primary_image} alt={hall.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-4xl">🎉</div>
                                                    )}
                                                    <button
                                                        onClick={() => remove(hall.id)}
                                                        className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors"
                                                    >
                                                        <X className="w-3 h-3 text-gray-500" />
                                                    </button>
                                                </div>
                                                <div className="p-3">
                                                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{hall.name}</h3>
                                                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                                                        <MapPin className="w-3 h-3" /> {hall.city}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </th>
                                    ))}
                                    {/* Empty slots */}
                                    {Array.from({ length: 3 - items.length }).map((_, i) => (
                                        <th key={`empty-${i}`} className="p-3 min-w-[220px]">
                                            <Link href="/halls">
                                                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl h-40 flex flex-col items-center justify-center text-gray-400 hover:border-purple-300 hover:text-purple-400 transition-colors cursor-pointer">
                                                    <span className="text-3xl mb-2">+</span>
                                                    <span className="text-xs font-medium">Add a hall</span>
                                                </div>
                                            </Link>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {/* Price */}
                                <CompareRow label="Price / Slot">
                                    {items.map(h => (
                                        <td key={h.id} className="p-3 text-center">
                                            <span className="text-purple-700 font-bold text-lg">
                                                ₹{Number(h.price_per_slot).toLocaleString('en-IN')}
                                            </span>
                                        </td>
                                    ))}
                                </CompareRow>

                                {/* Capacity */}
                                <CompareRow label="Capacity">
                                    {items.map(h => (
                                        <td key={h.id} className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-1 text-gray-700">
                                                <Users className="w-3.5 h-3.5 text-purple-400" />
                                                {h.capacity_min}–{h.capacity_max} people
                                            </div>
                                        </td>
                                    ))}
                                </CompareRow>

                                {/* Rating */}
                                <CompareRow label="Rating">
                                    {items.map(h => (
                                        <td key={h.id} className="p-3 text-center">
                                            {Number(h.rating_avg) > 0 ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                    <span className="font-semibold">{Number(h.rating_avg).toFixed(1)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm">No reviews</span>
                                            )}
                                        </td>
                                    ))}
                                </CompareRow>

                                {/* Amenities */}
                                {AMENITIES.map(({ key, label }) => (
                                    <CompareRow key={key} label={label}>
                                        {items.map(h => (
                                            <td key={h.id} className="p-3 text-center">
                                                {h[key as keyof typeof h] ? (
                                                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                                                ) : (
                                                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                                                )}
                                            </td>
                                        ))}
                                    </CompareRow>
                                ))}

                                {/* CTA */}
                                <tr>
                                    <td className="py-4 text-sm font-semibold text-gray-500">Book</td>
                                    {items.map(h => (
                                        <td key={h.id} className="p-3 text-center">
                                            <Link
                                                href={`/halls/${h.slug || h.id}`}
                                                className="block py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                                            >
                                                View & Book
                                            </Link>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    )
}

function CompareRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <tr className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
            <td className="py-3 text-sm font-medium text-gray-500 pr-4 whitespace-nowrap">{label}</td>
            {children}
            {/* Placeholder cells for empty slots */}
        </tr>
    )
}
