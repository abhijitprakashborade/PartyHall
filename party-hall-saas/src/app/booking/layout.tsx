/**
 * Layout for /booking/* routes (public ticket & services pages).
 *
 * These pages are fully client-rendered PWA-style views — no user auth,
 * no MUI theming needed. We deliberately exclude BerryThemeProvider here
 * because MUI's emotion cache injects <style> tags into the SSR tree which
 * causes hydration mismatches on these dynamic, client-only pages.
 */
export default function BookingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
