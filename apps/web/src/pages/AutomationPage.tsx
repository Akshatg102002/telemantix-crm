import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Zap, Play, Pause, Trash2, ChevronRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { useToast } from '../components/ui/toast'
import { relativeTime } from '../lib/utils'

interface Automation {
  id: string
  name: string
  description?: string
  trigger: string
  isActive: boolean
  isSystem: boolean
  runCount: number
  lastRunAt?: string
  actions: Action[]
}

interface Action {
  type: string
  config: Record<string, string>
}

const TRIGGERS = [
  { value: 'lead_created', label: 'Lead Created' },
  { value: 'status_changed', label: 'Status Changed' },
  { value: 'missed_followup', label: 'Missed Follow-up' },
  { value: 'score_threshold', label: 'Score Threshold Reached' },
  { value: 'webhook_received', label: 'Webhook Received' },
]

const ACTIONS = [
  { value: 'send_whatsapp', label: 'Send WhatsApp' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'change_status', label: 'Change Status' },
  { value: 'assign_agent', label: 'Assign Agent' },
  { value: 'create_followup', label: 'Create Follow-up' },
  { value: 'fire_webhook', label: 'Fire Webhook' },
]

export function AutomationPage() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('lead_created')
  const [actionType, setActionType] = useState('send_whatsapp')

  const { data: automations, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get('/automations').then(r => r.data.data),
  })

  const toggleMutation = useMutation({
    mutationFn: (a: Automation) => api.patch(`/automations/${a.id}`, { isActive: !a.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/automations/${id}`),
    onSuccess: () => { success('Automation deleted'); qc.invalidateQueries({ queryKey: ['automations'] }) },
    onError: () => toastError('Cannot delete system automation'),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/automations', {
      name,
      trigger,
      actions: [{ type: actionType, config: {} }],
      conditions: [],
    }),
    onSuccess: () => {
      success('Automation created')
      setShowCreate(false)
      setName('')
      qc.invalidateQueries({ queryKey: ['automations'] })
    },
    onError: () => toastError('Failed to create automation'),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-text-primary">Automation Engine</h2>
          <p className="text-text-secondary text-xs mt-0.5">Build trigger-based workflows to automate repetitive tasks</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> New Rule
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="h-5 w-5 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
        </div>
      )}

      <div className="space-y-3">
        {(automations || []).map((a: Automation, i: number) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card gradient={a.isActive} className={!a.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${a.isActive ? 'bg-brand-gradient' : 'bg-bg-elevated'}`}>
                  <Zap className={`h-5 w-5 ${a.isActive ? 'text-white' : 'text-text-muted'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{a.name}</p>
                    {a.isSystem && <Badge variant="secondary" className="text-[9px]">System</Badge>}
                    <Badge variant={a.isActive ? 'success' : 'secondary'} className="text-[9px]">
                      {a.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  {a.description && <p className="text-xs text-text-muted mt-0.5">{a.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted">
                    <span>Trigger: <span className="text-text-secondary">{TRIGGERS.find(t => t.value === a.trigger)?.label || a.trigger}</span></span>
                    <ChevronRight className="h-3 w-3" />
                    <span>{a.actions?.length || 0} action(s)</span>
                    <span>· {a.runCount} runs</span>
                    {a.lastRunAt && <span>· Last: {relativeTime(a.lastRunAt)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => toggleMutation.mutate(a)}
                    disabled={a.isSystem}
                  >
                    {a.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  {!a.isSystem && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(a.id)}
                      className="text-danger hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {!isLoading && !automations?.length && (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No automation rules yet</p>
              <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>Create your first rule</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Automation Rule</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Rule Name</Label>
              <Input placeholder="e.g. Notify agent on new lead" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Trigger</Label>
              <Select value={trigger} onChange={e => setTrigger(e.target.value)}>
                {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select value={actionType} onChange={e => setActionType(e.target.value)}>
                {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </Select>
            </div>
            <p className="text-xs text-text-muted">Conditions and advanced action config can be edited after creation.</p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!name}>
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
