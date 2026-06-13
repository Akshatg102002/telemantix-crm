import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle, Clock, Copy, Mail, PlugZap, RefreshCw, Settings, TestTube2, XCircle } from 'lucide-react'
import { BRAND_ICONS } from '../assets/brands'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIntegrations } from '../hooks/useApi'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/toast'
import { api } from '../lib/api'
import { relativeTime } from '../lib/utils'
import { useServiceEnabled } from '../hooks/useServiceEnabled'
import { ServiceDisabledPlaceholder } from '../components/ui/ServiceDisabledPlaceholder'

interface Integration {
  id: string
  type: string
  name: string
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SYNCING'
  isConnected: boolean
  config: Record<string, string>
  webhookToken?: string
  webhookUrl?: string
  lastSyncAt?: string
  lastError?: string
  importedLeadCount: number
}

const INTEGRATIONS_CONFIG = [
  { type: 'meta', name: 'Meta Facebook Lead Ads', desc: 'Lead Ads sync and webhooks', color: '#1877F2', configFields: [{ key: 'pageId', label: 'Page ID', type: 'text' }, { key: 'formId', label: 'Lead Form ID', type: 'text' }], credentialFields: [{ key: 'accessToken', label: 'Access Token', type: 'password' }] },
  { type: 'whatsapp', name: 'WhatsApp Cloud API', desc: 'Inbound messages and WABA health', color: '#25D366', configFields: [{ key: 'phoneNumberId', label: 'Phone Number ID', type: 'text' }, { key: 'businessAccountId', label: 'Business Account ID', type: 'text' }], credentialFields: [{ key: 'accessToken', label: 'API Token', type: 'password' }] },
  { type: 'exotel', name: 'Exotel IVR', desc: 'IVR/call leads and call sync', color: '#FF6B35', configFields: [{ key: 'sid', label: 'Account SID', type: 'text' }, { key: 'subdomain', label: 'API Host', type: 'text' }, { key: 'callerId', label: 'Caller ID', type: 'text' }], credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password' }, { key: 'apiToken', label: 'API Token', type: 'password' }] },
  { type: 'sendgrid', name: 'SendGrid', desc: 'Email delivery account', color: '#1A82E2', configFields: [{ key: 'fromEmail', label: 'From Email', type: 'email' }], credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password' }] },
  { type: 'resend', name: 'Resend', desc: 'Email delivery account', color: '#111827', configFields: [{ key: 'fromEmail', label: 'From Email', type: 'email' }], credentialFields: [{ key: 'apiKey', label: 'API Key', type: 'password' }] },
  { type: 'google_ads', name: 'Google Ads', desc: 'Lead form extension sync', color: '#4285F4', configFields: [{ key: 'customerId', label: 'Customer ID', type: 'text' }, { key: 'loginCustomerId', label: 'Login Customer ID', type: 'text' }], credentialFields: [{ key: 'clientId', label: 'Client ID', type: 'text' }, { key: 'clientSecret', label: 'Client Secret', type: 'password' }, { key: 'refreshToken', label: 'Refresh Token', type: 'password' }, { key: 'developerToken', label: 'Developer Token', type: 'password' }] },
  { type: 'indiamart', name: 'IndiaMART', desc: 'Auto-pull leads and webhooks', color: '#F4A026', configFields: [{ key: 'mobileNo', label: 'Mobile No', type: 'text' }], credentialFields: [{ key: 'apiKey', label: 'CRM Key', type: 'password' }] },
  { type: 'justdial', name: 'JustDial', desc: 'Webhook lead intake', color: '#FF5722', configFields: [], credentialFields: [] },
  { type: '99acres', name: '99acres', desc: 'Webhook lead intake', color: '#E91E63', configFields: [], credentialFields: [] },
  { type: 'housing', name: 'Housing.com', desc: 'Webhook lead intake', color: '#2196F3', configFields: [], credentialFields: [] },
]

const statusTone: Record<Integration['status'], string> = {
  CONNECTED: 'success',
  DISCONNECTED: 'secondary',
  ERROR: 'danger',
  SYNCING: 'warning',
}

export function IntegrationsPage() {
  const metaAdsEnabled = useServiceEnabled('meta_ads')
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const { data: integrations } = useIntegrations()
  const [configuring, setConfiguring] = useState<typeof INTEGRATIONS_CONFIG[0] | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({})
  const [testEmailOpen, setTestEmailOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')

  const getIntegration = (type: string): Integration | undefined => (integrations || []).find((i: Integration) => i.type === type)

  const connectMutation = useMutation({
    mutationFn: async (type: string) => api.post(`/integrations/${type}/connect`, { config: configValues, credentials: credentialValues }),
    onSuccess: () => { success('Integration connected'); setConfiguring(null); setConfigValues({}); setCredentialValues({}); qc.invalidateQueries({ queryKey: ['integrations'] }) },
    onError: () => toastError('Failed to connect integration'),
  })

  const testMutation = useMutation({
    mutationFn: async (type: string) => api.post(`/integrations/${type}/test`, {}),
    onSuccess: () => { success('Connection test passed'); qc.invalidateQueries({ queryKey: ['integrations'] }) },
    onError: () => { toastError('Connection test failed'); qc.invalidateQueries({ queryKey: ['integrations'] }) },
  })

  const disconnectMutation = useMutation({
    mutationFn: async (type: string) => api.post(`/integrations/${type}/disconnect`, {}),
    onSuccess: () => { success('Integration disconnected'); qc.invalidateQueries({ queryKey: ['integrations'] }) },
    onError: () => toastError('Failed to disconnect integration'),
  })

  const syncMutation = useMutation({
    mutationFn: async (type: string) => api.post(`/integrations/${type}/sync`, {}),
    onSuccess: () => { success('Sync job queued'); qc.invalidateQueries({ queryKey: ['integrations'] }) },
    onError: () => toastError('Failed to queue sync'),
  })

  const sendTestEmailMutation = useMutation({
    mutationFn: async () => api.post('/integrations/resend/send-test', { email: testEmail }),
    onSuccess: () => { success('Test email sent'); setTestEmailOpen(false); setTestEmail('') },
    onError: (err: any) => toastError(err?.response?.data?.error?.message || 'Failed to send test email'),
  })

  const openConfig = (cfg: typeof INTEGRATIONS_CONFIG[0], existing?: Integration) => {
    setConfiguring(cfg)
    setConfigValues(existing?.config || {})
    setCredentialValues({})
  }

  const copyWebhookUrl = (url?: string) => {
    if (!url) return toastError('Connect this integration first')
    navigator.clipboard.writeText(url)
    success('Webhook URL copied')
  }

  if (!metaAdsEnabled) return <ServiceDisabledPlaceholder serviceName="Integrations" />

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="font-heading font-semibold text-text-primary">Production Integrations</h2>
        <p className="text-text-secondary text-xs mt-0.5">Connect lead sources, test real provider APIs, and monitor tenant-aware sync health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {INTEGRATIONS_CONFIG.map((cfg, i) => {
          const integration = getIntegration(cfg.type)
          const status = integration?.status || 'DISCONNECTED'
          const Icon = BRAND_ICONS[cfg.type]
          return (
            <motion.div key={cfg.type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card gradient={status === 'CONNECTED'} className="h-full hover:shadow-card-hover transition-all duration-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-bg-elevated border border-border">
                        {Icon ? <Icon size={28} /> : <div className="text-white font-bold text-sm w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: cfg.color }}>{cfg.name[0]}</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{cfg.name}</p>
                        <p className="text-xs text-text-secondary">{cfg.desc}</p>
                      </div>
                    </div>
                    <Badge variant={statusTone[status] as never} className="gap-1">
                      {status === 'CONNECTED' ? <CheckCircle className="h-3 w-3" /> : status === 'ERROR' ? <AlertCircle className="h-3 w-3" /> : status === 'SYNCING' ? <RefreshCw className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-bg-elevated border border-border p-2">
                      <p className="text-text-muted">Last sync</p>
                      <p className="text-text-primary flex items-center gap-1"><Clock className="h-3 w-3" />{integration?.lastSyncAt ? relativeTime(integration.lastSyncAt) : 'Never'}</p>
                    </div>
                    <div className="rounded-lg bg-bg-elevated border border-border p-2">
                      <p className="text-text-muted">Imported leads</p>
                      <p className="text-text-primary font-medium">{integration?.importedLeadCount || 0}</p>
                    </div>
                  </div>

                  {integration?.lastError && <p className="rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">{integration.lastError}</p>}

                  {integration?.webhookUrl && (
                    <div className="space-y-1">
                      <Label>Webhook URL</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={integration.webhookUrl} className="font-mono text-[11px]" />
                        <Button size="sm" variant="secondary" onClick={() => copyWebhookUrl(integration.webhookUrl)}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openConfig(cfg, integration)}><Settings className="h-3.5 w-3.5" /> Configure</Button>
                    <Button size="sm" variant="secondary" disabled={!integration} loading={testMutation.isPending} onClick={() => testMutation.mutate(cfg.type)}><TestTube2 className="h-3.5 w-3.5" /> Test</Button>
                    <Button size="sm" variant="secondary" disabled={!integration?.isConnected} loading={syncMutation.isPending} onClick={() => syncMutation.mutate(cfg.type)}><RefreshCw className="h-3.5 w-3.5" /> Sync</Button>
                    {cfg.type === 'resend' && <Button size="sm" variant="secondary" disabled={!integration?.isConnected} onClick={() => setTestEmailOpen(true)}><Mail className="h-3.5 w-3.5" /> Send Test Email</Button>}
                    {integration?.isConnected && <Button size="sm" variant="ghost" loading={disconnectMutation.isPending} onClick={() => disconnectMutation.mutate(cfg.type)}>Disconnect</Button>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Send Resend Test Email</DialogTitle></DialogHeader>
          <div className="p-6 space-y-1.5">
            <Label>Recipient email</Label>
            <Input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTestEmailOpen(false)}>Cancel</Button>
            <Button loading={sendTestEmailMutation.isPending} onClick={() => sendTestEmailMutation.mutate()}>Send Test Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!configuring} onOpenChange={v => !v && setConfiguring(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PlugZap className="h-4 w-4" /> Configure {configuring?.name}</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            {configuring?.configFields.map(field => <div key={field.key} className="space-y-1.5"><Label>{field.label}</Label><Input type={field.type as 'text' | 'password' | 'email'} value={configValues[field.key] || ''} onChange={e => setConfigValues(v => ({ ...v, [field.key]: e.target.value }))} /></div>)}
            {configuring?.credentialFields.map(field => <div key={field.key} className="space-y-1.5"><Label>{field.label}</Label><Input type={field.type as 'text' | 'password' | 'email'} placeholder="Stored encrypted after connect" value={credentialValues[field.key] || ''} onChange={e => setCredentialValues(v => ({ ...v, [field.key]: e.target.value }))} /></div>)}
            {configuring && configuring.configFields.length === 0 && configuring.credentialFields.length === 0 && <p className="text-sm text-text-secondary">This portal is webhook-only. Activate it to generate a tenant-scoped webhook URL.</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfiguring(null)}>Cancel</Button>
            <Button onClick={() => configuring && connectMutation.mutate(configuring.type)} loading={connectMutation.isPending}>Save & Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
