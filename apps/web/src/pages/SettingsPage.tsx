import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Key, Webhook, Zap, Users, SlidersHorizontal } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { useAuthStore } from '../store/auth'
import { formatDate } from '../lib/utils'

const TABS = ['General', 'API Keys', 'Webhook Logs', 'Lead Assignment', 'SLA'] as const
type Tab = typeof TABS[number]

const tabIcons: Record<Tab, React.ElementType> = {
  'General': Building2,
  'API Keys': Key,
  'Webhook Logs': Webhook,
  'Lead Assignment': Users,
  'SLA': SlidersHorizontal,
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('General')
  const tenant = useAuthStore(s => s.tenant)

  const { data: apiKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/settings/api-keys').then(r => r.data.data),
    enabled: tab === 'API Keys',
  })

  const { data: webhookLogs } = useQuery({
    queryKey: ['webhook-logs'],
    queryFn: () => api.get('/settings/webhook-logs').then(r => r.data.data),
    enabled: tab === 'Webhook Logs',
  })

  return (
    <div className="p-6 flex gap-6">
      {/* Sidebar */}
      <div className="w-44 shrink-0 space-y-1">
        {TABS.map(t => {
          const Icon = tabIcons[t]
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {tab === 'General' && (
            <Card gradient>
              <CardHeader><CardTitle className="text-sm">Tenant Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Company Name</Label>
                    <Input defaultValue={tenant?.name} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <Input defaultValue={tenant?.timezone} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Input defaultValue={tenant?.currency} />
                  </div>
                </div>
                <Button size="sm">Save Changes</Button>
              </CardContent>
            </Card>
          )}

          {tab === 'API Keys' && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm">API Keys</CardTitle>
                <Button size="sm" onClick={() => api.post('/settings/api-keys', { name: 'New Key' })}>
                  <Key className="h-3.5 w-3.5" /> Generate Key
                </Button>
              </CardHeader>
              <CardContent>
                {(apiKeys || []).length === 0 && <p className="text-text-muted text-xs text-center py-6">No API keys generated</p>}
                <div className="space-y-2">
                  {(apiKeys || []).map((k: { id: string; name: string; isActive: boolean; lastUsed?: string; createdAt: string }) => (
                    <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg border border-border text-xs">
                      <Key className="h-3.5 w-3.5 text-text-muted" />
                      <div className="flex-1">
                        <span className="text-text-primary font-medium">{k.name}</span>
                        {k.lastUsed && <span className="text-text-muted ml-2">Last used: {formatDate(k.lastUsed)}</span>}
                      </div>
                      <Badge variant={k.isActive ? 'success' : 'secondary'}>{k.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'Webhook Logs' && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Webhook Logs (Last 200)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {(webhookLogs || []).map((log: { id: string; direction: string; source?: string; url?: string; statusCode?: number; durationMs?: number; createdAt: string; requestBody?: unknown }) => (
                    <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border text-xs hover:bg-bg-elevated transition-colors">
                      <Badge variant={log.direction === 'inbound' ? 'default' : 'coral'} className="text-[9px] shrink-0">
                        {log.direction}
                      </Badge>
                      <span className="text-text-secondary truncate flex-1">{log.source || log.url || '—'}</span>
                      <Badge variant={log.statusCode && log.statusCode < 300 ? 'success' : 'danger'} className="text-[9px] shrink-0">
                        {log.statusCode || '—'}
                      </Badge>
                      {log.durationMs && <span className="text-text-muted shrink-0">{log.durationMs}ms</span>}
                      <span className="text-text-muted shrink-0">{formatDate(log.createdAt, 'time')}</span>
                    </div>
                  ))}
                  {!webhookLogs?.length && <p className="text-text-muted text-xs text-center py-6">No webhook logs</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'Lead Assignment' && (
            <Card gradient>
              <CardHeader><CardTitle className="text-sm">Lead Assignment Engine</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-text-secondary">Configure how new leads are automatically distributed to agents.</p>
                <div className="space-y-3">
                  {['Round Robin', 'Load Balanced', 'Rule Based'].map(mode => (
                    <label key={mode} className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:border-brand-purple/40 transition-colors">
                      <input type="radio" name="assignMode" className="text-brand-purple" />
                      <div>
                        <p className="text-sm text-text-primary font-medium">{mode}</p>
                        <p className="text-xs text-text-muted">
                          {mode === 'Round Robin' && 'Distribute evenly in sequence'}
                          {mode === 'Load Balanced' && 'Assign to agent with fewest active leads'}
                          {mode === 'Rule Based' && 'Custom rules by source, location, board'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <Button size="sm">Save Configuration</Button>
              </CardContent>
            </Card>
          )}

          {tab === 'SLA' && (
            <Card gradient>
              <CardHeader><CardTitle className="text-sm">SLA Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-text-secondary">Set response and resolution time SLAs per service board. Breached leads appear highlighted in red.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Default Response Time (hours)</Label>
                    <Input type="number" defaultValue={24} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Default Resolution Time (hours)</Label>
                    <Input type="number" defaultValue={72} />
                  </div>
                </div>
                <Button size="sm">Save SLA Config</Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
