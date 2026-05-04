'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Star, Check, X, Save, Package, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

interface Pkg {
    id: string
    name: string
    price: string
    duration_hours: number
    max_people: number
    is_recommended: boolean
    inclusions: string[]
    hall: string
}

const emptyPkg = { name: '', price: '', duration_hours: 2, max_people: 20, is_recommended: false, inclusions: [] as string[] }

export default function AdminPackagesPage() {
    const [packages, setPackages] = useState<Pkg[]>([])
    const [editing, setEditing] = useState<any | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [inclusionInput, setInclusionInput] = useState('')

    const load = async () => {
        setLoading(true)
        try {
            const res = await api.get('/packages/')
            setPackages(res.data.results || res.data)
        } catch { toast.error('Failed to load packages') }
        finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    const handleSave = async () => {
        if (!editing?.name || !editing?.price) { toast.error('Name and price required'); return }
        setSaving(true)
        try {
            if (isCreating) {
                await api.post('/packages/', editing)
                toast.success('Package created!')
            } else {
                await api.patch(`/packages/${editing.id}/`, editing)
                toast.success('Package updated!')
            }
            setEditing(null); setIsCreating(false); load()
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Save failed')
        } finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this package?')) return
        try { await api.delete(`/packages/${id}/`); toast.success('Deleted'); load() }
        catch { toast.error('Delete failed') }
    }

    const toggleRecommended = async (pkg: Pkg) => {
        await api.patch(`/packages/${pkg.id}/`, { is_recommended: !pkg.is_recommended })
        load()
    }

    const addInclusion = () => {
        if (!inclusionInput.trim()) return
        setEditing((p: any) => ({ ...p, inclusions: [...(p?.inclusions || []), inclusionInput.trim()] }))
        setInclusionInput('')
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Package Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage booking packages across all halls</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={load} className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => { setEditing({ ...emptyPkg }); setIsCreating(true) }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm">
                        <Plus className="w-4 h-4" /> New Package
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-40 shimmer rounded-2xl" />)}
                </div>
            ) : packages.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    No packages yet. Create one to get started.
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {packages.map((pkg, i) => (
                        <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className={`bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden shadow-sm ${pkg.is_recommended ? 'border-purple-500/50' : 'border-gray-100 dark:border-white/5'}`}>
                            <div className={`h-1.5 ${pkg.is_recommended ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-100 dark:bg-gray-800'}`} />
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{pkg.name}</h3>
                                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">₹{parseFloat(pkg.price).toLocaleString('en-IN')}</div>
                                        <div className="text-xs text-gray-500">{pkg.duration_hours}h · {pkg.max_people} people</div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => toggleRecommended(pkg)} title="Toggle recommended"
                                            className={`p-1.5 rounded-lg transition-colors ${pkg.is_recommended ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-600 hover:text-yellow-400'}`}>
                                            <Star className="w-4 h-4" fill={pkg.is_recommended ? 'currentColor' : 'none'} />
                                        </button>
                                        <button onClick={() => { setEditing({ ...pkg, price: parseFloat(pkg.price) }); setIsCreating(false) }}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(pkg.id)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {pkg.inclusions?.slice(0, 4).map(item => (
                                        <div key={item} className="text-xs text-gray-500 flex items-center gap-1.5">
                                            <Check className="w-3 h-3 text-green-500 flex-shrink-0" /> {item}
                                        </div>
                                    ))}
                                    {pkg.inclusions?.length > 4 && <div className="text-xs text-purple-400">+{pkg.inclusions.length - 4} more</div>}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Edit / Create Modal */}
            <AnimatePresence>
                {editing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isCreating ? 'Create Package' : 'Edit Package'}</h2>
                                <button onClick={() => { setEditing(null); setIsCreating(false) }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-gray-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4 mb-4">
                                {[
                                    { label: 'Package Name', key: 'name', type: 'text', placeholder: 'e.g. Gold, Silver, Royal' },
                                    { label: 'Price (₹)', key: 'price', type: 'number' },
                                    { label: 'Duration (Hours)', key: 'duration_hours', type: 'number' },
                                    { label: 'Max People', key: 'max_people', type: 'number' },
                                ].map(({ label, key, type, placeholder }) => (
                                    <div key={key}>
                                        <label className="text-gray-400 text-sm mb-1 block">{label}</label>
                                        <input type={type} value={editing[key] || ''} placeholder={placeholder}
                                            onChange={e => setEditing((p: any) => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-400" />
                                    </div>
                                ))}
                            </div>

                            <div className="mb-4">
                                <label className="text-gray-400 text-sm mb-2 block">Inclusions</label>
                                <div className="flex gap-2 mb-2">
                                    <input value={inclusionInput} onChange={e => setInclusionInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInclusion())}
                                        className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-purple-400 text-sm"
                                        placeholder="e.g. Fog Entry (press Enter to add)" />
                                    <button onClick={addInclusion} className="p-2.5 bg-purple-600 rounded-xl hover:bg-purple-500">
                                        <Plus className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {editing.inclusions?.map((item: string, i: number) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                                            {item}
                                            <button onClick={() => setEditing((p: any) => ({ ...p, inclusions: p.inclusions.filter((_: any, idx: number) => idx !== i) }))}
                                                className="hover:text-red-400"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 mb-6">
                                <div onClick={() => setEditing((p: any) => ({ ...p, is_recommended: !p.is_recommended }))}
                                    className={`w-10 h-5 rounded-full transition-colors ${editing.is_recommended ? 'bg-purple-600' : 'bg-gray-700'} relative cursor-pointer`}>
                                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${editing.is_recommended ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </div>
                                ⭐ Mark as Recommended
                            </label>

                            <div className="flex gap-3">
                                <button onClick={() => { setEditing(null); setIsCreating(false) }}
                                    className="flex-1 py-3 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                                    <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Package'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
