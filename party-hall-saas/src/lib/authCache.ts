/**
 * authCache.ts — module-level in-memory auth cache
 * Prevents /api/auth/me from being called too frequently.
 * TTL: 5 minutes. Cleared on logout, updated on login.
 */

interface CachedUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'partner' | 'customer'
  phone?: string
  created_at?: string
}

let _cachedUser: CachedUser | null = null
let _cacheTime: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in ms

/** Returns the cached user if still within TTL, otherwise null */
export function getCachedUser(): CachedUser | null {
  if (_cachedUser && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedUser
  }
  return null
}

/** Stores user in cache with current timestamp */
export function setCachedUser(user: CachedUser): void {
  _cachedUser = user
  _cacheTime = Date.now()
}

/** Clears the cache — call on logout */
export function clearCachedUser(): void {
  _cachedUser = null
  _cacheTime = 0
}
