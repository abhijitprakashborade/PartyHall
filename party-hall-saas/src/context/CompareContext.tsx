'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'

const MAX_COMPARE = 3

interface CompareItem {
    id: string
    name: string
    slug: string
    price_per_slot: string | number
    capacity_min: number
    capacity_max: number
    rating_avg: string | number
    amenity_ac: boolean
    amenity_parking: boolean
    amenity_wifi: boolean
    amenity_projector: boolean
    amenity_sound_system: boolean
    instant_confirmation: boolean
    city: string
    primary_image?: string | null
}

interface CompareCtx {
    items: CompareItem[]
    add: (hall: CompareItem) => void
    remove: (id: string) => void
    clear: () => void
    has: (id: string) => boolean
}

const Ctx = createContext<CompareCtx>({
    items: [],
    add: () => { },
    remove: () => { },
    clear: () => { },
    has: () => false,
})

export function CompareProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CompareItem[]>([])

    const add = useCallback((hall: CompareItem) => {
        setItems(prev => {
            if (prev.find(h => h.id === hall.id)) return prev
            if (prev.length >= MAX_COMPARE) {
                toast.error(`You can compare up to ${MAX_COMPARE} halls at a time.`)
                return prev
            }
            toast.success(`${hall.name} added to comparison`)
            return [...prev, hall]
        })
    }, [])

    const remove = useCallback((id: string) => {
        setItems(prev => prev.filter(h => h.id !== id))
    }, [])

    const clear = useCallback(() => setItems([]), [])
    const has = useCallback((id: string) => items.some(h => h.id === id), [items])

    return <Ctx.Provider value={{ items, add, remove, clear, has }}>{children}</Ctx.Provider>
}

export const useCompare = () => useContext(Ctx)
