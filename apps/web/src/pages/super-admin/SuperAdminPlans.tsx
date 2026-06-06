import { useState, KeyboardEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Edit2, Check, X } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/toast'

interface Plan {
  id: string
  name: string
  slug: string
  price: number
  yearlyPrice: number
  maxUsers: number
  maxLeads: number
  features: string[]
  includedServices: string[]
  isActive: boolean
  isPopular: boolean
  subscriberCount: number
}

interface ServiceDef {
  key: string
  name: string
  category: string
}

const ALL_SERVICES: ServiceDef[] = [
  { key: 'leads', name: 'Leads', category: 'CRM' },
  { key: 'pipeline', name: 'Pipeline', category: 'CRM' },
  { key: 'followups', name: 'Follow-ups', category: 'CRM' },
  { key: 'tasks', name: 'Tasks', category: 'CRM' },
  { key: 'contacts', name: 'Contacts', category: 'CRM' },
  { key: 'service_boards', name: 'Service Boards', category: 'CRM' },
  { key: 'publishers', name: 'Publishers', category: 'CRM' },
  { key: 'whatsapp', name: 'WhatsApp', category: 'Communication' },
  { key: 'email', name: 'Email', category: 'Communication' },
  { key: 'ivr_dialer', name: 'IVR Dialer', category: 'Communication' },
  { key: 'sms', name: 'SMS', category: 'Communication' },
  { key: 'meta_ads', name: 'Meta Ads', category: 'Integration' },
  { key: 'google_ads', name: 'Google Ads', category: 'Integration' },
  { key: 'indiamart', name: 'IndiaMART', category: 'Integration' },
  { key: 'justdial', name: 'JustDial', category: 'Integration' },
  { key: 'acres99', name: '99Acres', category: 'Integration' },
  { key: 'housing', name: 'Housing.com', category: 'Integration' },
  { key: 'tradeindia', name: 'TradeIndia', category: 'Integration' },
  { key: 'zapier', name: 'Zapier', category: 'Integration' },
  { key: 'basic_analytics', name: 'Basic Analytics', category: 'Analytics' },
  { key: 'advanced_analytics', name: 'Advanced Analytics', category: 'Analytics' },
  { key: 'call_insights', name: 'Call Insights', category: 'Analytics' },
  { key: 'automation_engine', name: 'Automation Engine', category: 'Automation' },
  { key: 'workflow_builder', name: 'Workflow Builder', category: 'Automation' },
  { key: 'ai_scoring', name: 'AI Scoring', category: 'AI' },
  { key: 'ai_email', name: 'AI Email', category: 'AI' },
  { key: 'ai_chatbot', name: 'AI Chatbot', category: 'AI' },
  { key: 'api_access', name: 'API Access', category: 'Security' },
  { key: 'audit_logs', name: 'Audit Logs', category: 'Security' },
  { key: 'import_export', name: 'Import/Export', category: 'Security' },
]

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      const newTag = input.trim().replace(/,$/, '')
      if (newTag && !tags.includes(newTag)) onChange([...tags, newTag])
      setInput('')
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }
  return (
    <div className="flex flex-wrap gap-1 p-2 border border-border rounded-lg min-h-[60px] bg-bg cursor-text" onClick={() => document.getElementById('tag-input')?.focus()}>
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 text-[10px] bg-brand-purple/15 text-brand-purple px-2 py-0.5 rounded-full">
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))}><X className="h-2.5 w-2.5" /></button>
        </span>
      ))}
      <input
        id="tag-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={tags.length === 0 ? 'Type and press Enter...' : ''}
        className="flex-1 bg-transparent text-xs outline-none min-w-[100px]"
      />
    </div>
  )
}

