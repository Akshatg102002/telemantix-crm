import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Settings, ExternalLink, Copy } from 'lucide-react'
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

interface Integration {
  id: string
  type: string
  name: string
  isConnected: boolean
  config: Record<string, string>
  webhookToken?: string
  lastSyncAt?: string
}

const INTEGRATIONS_CONFIG = [
  { type: 'meta', name: 'Meta (Facebook & Instagram)', desc: 'Lead Ads, CAPI, OAuth', color: '#1877F2', configFields: [{ key: 'accessToken', label: 'Access Token', type: 'password' }, { key: 'pixelId', label: 'Pixel ID', type: 'text' }] },
  { type: 'whatsapp', name: 'WhatsApp Cloud API', desc: 'WABA messaging, templates', color: '#25D366', configFields: [{ key: 'phoneNumberId', label: 'Phone Number ID', type: 'text' }, { key: 'accessToken', label: 'API Token', type: 'password' }] },
  { type: 'exotel', name: 'Exotel IVR', desc: 'Click-to-call, call logs', color: '#FF6B35', configFields: [{ key: 'apiKey', label: 'API Key', type: 'password' }, { key: 'apiToken', label: 'API Token', type: 'password' }, { key: 'sid', label: 'Account SID', type: 'text' }] },
  { type: 'sendgrid', name: 'SendGrid / Resend', desc: 'Email delivery & templates', color: '#1A82E2', configFields: [{ key: 'apiKey', label: 'API Key', type: 'password' }, { key: 'fromEmail', label: 'From Email', type: 'email' }] },
  { type: 'google_ads', name: 'Google Ads', desc: 'Lead Form Extensions', color: '#4285F4', configFields: [{ key: 'clientId', label: 'Client ID', type: 'text' }, { key: 'refreshToken', label: 'Refresh Token', type: 'password' }] },
  { type: 'indiamart', name: 'IndiaMART', desc: 'Auto-pull leads every 15min', color: '#F4A026', configFields: [{ key: 'apiKey', label: 'API Key', type: 'password' }, { key: 'mobileNo', label: 'Mobile No', type: 'text' }] },
  { type: 'justdial', name: 'JustDial', desc: 'Webhook lead intake', color: '#FF5722', configFields: [] },
  { type: '99acres', name: '99acres', desc: 'Webhook lead intake', color: '#E91E63', configFields: [] },
  { type: 'housing', name: 'Housing.com', desc: 'Webhook lead intake', color: '#2196F3', configFields: [] },
  { type: 'tradeindia', name: 'TradeIndia', desc: 'Webhook lead intake', color: '#FF9800', configFields: [] },
]

export function IntegrationsPage() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const { data: integrations } = useIntegrations()
  const [configuring, setConfiguring] = useState<typeof INTEGRATIONS_CONFIG[0] | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})

  const getIntegration = (type: string): Integration | undefined =>
    (integrations || []).find((i: Integration) => i.type === type)

  const saveMutation = useMutation({
    mutationFn: async (type: string) => {
      const existing = getIntegration(type)
      if (existing) {
        return api.patch(`/integrations/${existing.id}`, { config: configValues, isConnected: true })
      }
      return api.post('/integrations', { type, config: configValues })
    },
    onSuccess: () => {
      success('Integration saved')
      setConfiguring(null)
      qc.invalidateQueries({ queryKey: ['integrations'] })
    },
    onError: () => toastError('Failed to save integration'),
  })

  const copyWebhookUrl = (token: string) => {
    const url = `${window.location.origin.replace('5173', '4000')}/api/webhooks/inbound/${token}`
    navigator.clipboard.writeText(url)
    success('Webhook URL copied!')
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="font-heading font-semibold text-text-primary">Integrations</h2>
        <p className="text-text-secondary text-xs mt-0.5">Connect your lead sources and communication tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {INTEGRATIONS_CONFIG.map((cfg, i) => {
          const connected = getIntegration(cfg.type)
          const isWebhookBased = cfg.configFields.length === 0

          return (
            <motion.div key={cfg.type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card gradient={!!connected?.isConnected} className="h-full hover:shadow-card-hover transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: cfg.color }}>
                        {cfg.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{cfg.name}</p>
                        <p className="text-xs text-text-muted">{cfg.desc}</p>
                      </div>
                    </div>
                    {connected?.isConnected ? (
                      <CheckCircle className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-text-muted shrink-0" />
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant={connected?.isConnected ? 'success' : 'secondary'} className="text-[9px]">
                      {connected?.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                    {connected?.lastSyncAt && (
                      <span className="text-[10px] text-text-muted">Last sync: {relativeTime(connected.lastSyncAt)}</span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 text-xs"
                      onClick={() => {
                        setConfiguring(cfg)
                        setConfigValues(connected?.config || {})
                      }}
                    >
                      <Settings className="h-3 w-3" />
                      {isWebhookBased ? 'View Webhook' : 'Configure'}
                    </Button>
                    {isWebhookBased && connected?.webhookToken && (
                      <Button size="sm" variant="ghost" onClick={() => copyWebhookUrl(connected.webhookToken!)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Config Dialog */}
      <Dialog open={!!configuring} onOpenChange={v => !v && setConfiguring(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {configuring?.name}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {configuring?.configFields.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">This integration uses an inbound webhook URL.</p>
                <div className="space-y-1.5">
                  <Label>Your Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin.replace('5173', '4000')}/api/webhooks/inbound/{tenantId}/{token}`}
                      className="font-mono text-xs"
                    />
                    <Button size="sm" variant="secondary" onClick={() => success('Activate integration first to get URL')}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-text-muted">Paste this URL in the {configuring.name} portal to receive leads automatically.</p>
                </div>
              </div>
            ) : (
              configuring?.configFields.map(field => (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  <Input
                    type={field.type as 'text' | 'password' | 'email'}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={configValues[field.key] || ''}
                    onChange={e => setConfigValues(v => ({ ...v, [field.key]: e.target.value }))}
                  />
                </div>
              ))
            )}
            {configuring?.type === 'meta' && (
              <Button variant="secondary" size="sm" className="w-full gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Connect with Meta OAuth
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfiguring(null)}>Cancel</Button>
            {configuring?.configFields.length ? (
              <Button onClick={() => saveMutation.mutate(configuring!.type)} loading={saveMutation.isPending}>
                Save & Connect
              </Button>
            ) : (
              <Button onClick={() => { saveMutation.mutate(configuring!.type) }} loading={saveMutation.isPending}>
                Activate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
