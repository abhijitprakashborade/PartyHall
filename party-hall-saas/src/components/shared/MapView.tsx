'use client'

/**
 * MapView — MapLibre GL JS + OpenFreeMap (100% free, no API key)
 *
 * Usage:
 *   <MapView lat={17.385} lng={78.4867} title="Hyderabad Hall" />
 *
 * When lat/lng are null/undefined, shows a "Location not available" placeholder.
 */

import { useEffect, useRef } from 'react'

interface MapViewProps {
    lat?: number | null
    lng?: number | null
    title?: string
    zoom?: number
    height?: string
    className?: string
}

export default function MapView({
    lat,
    lng,
    title = 'Party Hall',
    zoom = 14,
    height = 'clamp(180px, 50vw, 320px)',
    className = '',
}: MapViewProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<unknown>(null)

    // Guard: only render map when valid numeric coordinates are provided
    const hasCoords = typeof lat === 'number' && typeof lng === 'number'
        && !isNaN(lat) && !isNaN(lng)

    useEffect(() => {
        if (!hasCoords) return
        let map: any = null

        import('maplibre-gl').then((maplibregl) => {
            if (!mapContainerRef.current) return

            map = new maplibregl.default.Map({
                container: mapContainerRef.current,
                style: 'https://tiles.openfreemap.org/styles/liberty',
                center: [lng as number, lat as number],
                zoom,
                attributionControl: { compact: true },
                cooperativeGestures: true,
            })

            map.addControl(new maplibregl.default.NavigationControl(), 'top-right')

            const marker = new maplibregl.default.Marker({ color: '#7c3aed' })
                .setLngLat([lng as number, lat as number])
                .addTo(map as Parameters<typeof marker.addTo>[0])

            const popup = new maplibregl.default.Popup({ offset: 28, closeOnClick: false })
                .setLngLat([lng as number, lat as number])
                .setHTML(`
          <div style="font-weight:600; color:#7c3aed;">${title}</div>
          <div style="font-size:0.75rem; color:gray; margin-top:2px;">
            ${(lat as number).toFixed(4)}, ${(lng as number).toFixed(4)}
          </div>
        `)
                .addTo(map as Parameters<typeof popup.addTo>[0])

            mapRef.current = map
        })

        return () => {
            if (map) map.remove()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lat, lng, hasCoords])

    return (
        <div
            className={`rounded-2xl overflow-hidden border border-purple-100 dark:border-purple-900/30 shadow-lg ${className}`}
            style={{ height }}
        >
            {hasCoords ? (
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
                    <span className="text-3xl">📍</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Location not available</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Map will appear once coordinates are set</p>
                </div>
            )}
        </div>
    )
}
