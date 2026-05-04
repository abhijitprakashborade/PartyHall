'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'

// Fix default marker icons (Leaflet webpack issue)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom purple marker icon for selected hall
const selectedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
})

const defaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
})

interface Hall {
    id: string
    name: string
    slug: string
    city: string
    address: string
    price_per_slot: string | number
    latitude: number | null
    longitude: number | null
    instant_confirmation: boolean
    capacity_min: number
    capacity_max: number
}

interface Props {
    halls: Hall[]
    selected: Hall | null
    onSelect: (hall: Hall) => void
}

function FlyTo({ hall }: { hall: Hall | null }) {
    const map = useMap()
    useEffect(() => {
        if (hall?.latitude && hall?.longitude) {
            map.flyTo([hall.latitude, hall.longitude], 14, { duration: 1 })
        }
    }, [hall, map])
    return null
}

export default function HallMap({ halls, selected, onSelect }: Props) {
    const validHalls = halls.filter(h => h.latitude && h.longitude)
    const center: [number, number] = validHalls.length > 0
        ? [validHalls[0].latitude!, validHalls[0].longitude!]
        : [13.0827, 80.2707] // Chennai default

    return (
        <MapContainer
            center={center}
            zoom={11}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyTo hall={selected} />
            {validHalls.map(hall => (
                <Marker
                    key={hall.id}
                    position={[hall.latitude!, hall.longitude!]}
                    icon={selected?.id === hall.id ? selectedIcon : defaultIcon}
                    eventHandlers={{ click: () => onSelect(hall) }}
                >
                    <Popup maxWidth={240}>
                        <div className="p-1">
                            <h3 className="font-bold text-gray-900 text-sm mb-1">{hall.name}</h3>
                            <p className="text-gray-500 text-xs mb-1">{hall.address}, {hall.city}</p>
                            <p className="text-purple-700 font-semibold text-sm mb-2">
                                From ₹{Number(hall.price_per_slot).toLocaleString('en-IN')}/slot
                            </p>
                            <div className="text-xs text-gray-500 mb-3">
                                👥 {hall.capacity_min}–{hall.capacity_max} people
                                {hall.instant_confirmation && (
                                    <span className="ml-2 text-green-600 font-medium">⚡ Instant</span>
                                )}
                            </div>
                            <Link
                                href={`/halls/${hall.slug || hall.id}`}
                                className="block text-center py-1.5 px-3 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                View & Book →
                            </Link>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
