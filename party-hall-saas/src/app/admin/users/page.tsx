'use client'

import { useState, useEffect, useCallback } from 'react'
import { alpha, useTheme } from '@mui/material/styles'
import {
    Box, Card, Typography, Chip, Avatar, TextField, Select,
    MenuItem, FormControl, InputLabel, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TablePagination, CircularProgress, Button,
    Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, Alert, Divider,
} from '@mui/material'
import {
    Search, Refresh,
    PersonAdd, Visibility, VisibilityOff, DeleteOutline, WarningAmber,
    AdminPanelSettings, People, Email, Phone, CalendarToday, AccessTime, Badge,
} from '@mui/icons-material'
import api from '@/lib/api'
import { toast } from 'sonner'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'success' | 'secondary'> = {
    superadmin: 'error', admin: 'secondary', partner: 'warning', customer: 'success',
}

interface User {
    id: string
    email: string
    full_name: string
    role: string
    phone: string | null
    is_active: boolean
    created_at: string
    last_login: string | null
}

interface UserStats {
    total: number
    partners: number
    customers: number
    admins: number
    active: number
    super_admins: number
}

const USER_ROLES = [
    { value: 'customer', label: 'Customer' },
    { value: 'partner', label: 'Partner' },
]

const ALL_ROLES = [
    { value: 'customer', label: 'Customer' },
    { value: 'partner', label: 'Partner' },
    { value: 'admin', label: 'Admin' },
]

