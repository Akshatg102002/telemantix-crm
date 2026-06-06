import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Package, CheckCircle } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/toast'

interface ServiceDef {
  key: string
  name: string
  category: string
  isCore: boolean
}

interface Company {
  id: string
  name: string
  industry?: string
  subscription?: { plan: { name: string } }
  _count: { users: number; leads: number }
}

const CATEGORY_LABELS: Record<string, string> = {
  crm: 'CRM', communication: 'Communication', integration: 'Integration',
  analytics: 'Analytics', automation: 'Automation', ai: 'AI', security: 'Security & Data',
}

const ALL_SERVICES: ServiceDef[] = [
  { key: 'leads', name: 'Leads', category: 'crm', isCore: true },
  { key: 'pipeline', name: 'Pipeline', category: 'crm', isCore: true },
  { key: 'followups', name: 'Follow-ups', category: 'crm', isCore: true },
  { key: 'tasks', name: 'Tasks', category: 'crm', isCore: true },
  { key: 'contacts', name: 'Contacts', category: 'crm', isCore: true },
  { key: 'service_boards', name: 'Service Boards', category: 'crm', isCore: false },
  { key: 'publishers', name: 'Publishers', category: 'crm', isCore: false },
  { key: 'whatsapp', name: 'WhatsApp', category: 'communication', isCore: false },
  { key: 'email', name: 'Email', category: 'communication', isCore: true },
  { key: 'ivr_dialer', name: 'IVR Dialer', category: 'communication', isCore: false },
  { key: 'sms', name: 'SMS', category: 'communication', isCore: false },
  { key: 'meta_ads', name: 'Meta Ads', category: 'integration', isCore: false },
  { key: 'google_ads', name: 'Google Ads', category: 'integration', isCore: false },
  { key: 'indiamart', name: 'IndiaMART', category: 'integration', isCore: false },
  { key: 'justdial', name: 'JustDial', category: 'integration', isCore: false },
  { key: 'acres99', name: '99Acres', category: 'integration', isCore: false },
  { key: 'housing', name: 'Housing.com', category: 'integration', isCore: false },
  { key: 'tradeindia', name: 'TradeIndia', category: 'integration', isCore: false },
  { key: 'zapier', name: 'Zapier', category: 'integration', isCore: false },
  { key: 'basic_analytics', name: 'Basic Analytics', category: 'analytics', isCore: true },
  { key: 'advanced_analytics', name: 'Advanced Analytics', category: 'analytics', isCore: false },
  { key: 'call_insights', name: 'Call Insights', category: 'analytics', isCore: false },
  { key: 'automation_engine', name: 'Automation Engine', category: 'automation', isCore: false },
  { key: 'workflow_builder', name: 'Workflow Builder', category: 'automation', isCore: false },
  { key: 'ai_scoring', name: 'AI Scoring', category: 'ai', isCore: false },
  { key: 'ai_email', name: 'AI Email', category: 'ai', isCore: false },
  { key: 'ai_chatbot', name: 'AI Chatbot', category: 'ai', isCore: false },
  { key: 'api_access', name: 'API Access', category: 'security', isCore: false },
  { key: 'audit_logs', name: 'Audit Logs', category: 'security', isCore: false },
  { key: 'import_export', name: 'Import/Export', category: 'security', isCore: true },
]

