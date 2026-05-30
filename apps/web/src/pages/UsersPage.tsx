import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, UserCheck, UserX, Shield } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUsers } from '../hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { useToast } from '../components/ui/toast'
import { api } from '../lib/api'
import { formatDate, getInitials } from '../lib/utils'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

const roleColors: Record<string, 'default' | 'warning' | 'success' | 'coral'> = {
  superadmin: 'coral',
  admin: 'default',
  manager: 'warning',
  agent: 'success',
}

export function UsersPage() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const { data: users, isLoading } = useUsers()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' })

  const createMutation = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      success('User created')
      setShowCreate(false)
      setForm({ name: '', email: '', password: '', role: 'agent' })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toastError('Failed to create user'),
  })

  const toggleMutation = useMutation({
    mutationFn: (u: User) => api.patch(`/users/${u.id}`, { isActive: !u.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-text-primary">Team Members</h2>
          <p className="text-text-secondary text-xs mt-0.5">{(users || []).length} users in your organization</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> Invite User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && <div className="col-span-3 text-center text-text-muted text-sm py-12">Loading...</div>}
        {(users || []).map((u: User, i: number) => (
          <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card gradient={u.isActive} className={`h-full ${!u.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {getInitials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{u.name}</p>
                    <p className="text-xs text-text-muted truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Shield className="h-3 w-3 text-text-muted" />
                  <Badge variant={roleColors[u.role] || 'secondary'} className="capitalize">{u.role}</Badge>
                  <Badge variant={u.isActive ? 'success' : 'secondary'} className="ml-auto text-[9px]">
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {u.lastLoginAt && (
                  <p className="text-[10px] text-text-muted mt-2">Last login: {formatDate(u.lastLoginAt, 'time')}</p>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full mt-3 text-xs"
                  onClick={() => toggleMutation.mutate(u)}
                >
                  {u.isActive ? <><UserX className="h-3 w-3" /> Deactivate</> : <><UserCheck className="h-3 w-3" /> Activate</>}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'john@company.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'Min 8 characters' },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type={f.type as 'text' | 'email' | 'password'}
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onChange={e => setForm(v => ({ ...v, role: e.target.value }))}>
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
