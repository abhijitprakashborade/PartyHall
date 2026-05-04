// ====================================================
// SHARED TYPESCRIPT TYPES - Party Hall SaaS
// ====================================================

export type UserRole = 'admin' | 'partner' | 'customer'
// NOTE: Backend model uses 'approved' and 'subscription_expired', NOT 'active'
export type HallStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'subscription_expired'
export type SlotStatus = 'available' | 'locked' | 'booked' | 'blocked'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'completed'
export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded'
export type SubscriptionStatus = 'active' | 'expired' | 'grace_period' | 'cancelled'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type AddonCategory = 'entry_effect' | 'photography' | 'person' | 'food' | 'decoration'

export interface User {
    id: string
    email: string
    full_name: string
    phone?: string
    role: UserRole
    avatar_url?: string
    is_active: boolean
    created_at: string
}

export interface PartyHall {
    id: string
    partner_id: string
    name: string
    slug: string
    description?: string
    address: string
    city: string
    state: string
    pincode?: string
    capacity_min: number
    capacity_max: number
    price_per_slot: string | number
    rating_avg: string | number
    total_reviews: number
    status: HallStatus
    is_featured: boolean
    is_active: boolean
    instant_confirmation: boolean
    trending_score: number
    latitude?: number | null
    longitude?: number | null
    // Amenities (standardized to backend model fields)
    amenity_projector: boolean
    amenity_sound_system: boolean
    amenity_wifi: boolean
    amenity_decoration: boolean
    amenity_ac: boolean
    amenity_parking: boolean
    amenity_led_letters: boolean
    amenity_fog_machine: boolean
    // Cancellation policy
    refund_percentage_3h: number
    refund_percentage_2h: number
    refund_percentage_1h: number
    opening_time: string
    closing_time: string
    created_at: string
    updated_at: string
    // Relations
    partner_name?: string
    partner_phone?: string
    images?: HallImage[]
    packages?: Package[]
    addons?: Addon[]
    reviews?: Review[]
    distance_km?: number | null
}

export interface HallImage {
    id: string
    hall_id: string
    url: string
    caption?: string
    is_primary: boolean
    sort_order: number
}

/**
 * Package — aligned to backend model.
 * 'inclusions' is a JSONField (string[]) on the backend.
 * The specific items (Cool Cake, Photo Frame etc.) are stored inside this array,
 * NOT as separate boolean columns.
 */
export interface Package {
    id: string
    hall: string
    name: string
    price: number | string
    duration_hours: number
    max_people: number
    is_recommended: boolean
    is_active: boolean
    sort_order: number
    /** Array of inclusion strings, e.g. ["Cool Cake", "Photo Frame", "LED Letters"] */
    inclusions: string[]
    description?: string
}

export interface Addon {
    id: string
    hall: string | null
    name: string
    description?: string
    price: number | string
    category: AddonCategory
    is_active: boolean
    sort_order: number
}

export interface Slot {
    id: string
    hall: string
    date: string
    start_time: string
    end_time: string
    status: SlotStatus
    locked_until?: string | null
    is_available: boolean
}

export interface Booking {
    id: string
    booking_ref: string
    hall: string
    hall_name?: string
    customer: string
    customer_name?: string
    customer_phone?: string
    slot?: string | null
    package?: string | null
    package_name?: string
    base_amount: number | string
    addons_amount: number | string
    total_amount: number | string
    status: BookingStatus
    guest_count: number
    special_notes?: string
    cancellation_reason?: string
    cancelled_at?: string | null
    refund_amount?: number | string | null
    refund_status?: string
    qr_code_token?: string
    checked_in_at?: string | null
    is_reviewed: boolean
    slot_date?: string | null
    slot_start_time?: string | null
    slot_end_time?: string | null
    created_at: string
    booking_addons?: BookingAddon[]
}

export interface BookingAddon {
    id: string
    addon: string
    addon_name?: string
    quantity: number
    unit_price: number | string
    total_price: number | string
}

export interface Payment {
    id: string
    booking_id: string
    gateway_order_id: string
    gateway_payment_id?: string
    amount: number
    currency: string
    status: PaymentStatus
    payment_method?: string
    refund_id?: string
    refunded_amount: number
    created_at: string
}

export interface Review {
    id: string
    booking_id: string
    hall_id: string
    customer_id: string
    rating: number
    comment?: string
    status: ReviewStatus
    created_at: string
    customer?: User
}

export interface Subscription {
    id: string
    partner_id: string
    plan_name: string
    plan_duration_days: number
    price: number
    start_date: string
    end_date: string
    grace_end_date: string
    status: SubscriptionStatus
    created_at: string
}

export interface CartState {
    hallId: string
    slotId: string
    packageId: string
    selectedAddons: { addonId: string; quantity: number }[]
    totalAmount: number
}

export interface AdminStats {
    totalHalls: number
    activePartners: number
    totalBookings: number
    todayBookings: number
    monthlyRevenue: number
    activeSubscriptions: number
    pendingApprovals: number
    pendingReviews: number
}