function ServiceCheckboxGrid({ selected, onChange }: { selected: string[]; onChange: (s: string[]) => void }) {
  const grouped = ALL_SERVICES.reduce<Record<string, ServiceDef[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})
  const toggle = (key: string) => {
    if (selected.includes(key)) onChange(selected.filter(k => k !== key))
    else onChange([...selected, key])
  }
  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {Object.entries(grouped).map(([cat, svcs]) => (
        <div key={cat}>
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">{cat}</p>
          <div className="grid grid-cols-2 gap-1">
            {svcs.map(svc => (
              <label key={svc.key} className="flex items-center gap-1.5 text-xs cursor-pointer p-1.5 rounded hover:bg-bg-elevated">
                <input
                  type="checkbox"
                  checked={selected.includes(svc.key)}
                  onChange={() => toggle(svc.key)}
                  className="accent-brand-purple"
                />
                {svc.name}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PlanCard({ plan, onToggle, onEdit }: { plan: Plan; onToggle: () => void; onEdit: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card gradient={plan.isActive} className={!plan.isActive ? 'opacity-60' : ''}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-text-primary">{plan.name}</h3>
                {plan.isPopular && <Badge variant="coral" className="text-[9px]">Popular</Badge>}
              </div>
              <p className="text-xs text-text-muted mt-0.5">slug: {plan.slug}</p>
            </div>
            <div className="flex gap-2">
              <Button size="icon-sm" variant="ghost" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button size="icon-sm" variant={plan.isActive ? 'ghost' : 'secondary'} onClick={onToggle}>
                {plan.isActive ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            <div className="p-2.5 rounded-lg bg-bg-elevated">
              <p className="text-text-muted">Monthly Price</p>
              <p className="font-bold text-text-primary mt-0.5">₹{plan.price.toLocaleString('en-IN')}/user</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-elevated">
              <p className="text-text-muted">Yearly Price</p>
              <p className="font-bold text-text-primary mt-0.5">₹{plan.yearlyPrice.toLocaleString('en-IN')}/user</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-elevated">
              <p className="text-text-muted">Max Users</p>
              <p className="font-bold text-text-primary mt-0.5">{plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-elevated">
              <p className="text-text-muted">Max Leads</p>
              <p className="font-bold text-text-primary mt-0.5">{plan.maxLeads === -1 ? 'Unlimited' : plan.maxLeads.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <Badge variant={plan.isActive ? 'success' : 'secondary'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
            <span className="text-text-muted">{plan.subscriberCount} subscriber{plan.subscriberCount !== 1 ? 's' : ''}</span>
          </div>
          {plan.includedServices && plan.includedServices.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[10px] text-text-muted mb-1">{plan.includedServices.length} services included</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function SuperAdminPlans() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newPlan, setNewPlan] = useState({ name: '', slug: '', price: 0, yearlyPrice: 0, maxUsers: 5, maxLeads: 1000, features: [] as string[], includedServices: [] as string[] })

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['sa-plans'],
    queryFn: () => superAdminApi.get('/super-admin/plans').then(r => r.data.data),
  })

  const toggleMut = useMutation({
    mutationFn: (p: Plan) => superAdminApi.put(`/super-admin/plans/${p.id}`, { isActive: !p.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-plans'] }),
  })

  const updateMut = useMutation({
    mutationFn: (data: Partial<Plan> & { id: string }) => superAdminApi.put(`/super-admin/plans/${data.id}`, {
      ...data,
      price: Number(data.price),
      yearlyPrice: Number(data.yearlyPrice),
      maxUsers: Number(data.maxUsers),
      maxLeads: Number(data.maxLeads),
    }),
    onSuccess: () => { success('Plan updated'); setEditPlan(null); qc.invalidateQueries({ queryKey: ['sa-plans'] }) },
    onError: () => toastError('Update failed'),
  })

  const createMut = useMutation({
    mutationFn: (data: typeof newPlan) => superAdminApi.post('/super-admin/plans', {
      ...data,
      price: Number(data.price),
      yearlyPrice: Number(data.yearlyPrice),
      maxUsers: Number(data.maxUsers),
      maxLeads: Number(data.maxLeads),
    }),
    onSuccess: () => { success('Plan created'); setShowCreate(false); setNewPlan({ name: '', slug: '', price: 0, yearlyPrice: 0, maxUsers: 5, maxLeads: 1000, features: [], includedServices: [] }); qc.invalidateQueries({ queryKey: ['sa-plans'] }) },
    onError: () => toastError('Create failed'),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Plans</h1>
          <p className="text-text-secondary text-xs mt-0.5">Manage subscription plans and pricing</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" /> New Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => (
          <PlanCard key={plan.id} plan={plan} onToggle={() => toggleMut.mutate(plan)} onEdit={() => setEditPlan({ ...plan })} />
        ))}
      </div>

      {/* Edit Dialog */}
      {editPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-bg-surface border border-border rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-text-primary">Edit {editPlan.name} Plan</h3>
              <button onClick={() => setEditPlan(null)} className="text-text-muted hover:text-text-primary"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { key: 'price', label: 'Monthly Price (₹)' },
                { key: 'yearlyPrice', label: 'Yearly Price (₹)' },
                { key: 'maxUsers', label: 'Max Users (-1 = unlimited)' },
                { key: 'maxLeads', label: 'Max Leads (-1 = unlimited)' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    type="number"
                    value={(editPlan as unknown as Record<string, number>)[f.key]}
                    onChange={e => setEditPlan(prev => prev ? { ...prev, [f.key]: Number(e.target.value) } : null)}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5 mb-4">
              <Label>Features (press Enter to add)</Label>
              <TagInput tags={editPlan.features} onChange={tags => setEditPlan(prev => prev ? { ...prev, features: tags } : null)} />
            </div>
            <div className="space-y-1.5 mb-4">
              <Label>Included Services</Label>
              <ServiceCheckboxGrid selected={editPlan.includedServices || []} onChange={s => setEditPlan(prev => prev ? { ...prev, includedServices: s } : null)} />
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setEditPlan(null)}>Cancel</Button>
              <Button size="sm" onClick={() => updateMut.mutate(editPlan)} loading={updateMut.isPending}>Save Changes</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-bg-surface border border-border rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-text-primary">New Plan</h3>
              <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label>Plan Name</Label>
                <Input value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input value={newPlan.slug} onChange={e => setNewPlan(p => ({ ...p, slug: e.target.value }))} className="text-xs" />
              </div>
              {[
                { key: 'price', label: 'Monthly Price (₹)' },
                { key: 'yearlyPrice', label: 'Yearly Price (₹)' },
                { key: 'maxUsers', label: 'Max Users' },
                { key: 'maxLeads', label: 'Max Leads' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    type="number"
                    value={(newPlan as unknown as Record<string, number>)[f.key]}
                    onChange={e => setNewPlan(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5 mb-4">
              <Label>Features (press Enter to add)</Label>
              <TagInput tags={newPlan.features} onChange={tags => setNewPlan(p => ({ ...p, features: tags }))} />
            </div>
            <div className="space-y-1.5 mb-4">
              <Label>Included Services</Label>
              <ServiceCheckboxGrid selected={newPlan.includedServices} onChange={s => setNewPlan(p => ({ ...p, includedServices: s }))} />
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={() => createMut.mutate(newPlan)} loading={createMut.isPending}>Create Plan</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
