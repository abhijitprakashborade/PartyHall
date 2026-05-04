'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

// ─── CHART COMPONENTS ────────────────────────────────────────────────────────
// Each heavy chart type is wrapped in dynamic() so recharts is NEVER in the
// static module graph. The () => import('recharts').then(...) callback is the
// ONLY place recharts is referenced — no top-level recharts import anywhere.

export const BarChart = dynamic(
    () => import('recharts').then(mod => ({ default: mod.BarChart as ComponentType<any> })),
    { ssr: false }
)

export const LineChart = dynamic(
    () => import('recharts').then(mod => ({ default: mod.LineChart as ComponentType<any> })),
    { ssr: false }
)

export const AreaChart = dynamic(
    () => import('recharts').then(mod => ({ default: mod.AreaChart as ComponentType<any> })),
    { ssr: false }
)

export const PieChart = dynamic(
    () => import('recharts').then(mod => ({ default: mod.PieChart as ComponentType<any> })),
    { ssr: false }
)

// ─── NON-CHART HELPERS ───────────────────────────────────────────────────────
// These are lightweight sub-components (no circular deps). They are safe to
// re-export directly — they are always used INSIDE a dynamic chart above,
// so they only execute after recharts is already loaded.
export {
    Bar,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
    Pie,
} from 'recharts'
