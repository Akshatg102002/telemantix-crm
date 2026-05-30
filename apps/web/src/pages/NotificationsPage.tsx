import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotifications } from '../hooks/useApi'
import { useNotifStore } from '../store/notifications'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { api } from '../lib/api'
import { relativeTime } from '../lib/utils'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
}

const typeColors: Record<string, string> = {
  lead: 'bg-brand-purple/15 text-brand-purple',
  followup: 'bg-warning/15 text-warning',
  automation: 'bg-brand-coral/15 text-brand-coral',
  system: 'bg-bg-elevated text-text-muted',
}

export function NotificationsPage() {
  const qc = useQueryClient()
  const { markAllRead } = useNotifStore()
  const { data } = useNotifications()
  const notifications: Notification[] = data?.data || []

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => { markAllRead(); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-heading font-semibold text-text-primary">Notifications</h2>
          {unread > 0 && <Badge variant="default">{unread} unread</Badge>}
        </div>
        {unread > 0 && (
          <Button size="sm" variant="secondary" onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No notifications yet</p>
            </CardContent>
          </Card>
        )}
        {notifications.map((n, i) => (
          <motion.div key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className={`transition-all ${n.isRead ? '' : 'border-brand-purple/30'}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${typeColors[n.type] || 'bg-bg-elevated text-text-muted'}`}>
                  <Bell className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{n.title}</p>
                    {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-brand-purple shrink-0" />}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-text-muted mt-1">{relativeTime(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <Button size="icon-sm" variant="ghost" onClick={() => markReadMutation.mutate(n.id)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
