import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Flag, Plus, Search } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { useToast } from '../../components/ui/toast'

interface FeatureFlag { id: string; key: string; value: boolean; metadata?: Record<string, unknown>; updatedAt: string }

const DEFAULT_FLAGS = [
  { key: 'ai_lead_scoring', label: 'AI Lead Scoring', category: 'AI' },
  { key: 'ai_email_generation', label: 'AI Email Generation', category: 'AI' },
  { key: 'whatsapp_integration', label: 'WhatsApp Integration', category: 'Communication' },
  { key: 'ivr_dialer', label: 'IVR / Dialer', category: 'Communication' },
  { key: 'advanced_analytics', label: 'Advanced Analytics', category: 'Analytics' },
  { key: 'custom_webhooks', label: 'Custom Webhooks', category: 'Platform' },
  { key: 'api_access', label: 'API Access', category: 'Platform' },
  { key: 'white_label', label: 'White Label', category: 'Enterprise' },
  { key: 'sso_login', label: 'SSO Login', category: 'Security' },
  { key: 'bulk_export', label: 'Bulk Export', category: 'Data' },
  { key: 'automation_engine', label: 'Automation Engine', category: 'Platform' },
]

export function SuperAdminFeatureFlags() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState('')

  const { data: flags, isLoading } = useQuery<FeatureFlag[]>({
    queryKey: ['sa-feature-flags'],
    queryFn: () => superAdminApi.get('/super-admin/feature-flags').then(r => r.data.data),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      superAdminApi.put(`/super-admin/feature-flags/${id}`, { value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-feature-flags'] }),
    onError: () => toastError('Failed to update flag'),
  })

  const createMut = useMutation({
    mutationFn: () => superAdminApi.post('/super-admin/feature-flags', { key: newKey, value: true }),
    onSuccess: () => { success('Flag created'); setShowCreate(false); setNewKey(''); qc.invalidateQueries({ queryKey: ['sa-feature-flags'] }) },
    onError: () => toastError('Failed to create flag'),
  })

  // Merge DB flags with defaults
  const flagMap = new Map((flags || []).map(f => [f.key, f]))
  const allFlags = DEFAULT_FLAGS.map(d => ({
    ...d,
    dbFlag: flagMap.get(d.key),
    enabled: flagMap.get(d.key)?.value ?? true,
  }))

  const grouped = allFlags.reduce((acc, f) => {
    acc[f.category] = acc[f.category] || []
    acc[f.category].push(f)
    return acc
  }, {} as Record<string, typeof allFlags>)

  const filtered = search ? allFlags.filter(f => f.key.includes(search.toLowerCase()) || f.label.toLowerCase().includes(search.toLowerCase())) : []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary flex items-center gap-2"><Flag className="h-5 w-5 text-danger" /> Feature Flags</h1>
          <p className="text-text-secondary text-xs mt-0.5">Control platform-wide feature availability</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" /> New Flag</Button>
      </div>

      <Input icon={<Search className="h-3.5 w-3.5" />} placeholder="Search flags..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs max-w-72" />

      {search ? (
        <div className="space-y-2">
          {filtered.map(f => (
            <div key={f.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-bg-surface text-sm">
              <div>
                <p className="text-text-primary font-medium">{f.label}</p>
                <p className="text-text-muted text-xs font-mono">{f.key}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={f.category === 'AI' ? 'default' : f.category === 'Enterprise' ? 'coral' : 'secondary'} className="text-[9px]">{f.category}</Badge>
                <button
                  onClick={() => {
                    if (f.dbFlag) toggleMut.mutate({ id: f.dbFlag.id, value: !f.enabled })
                    else createMut.mutate()
                  }}
                  className={`relative h-5 w-9 rounded-full transition-colors ${f.enabled ? 'bg-success' : 'bg-border'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${f.enabled ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([category, categoryFlags]) => (
            <div key={category}>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">{category}</h2>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {categoryFlags.map((f, i) => (
                    <motion.div key={f.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-bg-elevated/50 transition-colors">
                      <div>
                        <p className="text-sm text-text-primary font-medium">{f.label}</p>
                        <p className="text-xs text-text-muted font-mono">{f.key}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (f.dbFlag) toggleMut.mutate({ id: f.dbFlag.id, value: !f.enabled })
                          else createMut.mutate()
                        }}
                        className={`relative h-5 w-9 rounded-full transition-colors ${f.enabled ? 'bg-success' : 'bg-border'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${f.enabled ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Feature Flag</DialogTitle></DialogHeader>
          <div className="p-6 space-y-3">
            <div className="space-y-1.5">
              <Label>Flag Key (snake_case)</Label>
              <Input placeholder="e.g. new_dashboard_ui" value={newKey} onChange={e => setNewKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))} className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} loading={createMut.isPending} disabled={!newKey}>Create Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
