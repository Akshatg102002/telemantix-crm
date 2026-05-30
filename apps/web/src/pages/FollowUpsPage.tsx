import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFollowUps } from '../hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import { useToast } from '../components/ui/toast'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'

interface FollowUp {
  id: string
  type: string
  status: string
  scheduledAt: string
  completedAt?: string
  note?: string
  lead: { id: string; name: string; phone: string }
  assignedUser?: { name: string }
}

const typeIcons: Record<string, React.ElementType> = {
  call: Clock,
  whatsapp: Clock,
  email: Clock,
  meeting: Calendar,
}

const statusConfig = {
  pending: { color: 'warning' as const, label: 'Pending', icon: Clock },
  done: { color: 'success' as const, label: 'Done', icon: CheckCircle },
  missed: { color: 'danger' as const, label: 'Missed', icon: AlertCircle },
  cancelled: { color: 'secondary' as const, label: 'Cancelled', icon: XCircle },
}

export function FollowUpsPage() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useFollowUps({
    status: statusFilter || undefined,
    limit: 50,
  })

  const followUps: FollowUp[] = data?.data || []

  const markDone = useMutation({
    mutationFn: (id: string) => api.patch(`/follow-ups/${id}`, { status: 'done' }),
    onSuccess: () => { success('Follow-up marked done'); qc.invalidateQueries({ queryKey: ['follow-ups'] }) },
    onError: () => toastError('Failed to update'),
  })

  const missed = followUps.filter(f => f.status === 'missed').length
  const pending = followUps.filter(f => f.status === 'pending').length
  const done = followUps.filter(f => f.status === 'done').length

  return (
    <div className="p-6 space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending, variant: 'warning' as const },
          { label: 'Missed', value: missed, variant: 'danger' as const },
          { label: 'Done Today', value: done, variant: 'success' as const },
        ].map(stat => (
          <Card key={stat.label} gradient>
            <CardContent className="p-4 text-center">
              <p className="font-heading font-bold text-2xl text-text-primary">{stat.value}</p>
              <Badge variant={stat.variant} className="mt-1">{stat.label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select className="h-8 text-xs w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
          <option value="missed">Missed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> Schedule Follow-up
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="h-5 w-5 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
          </div>
        )}
        {!isLoading && followUps.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-text-muted text-sm">No follow-ups found</CardContent>
          </Card>
        )}
        {followUps.map((f, i) => {
          const status = statusConfig[f.status as keyof typeof statusConfig] || statusConfig.pending
          const TypeIcon = typeIcons[f.type] || Clock
          const isOverdue = f.status === 'pending' && new Date(f.scheduledAt) < new Date()

          return (
            <motion.div key={f.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`hover:shadow-card-hover transition-all ${isOverdue ? 'border-danger/30' : ''}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? 'bg-danger/15' : 'bg-bg-elevated'}`}>
                    <TypeIcon className={`h-4 w-4 ${isOverdue ? 'text-danger' : 'text-text-muted'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{f.lead.name}</span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-secondary capitalize">{f.type}</span>
                      <Badge variant={status.color} className="text-[9px]">
                        {isOverdue && f.status === 'pending' ? 'Overdue' : status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                      <span>{f.lead.phone}</span>
                      {f.assignedUser && <span>· {f.assignedUser.name}</span>}
                      {f.note && <span>· {f.note}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${isOverdue ? 'text-danger' : 'text-text-secondary'}`}>
                      {formatDate(f.scheduledAt, 'time')}
                    </p>
                    {f.status === 'pending' && (
                      <Button size="sm" variant="secondary" className="mt-1.5 text-xs h-6 px-2" onClick={() => markDone.mutate(f.id)}>
                        <CheckCircle className="h-3 w-3" /> Done
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
