'use client'

import { useState, useEffect } from 'react'
import { Shield, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

const ACTION_COLORS: Record<string, string> = {
    hall_approved:          'bg-green-500/10 text-green-400',
    hall_rejected:          'bg-red-500/10 text-red-400',
    refund_issued:          'bg-yellow-500/10 text-yellow-400',
    refund_processed:       'bg-yellow-500/10 text-yellow-400',
    refund_rejected:        'bg-red-500/10 text-red-400',
    booking_cancelled:      'bg-orange-500/10 text-orange-400',
    booking_confirmed:      'bg-green-500/10 text-green-400',
    review_approved:        'bg-blue-500/10 text-blue-400',
    review_removed:         'bg-red-500/10 text-red-400',
    subscription_activated: 'bg-purple-500/10 text-purple-400',
    subscription_granted:   'bg-purple-500/10 text-purple-400',
    subscription_revoked:   'bg-orange-500/10 text-orange-400',
    user_activated:         'bg-green-500/10 text-green-400',
    user_deactivated:       'bg-gray-500/10 text-gray-400',
}

/** Build a human-readable summary from metadata */
function metaSummary(action: string, meta: Record<string, any>): string {
    if (!meta || Object.keys(meta).length === 0) return ''
    if (action.startsWith('hall')) return meta.reason ? `Reason: ${meta.reason}` : ''
    if (action.startsWith('subscription')) return meta.partner ? `Partner: ${meta.partner}  Plan: ${meta.plan || ''}` : ''
    if (action.startsWith('user')) return meta.email ? `${meta.email} (${meta.role})` : ''
    return JSON.stringify(meta).slice(0, 120)
}

interface LogEntry {
    id: string
    action: string
    entity_type: string
    entity_id: string | null
    admin_name: string
    metadata: Record<string, any>
    created_at: string
}

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/admin/logs/')
            setLogs(res.data)
        } catch {
            toast.error('Failed to load audit logs')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const filtered = logs.filter(l =>
        !search ||
        l.action.includes(search.toLowerCase()) ||
        l.entity_type?.includes(search.toLowerCase()) ||
        l.admin_name?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">All admin actions recorded for security and compliance</p>
                </div>
                <button onClick={load} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filter by action, entity type, or admin name…"
                className="w-full mb-4 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-4 space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 shimmer rounded-xl" />)}</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No audit logs yet. Admin actions will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {filtered.map(log => (
                            <div key={log.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                            {log.action?.replace(/_/g, ' ')}
                                        </span>
                                        {log.entity_type && (
                                            <span className="text-gray-500 dark:text-gray-500 text-xs">
                                                {log.entity_type}: <code className="text-purple-600 dark:text-purple-400 font-mono">{String(log.entity_id || '').slice(0, 8)}…</code>
                                            </span>
                                        )}
                                    </div>
                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1 truncate">
                                            {metaSummary(log.action, log.metadata)}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-gray-700 dark:text-gray-300 text-xs font-medium">{log.admin_name || 'System'}</div>
                                    <div className="text-gray-400 dark:text-gray-600 text-xs mt-0.5">
                                        {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <p className="text-gray-400 dark:text-gray-600 text-xs text-right mt-2">{filtered.length} entries shown (last 200 max)</p>
        </div>
    )
}
