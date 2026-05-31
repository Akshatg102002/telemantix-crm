import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, UserCheck, Lock, LogOut, Shield, UserX } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { useAuthStore } from '../../store/auth'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/toast'
import { formatDate, getInitials } from '../../lib/utils'

interface SaUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  tenant: { name: string }
}

const roleColors = { superadmin: 'coral', admin: 'default', manager: 'warning', agent: 'success' } as const

export function SuperAdminUsers() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const { setAuth } = useAuthStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [resetTarget, setResetTarget] = useState<SaUser | null>(null)
  const [newPw, setNewPw] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sa-users', search, roleFilter, page],
    queryFn: () => superAdminApi.get('/super-admin/users', { params: { search, role: roleFilter || undefined, page, limit: 20 } }).then(r => r.data),
  })

  const users: SaUser[] = data?.data || []
  const meta = data?.meta || { total: 0, page: 1, limit: 20 }

  const resetPwMut = useMutation({
    mutationFn: ({ id, pw }: { id: string; pw: string }) => superAdminApi.post(`/super-admin/users/${id}/reset-password`, { newPassword: pw }),
    onSuccess: () => { success('Password reset successfully'); setResetTarget(null); setNewPw('') },
    onError: () => toastError('Failed to reset password'),
  })

  const forceLogoutMut = useMutation({
    mutationFn: (id: string) => superAdminApi.post(`/super-admin/users/${id}/force-logout`),
    onSuccess: () => { success('User logged out from all sessions') },
    onError: () => toastError('Failed to force logout'),
  })

  const toggleMut = useMutation({
    mutationFn: (u: SaUser) => superAdminApi.patch(`/super-admin/users/${u.id}`, { isActive: !u.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-users'] }),
  })

  const impersonateMut = useMutation({
    mutationFn: (tenantId: string) => superAdminApi.post(`/super-admin/companies/${tenantId}/impersonate`),
    onSuccess: (res) => {
      const { user, tenant, accessToken } = res.data.data
      setAuth(user, tenant, accessToken, '')
      success('Impersonating as admin')
      window.open('/dashboard', '_blank')
    },
    onError: () => toastError('Impersonation failed'),
  })

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">User Management</h1>
        <p className="text-text-secondary text-xs mt-0.5">{meta.total} users across all organizations</p>
      </div>
      <div className="flex gap-3">
        <Input icon={<Search className="h-3.5 w-3.5" />} placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="h-8 text-xs max-w-64" />
        <Select className="h-8 text-xs w-32" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="agent">Agent</option>
        </Select>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['User', 'Company', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="p-3 text-left text-text-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-8 text-center text-text-muted">Loading...</td></tr>}
              {!isLoading && !users.length && <tr><td colSpan={6} className="p-8 text-center text-text-muted">No users found</td></tr>}
              {users.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{u.name}</p>
                        <p className="text-text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-text-secondary">{u.tenant?.name || '—'}</td>
                  <td className="p-3">
                    <Badge variant={(roleColors[u.role as keyof typeof roleColors]) || 'secondary'} className="capitalize text-[9px]">
                      <Shield className="h-2.5 w-2.5 mr-0.5" /> {u.role}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={u.isActive ? 'success' : 'secondary'} className="text-[9px]">
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="p-3 text-text-muted">{u.lastLoginAt ? formatDate(u.lastLoginAt, 'time') : 'Never'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button size="icon-sm" variant="ghost" title="Impersonate company" onClick={() => impersonateMut.mutate(u.tenant?.name || '')}>
                        <UserCheck className="h-3 w-3" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Reset password" onClick={() => setResetTarget(u)}>
                        <Lock className="h-3 w-3" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Force logout" onClick={() => forceLogoutMut.mutate(u.id)}>
                        <LogOut className="h-3 w-3" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => toggleMut.mutate(u)}
                        className={u.isActive ? 'text-warning' : 'text-success'}>
                        <UserX className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border text-xs text-text-secondary">
          <span>{meta.total} users</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span>Page {page} of {Math.ceil(meta.total / meta.limit) || 1}</span>
            <Button size="sm" variant="secondary" disabled={page * meta.limit >= meta.total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>
      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={v => !v && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password — {resetTarget?.name}</DialogTitle></DialogHeader>
          <div className="p-6 space-y-3">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 characters" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button onClick={() => resetTarget && resetPwMut.mutate({ id: resetTarget.id, pw: newPw })} loading={resetPwMut.isPending} disabled={newPw.length < 8}>
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