export function SuperAdminCustomPackage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()

  const [selected, setSelected] = useState<string[]>(ALL_SERVICES.filter(s => s.isCore).map(s => s.key))
  const [packageName, setPackageName] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const { data: company } = useQuery<Company>({
    queryKey: ['sa-company', id],
    queryFn: () => superAdminApi.get(`/super-admin/companies/${id}`).then(r => r.data.data),
    enabled: !!id,
  })

  const saveMut = useMutation({
    mutationFn: () => superAdminApi.post(`/super-admin/companies/${id}/custom-package`, {
      name: packageName,
      notes,
      services: selected,
    }),
    onSuccess: () => { success('Custom package applied'); setSaved(true) },
    onError: () => toastError('Failed to apply package'),
  })

  const grouped = ALL_SERVICES.reduce<Record<string, ServiceDef[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})

  const toggle = (key: string, isCore: boolean) => {
    if (isCore) return
    if (selected.includes(key)) setSelected(prev => prev.filter(k => k !== key))
    else setSelected(prev => [...prev, key])
  }

  if (saved) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h2 className="font-heading font-bold text-xl text-text-primary">Package Applied!</h2>
        <p className="text-text-secondary text-sm text-center max-w-md">
          The custom package has been configured for {company?.name}. The tenant admin has been notified.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/super-admin/companies')}>Back to Companies</Button>
          <Button onClick={() => { setSaved(false) }}>Edit Package</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button size="icon-sm" variant="ghost" onClick={() => navigate('/super-admin/companies')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Custom Package Builder</h1>
          <p className="text-text-secondary text-xs mt-0.5">{company?.name}</p>
        </div>
      </div>

      {/* Company info header */}
      {company && (
        <Card>
          <CardContent className="p-4 flex items-center gap-6">
            <div className="h-10 w-10 rounded-lg bg-brand-purple/15 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-brand-purple" />
            </div>
            <div className="flex-1 grid grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-text-muted">Company</p>
                <p className="font-medium text-text-primary">{company.name}</p>
              </div>
              <div>
                <p className="text-text-muted">Industry</p>
                <p className="font-medium text-text-primary">{company.industry || '—'}</p>
              </div>
              <div>
                <p className="text-text-muted">Current Plan</p>
                <p className="font-medium text-text-primary">{company.subscription?.plan?.name || '—'}</p>
              </div>
              <div>
                <p className="text-text-muted">Users / Leads</p>
                <p className="font-medium text-text-primary">{company._count.users} / {company._count.leads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Service selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Package Name</Label>
              <Input placeholder="e.g. Real Estate Pro" value={packageName} onChange={e => setPackageName(e.target.value)} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Internal notes..." value={notes} onChange={e => setNotes(e.target.value)} className="text-xs" />
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Select Services</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {Object.entries(grouped).map(([cat, svcs]) => (
                <div key={cat}>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">{CATEGORY_LABELS[cat] || cat}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {svcs.map(svc => (
                      <label
                        key={svc.key}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          selected.includes(svc.key)
                            ? 'border-brand-purple/60 bg-brand-purple/10'
                            : 'border-border hover:border-border-strong'
                        } ${svc.isCore ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(svc.key)}
                          onChange={() => toggle(svc.key, svc.isCore)}
                          disabled={svc.isCore}
                          className="accent-brand-purple"
                        />
                        <span className="flex-1">{svc.name}</span>
                        {svc.isCore && <Badge variant="secondary" className="text-[8px]">Core</Badge>}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Live preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Live Preview</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-text-muted mb-3">Tenant will see these services enabled:</p>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {ALL_SERVICES.filter(s => selected.includes(s.key)).map(s => (
                  <div key={s.key} className="flex items-center gap-2 text-xs p-1.5 rounded bg-bg-elevated">
                    <div className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                    <span className="text-text-primary">{s.name}</span>
                    <span className="text-text-muted ml-auto">{CATEGORY_LABELS[s.category] || s.category}</span>
                  </div>
                ))}
                {selected.length === 0 && <p className="text-xs text-text-muted text-center py-4">No services selected</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium text-text-primary">{selected.length} services selected</p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {ALL_SERVICES.filter(s => !selected.includes(s.key)).length} services disabled
                </p>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={() => saveMut.mutate()} loading={saveMut.isPending}>
            Save & Apply Package
          </Button>
          <p className="text-[10px] text-text-muted text-center">
            This will immediately enable/disable services and notify the tenant admin.
          </p>
        </div>
      </div>
    </div>
  )
}
