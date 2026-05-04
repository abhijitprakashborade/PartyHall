'use client'

import { useState, useEffect, useRef } from 'react'
import React from 'react'
import {
    Package, Users, Sparkles, Clock, Calendar,
    CheckCircle, Loader2, ChefHat, Camera, Star,
    Music, Flower2, Flame, AlertCircle, Home
} from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'

interface TokenData {
    booking_ref: string
    status: string
    slot_date: string
    start_time_raw: string
    end_time_raw: string
    start_time: string
    end_time: string
    guest_count: number
    special_notes: string
    customer_name: string
    hall_name: string
    hall_city: string
    hall_address: string
    package: {
        name: string
        price: string
        inclusions: string[]
        duration_hours: number
        max_people: number
    } | null
    addons: {
        name: string
        category: string
        quantity: number
        unit_price: string
        total: string
        display?: string
    }[]
    price_breakdown?: {
        package_price: string
        base_amount: string
        addons_amount: string
        total_amount: string
        guest_count: number
    }
    base_amount: string
    addons_amount: string
    total_amount: string
    checked_in_at: string | null
    checked_out_at: string | null
    // Individual slots for non-contiguous multi-slot bookings
    selected_slots?: { start_time: string; end_time: string; start_raw: string; end_raw: string }[]
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    photography: <Camera className="w-4 h-4" />,
    food: <ChefHat className="w-4 h-4" />,
    decoration: <Flower2 className="w-4 h-4" />,
    entry_effect: <Flame className="w-4 h-4" />,
    music: <Music className="w-4 h-4" />,
    person: <Users className="w-4 h-4" />,
}

const CATEGORY_COLORS: Record<string, string> = {
    photography: 'bg-blue-50 border-blue-200 text-blue-700',
    food: 'bg-orange-50 border-orange-200 text-orange-700',
    decoration: 'bg-pink-50 border-pink-200 text-pink-700',
    entry_effect: 'bg-red-50 border-red-200 text-red-700',
    music: 'bg-purple-50 border-purple-200 text-purple-700',
    person: 'bg-green-50 border-green-200 text-green-700',
}

