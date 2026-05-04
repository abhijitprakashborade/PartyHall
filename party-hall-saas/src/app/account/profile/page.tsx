'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
    Box, Card, Typography, TextField, Button, Avatar, Chip,
    Divider, CircularProgress, Alert, IconButton, InputAdornment,
    Grid,
} from '@mui/material'
import {
    Edit, Save, Cancel, Visibility, VisibilityOff,
    Person, Email, Phone, Lock, CheckCircle,
} from '@mui/icons-material'
import api from '@/lib/api'
import { toast } from 'sonner'

interface UserProfile {
    id: string
    email: string
    full_name: string
    phone: string | null
    role: string
    avatar_url: string | null
    is_active: boolean
    created_at: string
}

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'success'> = {
    admin: 'error', partner: 'warning', customer: 'success',
}

export default function ProfilePage() {
    const { user: authUser, setUser: setAuthUser, refetchUser } = useAuth()

    const [user, setUser] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)

    // Editable fields
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')

    // Password change
    const [changingPwd, setChangingPwd] = useState(false)
    const [oldPwd, setOldPwd] = useState('')
    const [newPwd, setNewPwd] = useState('')
    const [confirmPwd, setConfirmPwd] = useState('')
    const [showOldPwd, setShowOldPwd] = useState(false)
    const [showNewPwd, setShowNewPwd] = useState(false)
    const [pwdSaving, setPwdSaving] = useState(false)
    const [pwdError, setPwdError] = useState('')

    useEffect(() => {
        // Load fresh profile data from API (Force no-store)
        api.get('/auth/me/', { headers: { 'Cache-Control': 'no-store' } })
            .then(res => {
                setUser(res.data)
                setFullName(res.data.full_name || '')
                setPhone(res.data.phone || '')
            })
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await api.patch('/auth/me/', { full_name: fullName, phone: phone || null })
            setUser(res.data)
            // Also update global auth context so the Navbar refreshes immediately
            await api.get('/auth/me/', { headers: { 'Cache-Control': 'no-store' } }) // Force fresh fetch
            await refetchUser()
            setEditing(false)
            toast.success('Profile updated!')
        } catch {
            toast.error('Failed to update profile.')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setFullName(user?.full_name || '')
        setPhone(user?.phone || '')
        setEditing(false)
    }

    const handlePasswordChange = async () => {
        setPwdError('')
        if (!oldPwd || !newPwd || !confirmPwd) { setPwdError('All fields are required.'); return }
        if (newPwd.length < 6) { setPwdError('New password must be at least 6 characters.'); return }
        if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return }
        setPwdSaving(true)
        try {
            await api.post('/auth/change-password/', { old_password: oldPwd, new_password: newPwd })
            toast.success('Password changed successfully!')
            setChangingPwd(false)
            setOldPwd(''); setNewPwd(''); setConfirmPwd('')
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.response?.data?.old_password?.[0] || 'Failed to change password.'
            setPwdError(msg)
        } finally {
            setPwdSaving(false)
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        )
    }

    if (!user) return null

    const initials = user?.full_name
        ? user.full_name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user?.email?.charAt(0).toUpperCase() || 'U'

    const joinedDate = new Date(user.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
    })

    return (
        <Box sx={{ maxWidth: 720, mx: 'auto', py: 4, px: 2 }}>
            {/* Header */}
            <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
                My Profile
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage your personal information and account settings.
            </Typography>

            {/* Profile Card */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
                {/* Avatar + Name + Role Banner */}
                <Box sx={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                    p: 3, pb: 6, borderRadius: '12px 12px 0 0', position: 'relative',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                            src={user.avatar_url || undefined}
                            sx={{
                                width: 72, height: 72, fontSize: 28, fontWeight: 700,
                                bgcolor: 'rgba(255,255,255,0.2)',
                                border: '3px solid rgba(255,255,255,0.5)',
                                color: 'white',
                            }}
                        >
                            {initials}
                        </Avatar>
                        <Box>
                            <Typography variant="h6" fontWeight={700} color="white">
                                {user.full_name || 'No Name Set'}
                            </Typography>
                            <Typography variant="body2" color="rgba(255,255,255,0.8)">
                                {user.email}
                            </Typography>
                            <Box sx={{ mt: 0.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                    label={(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)}
                                    size="small"
                                    color={ROLE_COLORS[user.role] || 'default'}
                                    sx={{ fontWeight: 700, fontSize: 11 }}
                                />
                                <Chip
                                    label={user.is_active ? 'Active' : 'Inactive'}
                                    size="small"
                                    color={user.is_active ? 'success' : 'default'}
                                    sx={{ fontWeight: 700, fontSize: 11 }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Fields */}
                <Box sx={{ p: 3, mt: -3, bgcolor: 'background.paper', borderRadius: '12px 12px 0 0', position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Personal Information</Typography>
                        {!editing ? (
                            <Button startIcon={<Edit />} size="small" onClick={() => setEditing(true)} variant="outlined">
                                Edit
                            </Button>
                        ) : (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button startIcon={<Cancel />} size="small" onClick={handleCancel} color="inherit">
                                    Cancel
                                </Button>
                                <Button
                                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
                                    size="small" onClick={handleSave} variant="contained" disabled={saving}
                                >
                                    Save
                                </Button>
                            </Box>
                        )}
                    </Box>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth label="Full Name" size="small"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                disabled={!editing}
                                InputProps={{ startAdornment: <Person sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth label="Email" size="small"
                                value={user.email}
                                disabled
                                helperText="Email cannot be changed"
                                InputProps={{ startAdornment: <Email sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth label="Phone" size="small"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                disabled={!editing}
                                placeholder="+91 9876543210"
                                InputProps={{ startAdornment: <Phone sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} /> }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth label="Member Since" size="small"
                                value={joinedDate}
                                disabled
                                InputProps={{ startAdornment: <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 18 }} /> }}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </Card>

            {/* Change Password Card */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: changingPwd ? 2 : 0 }}>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Lock fontSize="small" /> Change Password
                            </Typography>
                            {!changingPwd && (
                                <Typography variant="caption" color="text.secondary">
                                    Set a strong password to keep your account secure.
                                </Typography>
                            )}
                        </Box>
                        {!changingPwd ? (
                            <Button variant="outlined" size="small" onClick={() => { setChangingPwd(true); setPwdError('') }}>
                                Change
                            </Button>
                        ) : (
                            <Button size="small" color="inherit" onClick={() => {
                                setChangingPwd(false); setOldPwd(''); setNewPwd(''); setConfirmPwd(''); setPwdError('')
                            }}>
                                Cancel
                            </Button>
                        )}
                    </Box>

                    {changingPwd && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {pwdError && <Alert severity="error" sx={{ fontSize: 13 }}>{pwdError}</Alert>}
                            <TextField
                                fullWidth label="Current Password" size="small"
                                type={showOldPwd ? 'text' : 'password'}
                                value={oldPwd}
                                onChange={e => setOldPwd(e.target.value)}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowOldPwd(p => !p)}>
                                                {showOldPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <TextField
                                fullWidth label="New Password" size="small"
                                type={showNewPwd ? 'text' : 'password'}
                                value={newPwd}
                                onChange={e => setNewPwd(e.target.value)}
                                helperText="Min. 6 characters"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowNewPwd(p => !p)}>
                                                {showNewPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <TextField
                                fullWidth label="Confirm New Password" size="small"
                                type="password"
                                value={confirmPwd}
                                onChange={e => setConfirmPwd(e.target.value)}
                            />
                            <Button
                                variant="contained"
                                onClick={handlePasswordChange}
                                disabled={pwdSaving}
                                startIcon={pwdSaving ? <CircularProgress size={14} color="inherit" /> : <Lock />}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                {pwdSaving ? 'Updating…' : 'Update Password'}
                            </Button>
                        </Box>
                    )}
                </Box>
            </Card>
        </Box>
    )
}