// ─── Reusable section table ───────────────────────────────────────────────────
function UserTable({
    users,
    loading,
    isAdminSection,
    changingRole,
    onToggleActive,
    onChangeRole,
    onDeleteTarget,
    onView,
}: {
    users: User[]
    loading: boolean
    isAdminSection: boolean
    changingRole: string | null
    onToggleActive: (u: User) => void
    onChangeRole: (u: User, role: string) => void
    onDeleteTarget: (u: User) => void
    onView: (u: User) => void
}) {
    const theme = useTheme()

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, py: 2 } }}>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell></TableRow>
                    ) : users.length === 0 ? (
                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.disabled' }}>No records found</TableCell></TableRow>
                    ) : users.map((u) => {
                        const isSuperAdmin = u.role === 'superadmin'
                        const rowBg = isSuperAdmin
                            ? alpha(theme.palette.error.main, 0.04)
                            : isAdminSection
                                ? alpha(theme.palette.secondary.main, 0.03)
                                : 'inherit'

                        return (
                            <TableRow
                                key={u.id}
                                hover
                                sx={{ '&:last-child td': { border: 0 }, bgcolor: rowBg, transition: 'background 0.2s' }}
                            >
                                {/* User info */}
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{
                                            width: 38, height: 38, fontSize: 14, fontWeight: 700,
                                            bgcolor: isSuperAdmin ? 'error.main' : isAdminSection ? 'secondary.main' : 'primary.main'
                                        }}>
                                            {u.full_name?.charAt(0) || u.email.charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" fontWeight={700}>
                                                {u.full_name || '—'}
                                                {isSuperAdmin && (
                                                    <Chip label="System" size="small" variant="outlined" sx={{ ml: 1, height: 18, fontSize: 9, fontWeight: 800, color: 'error.main', borderColor: 'error.light' }} />
                                                )}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                                        </Box>
                                    </Box>
                                </TableCell>

                                {/* Role */}
                                <TableCell>
                                    {isSuperAdmin ? (
                                        <Chip
                                            label="Super Admin"
                                            size="small"
                                            sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }}
                                        />
                                    ) : isAdminSection ? (
                                        // Admin role — shown as static chip (not editable from here)
                                        <Chip
                                            label="Admin"
                                            size="small"
                                            color="secondary"
                                            sx={{ fontWeight: 700 }}
                                        />
                                    ) : (
                                        <FormControl size="small" variant="outlined" sx={{ minWidth: 110 }}>
                                            <Select
                                                value={u.role}
                                                disabled={changingRole === u.id}
                                                onChange={(e) => onChangeRole(u, e.target.value)}
                                                sx={{
                                                    fontSize: 12, fontWeight: 700,
                                                    color: u.role === 'partner' ? 'warning.main' : 'success.main',
                                                    '& .MuiSelect-select': { py: 0.5, px: 1 },
                                                    borderRadius: 2
                                                }}
                                            >
                                                {USER_ROLES.map(r => (
                                                    <MenuItem key={r.value} value={r.value} sx={{ fontSize: 13, fontWeight: 600 }}>
                                                        {r.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                    {changingRole === u.id && <CircularProgress size={14} sx={{ ml: 1, verticalAlign: 'middle' }} />}
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>{u.phone || '—'}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        {format(parseISO(u.created_at), 'dd MMM yyyy')}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                                        {u.last_login ? formatDistanceToNow(parseISO(u.last_login), { addSuffix: true }) : 'Never'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={u.is_active ? 'Active' : 'Suspended'}
                                        color={u.is_active ? 'success' : 'warning'}
                                        size="small"
                                        sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: 11 }}
                                        variant={u.is_active ? 'filled' : 'outlined'}
                                    />
                                </TableCell>

                                {/* Actions */}
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                        {/* Super admins: fully protected — no actions */}
                                        {isSuperAdmin ? (
                                            <Chip
                                                label="🔒 Protected"
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontWeight: 700, color: 'text.disabled', borderColor: 'divider', fontSize: 11 }}
                                            />
                                        ) : isAdminSection ? (
                                            /* Regular admins: view + no suspend/delete */
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => onView(u)}
                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                            >
                                                View
                                            </Button>
                                        ) : (
                                            /* Regular users: full controls */
                                            <>
                                                <Button
                                                    size="small" variant="outlined"
                                                    onClick={() => onView(u)}
                                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                                >
                                                    View
                                                </Button>
                                                <Button
                                                    size="small" variant="outlined"
                                                    color={u.is_active ? 'warning' : 'success'}
                                                    onClick={() => onToggleActive(u)}
                                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                                >
                                                    {u.is_active ? 'Suspend' : 'Unsuspend'}
                                                </Button>
                                                <Button
                                                    size="small" variant="outlined" color="error"
                                                    onClick={() => onDeleteTarget(u)}
                                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                                >
                                                    Delete
                                                </Button>
                                            </>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
    const theme = useTheme()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)
    const [rowsPerPage] = useState(15)
    const [total, setTotal] = useState(0)
    const [stats, setStats] = useState<UserStats | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [sortBy, setSortBy] = useState('newest')

    // Role change — per-row loading
    const [changingRole, setChangingRole] = useState<string | null>(null)

    // View user dialog
    const [viewUser, setViewUser] = useState<User | null>(null)

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Create user dialog
    const [createOpen, setCreateOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const [form, setForm] = useState({
        email: '', password: '', full_name: '', phone: '', role: 'customer',
    })

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = {
                page: String(page + 1),
                sort: sortBy
            }
            if (search) params.search = search
            if (statusFilter !== 'all') params.status = statusFilter

            const res = await api.get('/auth/users/', { params })
            const data = res.data
            setUsers(data.users || data.results || data)
            setStats(data.stats || null)
            setTotal(data.stats?.total || data.count || (data.users || data.results || data).length)
        } catch {
            toast.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }, [page, search, statusFilter, sortBy])

    useEffect(() => { fetchUsers() }, [fetchUsers])

    const toggleActive = async (user: User) => {
        try {
            await api.patch(`/auth/users/${user.id}/`, { is_active: !user.is_active })
            toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`)
            fetchUsers()
        } catch { toast.error('Failed to update user') }
    }

    const changeRole = async (user: User, newRole: string) => {
        if (newRole === user.role) return
        setChangingRole(user.id)
        try {
            await api.patch(`/auth/users/${user.id}/`, { role: newRole })
            toast.success(`Role changed to ${newRole}`)
            fetchUsers()
        } catch {
            toast.error('Failed to change role')
        } finally {
            setChangingRole(null)
        }
    }

    const deleteUser = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await api.delete(`/admin/users/${deleteTarget.id}/delete/`)
            toast.success(`User ${deleteTarget.email} deleted permanently.`)
            setDeleteTarget(null)
            fetchUsers()
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Failed to delete user.'
            toast.error(msg)
        } finally {
            setDeleting(false)
        }
    }

    const handleCreate = async () => {
        setCreateError('')
        if (!form.email || !form.password) {
            setCreateError('Email and password are required.')
            return
        }
        if (form.password.length < 6) {
            setCreateError('Password must be at least 6 characters.')
            return
        }
        setCreating(true)
        try {
            await api.post('/admin/users/create/', form)
            toast.success(`User ${form.email} created as ${form.role}!`)
            setCreateOpen(false)
            setForm({ email: '', password: '', full_name: '', phone: '', role: 'customer' })
            fetchUsers()
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Failed to create user.'
            setCreateError(msg)
        } finally {
            setCreating(false)
        }
    }

    // Split users into two groups
    const searchFilter = (u: User) =>
        !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())

    const adminUsers = users.filter(u => (u.role === 'admin' || u.role === 'superadmin') && searchFilter(u))
    const regularUsers = users.filter(u => (u.role === 'customer' || u.role === 'partner') && searchFilter(u))

    return (
        <Box>
            {/* ── Header ── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} color="text.primary">User Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {stats?.active || 0} active accounts across all roles
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                        startIcon={<Refresh />}
                        size="small"
                        onClick={fetchUsers}
                        variant="outlined"
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                    >
                        Refresh
                    </Button>
                    <Button
                        startIcon={<PersonAdd />}
                        size="small"
                        variant="contained"
                        onClick={() => { setCreateOpen(true); setCreateError('') }}
                        sx={{ bgcolor: 'primary.main', borderRadius: 2, fontWeight: 600, px: 2 }}
                    >
                        Create User
                    </Button>
                </Box>
            </Box>

            {/* ── Stats Cards ── */}
            <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Users', value: stats?.total || 0, sub: 'excl. super admins', color: '#6366f1' },
                    { label: 'Partners', value: stats?.partners || 0, sub: `${users.filter(u => u.role === 'partner' && u.is_active).length} active`, color: '#f59e0b' },
                    { label: 'Customers', value: stats?.customers || 0, sub: `${users.filter(u => u.role === 'customer' && u.is_active).length} active`, color: '#10b981' },
                    { label: 'Active', value: stats?.active || 0, sub: 'all roles', color: '#06b6d4' },
                    { label: 'Super Admins', value: stats?.super_admins || 0, sub: 'system accounts', color: '#ef4444' },
                ].map((s) => (
                    <Card key={s.label} elevation={0} sx={{
                        flex: '1 1 180px', p: 2.5, borderRadius: 3,
                        border: '1px solid', borderColor: 'divider',
                        bgcolor: alpha(s.color, 0.02)
                    }}>
                        <Typography variant="h4" fontWeight={800} sx={{ color: s.color, mb: 0.5 }}>{s.value}</Typography>
                        <Typography variant="subtitle2" fontWeight={700} color="text.primary">{s.label}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>{s.sub}</Typography>
                    </Card>
                ))}
            </Box>

            {/* ── Filters ── */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    size="small" placeholder="Search name or email…"
                    value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                    InputProps={{
                        startAdornment: <Search sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} />,
                        sx: { borderRadius: 2, bgcolor: 'background.paper' }
                    }}
                    sx={{ flexGrow: 1, maxWidth: 360 }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
                        sx={{ borderRadius: 2, fontSize: 13, fontWeight: 600 }}
                    >
                        <MenuItem value="all">Status: All</MenuItem>
                        <MenuItem value="active">Status: Active</MenuItem>
                        <MenuItem value="inactive">Status: Inactive</MenuItem>
                        <MenuItem value="suspended">Status: Suspended</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value); setPage(0) }}
                        sx={{ borderRadius: 2, fontSize: 13, fontWeight: 600 }}
                    >
                        <MenuItem value="newest">Sort: Newest</MenuItem>
                        <MenuItem value="oldest">Sort: Oldest</MenuItem>
                        <MenuItem value="name">Sort: Name A-Z</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* Section 1: Admins                                         */}
            {/* ══════════════════════════════════════════════════════════ */}
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AdminPanelSettings sx={{ color: 'secondary.main', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                    Administrators
                </Typography>
                <Chip
                    label={adminUsers.length}
                    size="small"
                    color="secondary"
                    sx={{ fontWeight: 700, height: 20, fontSize: 11 }}
                />
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.disabled" fontWeight={500}>
                        🔒 Super admins are protected · Admins are view-only from this panel
                    </Typography>
                </Box>
            </Box>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: alpha(theme.palette.secondary.main, 0.25), borderRadius: 2, mb: 4 }}>
                <UserTable
                    users={adminUsers}
                    loading={loading}
                    isAdminSection={true}
                    changingRole={changingRole}
                    onToggleActive={toggleActive}
                    onChangeRole={changeRole}
                    onDeleteTarget={setDeleteTarget}
                    onView={setViewUser}
                />
            </Card>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* Section 2: Regular Users                                  */}
            {/* ══════════════════════════════════════════════════════════ */}
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <People sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                    Users
                </Typography>
                <Chip
                    label={regularUsers.length}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 700, height: 20, fontSize: 11 }}
                />
            </Box>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <UserTable
                    users={regularUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
                    loading={loading}
                    isAdminSection={false}
                    changingRole={changingRole}
                    onToggleActive={toggleActive}
                    onChangeRole={changeRole}
                    onDeleteTarget={setDeleteTarget}
                    onView={setViewUser}
                />
                <TablePagination
                    component="div"
                    count={regularUsers.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[15]}
                    onPageChange={(_, p) => setPage(p)}
                />
            </Card>

            {/* ── View User Details Dialog ── */}
            <Dialog open={!!viewUser} onClose={() => setViewUser(null)} maxWidth="xs" fullWidth>
                {viewUser && (
                    <>
                        <DialogTitle sx={{ pb: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{
                                    width: 52, height: 52, fontSize: 20, fontWeight: 700,
                                    bgcolor: viewUser.role === 'superadmin' ? 'error.main'
                                        : viewUser.role === 'admin' ? 'secondary.main'
                                        : viewUser.role === 'partner' ? 'warning.main'
                                        : 'primary.main'
                                }}>
                                    {viewUser.full_name?.charAt(0) || viewUser.email.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography fontWeight={800} variant="subtitle1">
                                        {viewUser.full_name || '—'}
                                    </Typography>
                                    <Chip
                                        label={viewUser.role === 'superadmin' ? 'Super Admin' : viewUser.role.charAt(0).toUpperCase() + viewUser.role.slice(1)}
                                        size="small"
                                        color={ROLE_COLORS[viewUser.role] || 'default'}
                                        sx={{ fontWeight: 700, fontSize: 11, mt: 0.3 }}
                                    />
                                </Box>
                            </Box>
                        </DialogTitle>
                        <DialogContent sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                                {/* Email */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                    <Email sx={{ fontSize: 18, color: 'text.disabled' }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Email</Typography>
                                        <Typography variant="body2" fontWeight={600}>{viewUser.email}</Typography>
                                    </Box>
                                </Box>
                                {/* Phone */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                    <Phone sx={{ fontSize: 18, color: 'text.disabled' }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Phone</Typography>
                                        <Typography variant="body2" fontWeight={600}>{viewUser.phone || 'Not set'}</Typography>
                                    </Box>
                                </Box>
                                {/* Status */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                    <Badge sx={{ fontSize: 18, color: 'text.disabled' }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Account Status</Typography>
                                        <Chip
                                            label={viewUser.is_active ? 'Active' : 'Suspended'}
                                            color={viewUser.is_active ? 'success' : 'warning'}
                                            size="small"
                                            sx={{ fontWeight: 700, fontSize: 11 }}
                                        />
                                    </Box>
                                </Box>
                                {/* Joined */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                    <CalendarToday sx={{ fontSize: 18, color: 'text.disabled' }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Joined</Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {format(parseISO(viewUser.created_at), 'dd MMM yyyy, hh:mm a')}
                                        </Typography>
                                    </Box>
                                </Box>
                                {/* Last Login */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                    <AccessTime sx={{ fontSize: 18, color: 'text.disabled' }} />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">Last Login</Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {viewUser.last_login
                                                ? `${formatDistanceToNow(parseISO(viewUser.last_login), { addSuffix: true })} · ${format(parseISO(viewUser.last_login), 'dd MMM yyyy')}`
                                                : 'Never logged in'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button onClick={() => setViewUser(null)} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600 }}>Close</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ── Create User Dialog ── */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonAdd color="primary" />
                        Create New User
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
                    {createError && (
                        <Alert severity="error" sx={{ fontSize: 13 }}>{createError}</Alert>
                    )}

                    <TextField
                        label="Full Name"
                        size="small"
                        value={form.full_name}
                        onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                        placeholder="e.g. Rahul Sharma"
                    />
                    <TextField
                        label="Email *"
                        size="small"
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="user@example.com"
                    />
                    <TextField
                        label="Password *"
                        size="small"
                        type={showPwd ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setShowPwd(p => !p)}>
                                        {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                        helperText="Min. 6 characters"
                    />
                    <TextField
                        label="Phone"
                        size="small"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+91 9876543210"
                    />
                    <FormControl size="small">
                        <InputLabel>Role *</InputLabel>
                        <Select
                            value={form.role}
                            label="Role *"
                            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                        >
                            {ALL_ROLES.map(r => (
                                <MenuItem key={r.value} value={r.value}>
                                    <Chip
                                        label={r.label}
                                        size="small"
                                        color={ROLE_COLORS[r.value] || 'default'}
                                        sx={{ fontSize: 12, fontWeight: 600, mr: 1 }}
                                    />
                                    {r.value === 'admin' && '— Full platform access'}
                                    {r.value === 'partner' && '— Hall owner / manager'}
                                    {r.value === 'customer' && '— Regular user'}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={creating}
                        startIcon={creating ? <CircularProgress size={14} color="inherit" /> : <PersonAdd />}
                    >
                        {creating ? 'Creating…' : 'Create User'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete Confirmation Dialog ── */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningAmber color="error" />
                    Delete User?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        This action is <strong>permanent and cannot be undone</strong>. All data
                        associated with this account will be deleted.
                    </Typography>
                    {deleteTarget && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'error.lighter', borderRadius: 2, border: '1px solid', borderColor: 'error.light' }}>
                            <Typography variant="body2" fontWeight={700}>{deleteTarget.full_name || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">{deleteTarget.email}</Typography>
                            <Chip label={deleteTarget.role} size="small" color={ROLE_COLORS[deleteTarget.role] || 'default'} sx={{ ml: 1, fontWeight: 600, fontSize: 11 }} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={deleteUser}
                        disabled={deleting}
                        startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutline />}
                    >
                        {deleting ? 'Deleting…' : 'Delete Permanently'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