function fmt12h(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtDate(d: string) {
    return new Date(d + 'T00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
}


export default function ServicesClient({ token }: { token: string }) {
    const [mounted, setMounted] = useState(false)
    const [data, setData] = useState<TokenData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const fetchedRef = useRef(false)

    useEffect(() => {
        setMounted(true)
        if (!token || fetchedRef.current) return
        fetchedRef.current = true

        console.log('[ServicesClient] Fetching booking for token:', token);
        
        api.get(`/bookings/token/${token}/`)
            .then(res => {
                console.log('[ServicesClient] Data received:', res.data);
                setData(res.data)
            })
            .catch((err) => {
                console.error('[ServicesClient] Error fetching data:', err);
                setError('Booking not found or invalid link.')
            })
            .finally(() => setLoading(false))
    }, [token])

    // NOTE: Removed aggressive !mounted guard from here.
    // The loading state below is SSR-safe and helps prevent hydration mismatches.

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
    )

    if (error || !data) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center p-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">{error || 'Booking not found'}</p>
            <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold">
                <Home className="w-4 h-4" /> Go Home
            </Link>
        </div>
    )

    // Only guard the FINAL content which may have locale-specific dates
    if (!mounted) return null

    // ULTRA DEFENSIVE
    const pack = data?.package;
    const addons = data?.addons || [];
    const hallName = data?.hall_name || 'Hall';
    const customerName = data?.customer_name || 'Guest';

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-semibold uppercase tracking-widest opacity-90">Services Order Sheet</span>
                </div>
                <div className="text-2xl font-black tracking-wider font-mono">{data?.booking_ref || '---'}</div>
                <div className="text-sm opacity-80 mt-1">{hallName} · {data?.hall_city || ''}</div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

                {/* Event details card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Event Details</h2>

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400">Customer</div>
                            <div className="font-bold text-gray-900">{customerName}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400">Date</div>
                            <div className="font-bold text-gray-900">{data?.slot_date ? fmtDate(data.slot_date) : '---'}</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Clock className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-gray-400">Time Slot</div>
                            {data?.selected_slots && data.selected_slots.length > 1 ? (
                                <div className="space-y-1">
                                    {data.selected_slots.map((s, i) => (
                                        <div key={i} className="font-bold text-gray-900 text-sm">
                                            {fmt12h(s.start_raw)} – {fmt12h(s.end_raw)} IST
                                        </div>
                                    ))}
                                    <div className="text-xs text-gray-400 mt-1">
                                        {data.selected_slots.length} slots · {data.selected_slots.length}h total
                                    </div>
                                </div>
                            ) : (
                                <div className="font-bold text-gray-900">
                                    {fmt12h(data?.start_time_raw || '')} – {fmt12h(data?.end_time_raw || '')} IST
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400">People</div>
                            <div className="font-bold text-gray-900">{data?.guest_count || 0} people</div>
                        </div>
                    </div>

                    {data?.checked_in_at && (
                        <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-green-50 rounded-xl text-green-700 text-sm font-semibold">
                            <CheckCircle className="w-4 h-4" />
                            Checked in
                        </div>
                    )}
                </div>

                {/* Package card */}
                {pack && (
                    <div className="bg-white rounded-2xl shadow-sm border border-purple-200 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                                <Package className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-400">Selected Package</div>
                                <div className="font-black text-purple-700 text-lg leading-tight">{pack?.name || 'Custom Package'}</div>
                            </div>
                            <div className="ml-auto text-lg font-black text-purple-600">
                                ₹{parseFloat(pack?.price || '0').toLocaleString('en-IN')}
                            </div>
                        </div>

                        <div className="text-xs text-gray-400 mb-2">
                            {pack?.duration_hours || 0}h · Up to {pack?.max_people || 0} people
                        </div>

                        {pack?.inclusions?.length > 0 && (
                            <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Inclusions — Please prepare:
                                </div>
                                <ul className="space-y-2">
                                    {pack.inclusions.map((inc, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <CheckCircle className="w-3 h-3 text-white" />
                                            </div>
                                            <span className="text-gray-800 font-medium">{String(inc)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Add-on services */}
                {addons && addons.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Star className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Extra Services Ordered ({addons.length})
                            </span>
                        </div>

                        <div className="space-y-3">
                            {addons.map((addon, i) => {
                                if (!addon) return null;
                                const category = addon.category || 'other';
                                const colorCls = CATEGORY_COLORS[category] || 'bg-gray-50 border-gray-200 text-gray-700'
                                const icon = CATEGORY_ICONS[category] || <Sparkles className="w-4 h-4" />
                                const unitP = parseFloat(addon.unit_price || '0')
                                const lineTotal = parseFloat(addon.total || '0')

                                return (
                                    <div key={i} className={`rounded-xl border px-4 py-3 ${colorCls}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="opacity-70">{icon}</div>
                                                <div>
                                                    <div className="font-bold text-sm">{addon?.name || 'Service'}</div>
                                                    <div className="text-xs opacity-70 capitalize">
                                                        {category.replace('_', ' ')}
                                                        {(addon?.quantity || 0) > 1
                                                            ? ` · ×${addon.quantity} @ ₹${unitP.toLocaleString('en-IN')} each`
                                                            : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-sm">₹{lineTotal.toLocaleString('en-IN')}</div>
                                                {addon.quantity > 1 && (
                                                    <div className="text-[10px] opacity-60">×{addon.quantity} units</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
            })}
                        </div>
                    </div>
                )}

                {/* Price Breakdown for staff */}
                {(data?.price_breakdown || data?.total_amount) && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">💰 Price Breakdown</div>
                        <div className="space-y-2">
                            {data.package && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Package ({data.package.name})</span>
                                    <span className="font-semibold">₹{parseFloat(data.package.price || '0').toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {parseFloat(data.addons_amount || '0') > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Add-on Services</span>
                                    <span className="font-semibold">₹{parseFloat(data.addons_amount || '0').toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {parseFloat(data.base_amount || '0') > parseFloat(data.package?.price || '0') && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Extra People Fee</span>
                                    <span className="font-semibold">₹{(parseFloat(data.base_amount || '0') - parseFloat(data.package?.price || '0')).toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-black text-base pt-2 border-t border-gray-200">
                                <span className="text-gray-900">Total Paid</span>
                                <span className="text-purple-700">₹{parseFloat(data.total_amount || '0').toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Special notes */}
                {data?.special_notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
                                    Special Requests from Guest
                                </div>
                                <p className="text-sm text-amber-900">{data.special_notes}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs text-gray-400 pb-4">
                    <p className="font-semibold text-gray-500 mb-1">🎉 Internal Staff View</p>
                    <p>Ref: {data?.booking_ref || '---'} · PartyHub Services</p>
                </div>
            </div>
        </div>
    )
}
