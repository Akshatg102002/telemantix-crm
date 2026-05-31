import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Send, Pause, BarChart2, MessageSquare, Users, CheckCircle } from 'lucide-react'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { useToast } from '../components/ui/toast'
import { formatDate } from '../lib/utils'

interface Campaign {
  id: string
  name: string
  template: string
  message: string
  status: string
  scheduledAt?: string
  sentCount: number
  deliveredCount: number
  readCount: number
  failedCount: number
  createdAt: string
}

const statusConfig = {
  draft: { variant: 'secondary' as const, label: 'Draft' },
  scheduled: { variant: 'warning' as const, label: 'Scheduled' },
  running: { variant: 'default' as const, label: 'Running' },
  completed: { variant: 'success' as const, label: 'Completed' },
  paused: { variant: 'warning' as const, label: 'Paused' },
  failed: { variant: 'danger' as const, label: 'Failed' },
}

export function WhatsAppCampaignsPage() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', template: '', message: '', scheduledAt: '' })

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['wa-campaigns'],
    queryFn: () => api.get('/whatsapp/campaigns').then(r => r.data.data),
  })

  const createMut = useMutation({
    mutationFn: () => api.post('/whatsapp/campaigns', form),
    onSuccess: () => { success('Campaign created!'); setShowCreate(false); setForm({ name: '', template: '', message: '', scheduledAt: '' }); qc.invalidateQueries({ queryKey: ['wa-campaigns'] }) },
    onError: () => toastError('Failed to create campaign'),
  })

  const totalSent = (campaigns || []).reduce((s, c) => s + c.sentCount, 0)
  const totalDelivered = (campaigns || []).reduce((s, c) => s + c.deliveredCount, 0)
  const totalRead = (campaigns || []).reduce((s, c) => s + c.readCount, 0)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">WhatsApp Campaigns</h1>
          <p className="text-text-secondary text-xs mt-0.5">Send bulk WhatsApp messages to your leads and contacts</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sent', value: totalSent.toLocaleString('en-IN'), icon: Send, color: 'text-brand-purple' },
          { label: 'Delivered', value: totalDelivered.toLocaleString('en-IN'), icon: CheckCircle, color: 'text-success' },
          { label: 'Read', value: totalRead.toLocaleString('en-IN'), icon: BarChart2, color: 'text-brand-coral' },
        ].map(s => (
          <Card key={s.label} gradient>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
              <div>
                <p className="font-heading font-bold text-xl text-text-primary">{s.value}</p>
                <p className="text-text-muted text-xs">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {isLoading && <div className="text-center text-text-muted text-sm py-8">Loading campaigns...</div>}
        {!isLoading && !(campaigns || []).length && (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No campaigns yet</p>
              <p className="text-text-muted text-xs mt-1">Connect your WhatsApp Business account first in Integrations</p>
              <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>Create First Campaign</Button>
            </CardContent>
          </Card>
        )}
        {(campaigns || []).map((c, i) => {
          const stat = statusConfig[c.status as keyof typeof statusConfig] || statusConfig.draft
          const deliveryRate = c.sentCount > 0 ? Math.round((c.deliveredCount / c.sentCount) * 100) : 0
          const readRate = c.deliveredCount > 0 ? Math.round((c.readCount / c.deliveredCount) * 100) : 0
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card gradient={c.status === 'running'} className="hover:shadow-card-hover transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-text-primary text-sm">{c.name}</h3>
                        <Badge variant={stat.variant} className="text-[9px]">{stat.label}</Badge>
                      </div>
                      <p className="text-xs text-text-muted truncate">{c.message}</p>
                      {c.scheduledAt && <p className="text-xs text-text-muted mt-0.5">Scheduled: {formatDate(c.scheduledAt, 'time')}</p>}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs text-center">
                      <div>
                        <p className="font-bold text-text-primary">{c.sentCount.toLocaleString()}</p>
                        <p className="text-text-muted">Sent</p>
                      </div>
                      <div>
                        <p className="font-bold text-success">{deliveryRate}%</p>
                        <p className="text-text-muted">Delivered</p>
                      </div>
                      <div>
                        <p className="font-bold text-brand-coral">{readRate}%</p>
                        <p className="text-text-muted">Read</p>
                      </div>
                      <div className="flex gap-1">
                        {c.status === 'draft' && (
                          <Button size="sm" variant="secondary" className="text-xs h-7">
                            <Send className="h-3 w-3" /> Launch
                          </Button>
                        )}
                        {c.status === 'running' && (
                          <Button size="sm" variant="secondary" className="text-xs h-7">
                            <Pause className="h-3 w-3" /> Pause
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New WhatsApp Campaign</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g. Diwali Offer Blast" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input placeholder="WABA approved template name" value={form.template} onChange={e => setForm(v => ({ ...v, template: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea placeholder="Hi {{name}}, ..." rows={4} value={form.message} onChange={e => setForm(v => ({ ...v, message: e.target.value }))} />
              <p className="text-xs text-text-muted">Use &#123;&#123;name&#125;&#125;, &#123;&#123;phone&#125;&#125; for personalization</p>
            </div>
            <div className="space-y-1.5">
              <Label>Schedule (optional)</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(v => ({ ...v, scheduledAt: e.target.value }))} />
            </div>
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-xs text-warning">
              ⚠️ WhatsApp Business Account must be connected in Integrations before sending campaigns.
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.name}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
