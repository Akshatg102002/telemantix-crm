import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, X, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { formatDate } from '../lib/utils'

const featureMatrix = [
  { category: 'CRM Core', features: [
    { key: 'leads', label: 'Lead Management' },
    { key: 'pipeline', label: 'Pipeline / Kanban' },
    { key: 'contacts', label: 'People & Contacts' },
    { key: 'follow_ups', label: 'Follow-up System' },
    { key: 'tasks', label: 'Task Management' },
  ]},
  { category: 'Marketing', features: [
    { key: 'whatsapp_campaigns', label: 'WhatsApp Campaigns' },
    { key: 'whatsapp_inbox', label: 'WhatsApp Inbox' },
    { key: 'broadcast', label: 'Broadcast & Bulk Message' },
    { key: 'email', label: 'Email Campaigns' },
  ]},
  { category: 'Automation', features: [
    { key: 'automation_engine', label: 'Automation Engine' },
    { key: 'chatbots', label: 'WhatsApp Chatbots' },
    { key: 'scheduled_automation', label: 'Scheduled Automations' },
  ]},
  { category: 'Integrations', features: [
    { key: 'meta_integration', label: 'Meta Lead Ads' },
    { key: 'google_ads', label: 'Google Ads' },
    { key: 'ivr_dialer', label: 'IVR & Dialer (Exotel)' },
    { key: 'indiamart', label: 'IndiaMART' },
    { key: 'justdial', label: 'JustDial' },
  ]},
  { category: 'Analytics', features: [
    { key: 'basic_analytics', label: 'Basic Analytics' },
    { key: 'advanced_analytics', label: 'Advanced Analytics' },
    { key: 'call_insights', label: 'Call Insights' },
    { key: 'ai_insights', label: 'AI Reporting Insights' },
  ]},
  { category: 'Platform', features: [
    { key: 'api_access', label: 'API Access' },
    { key: 'webhooks', label: 'Webhooks' },
    { key: 'custom_fields', label: 'Custom Fields' },
    { key: 'service_boards', label: 'Service Boards' },
    { key: 'publishers', label: 'Publisher Portal' },
  ]},
]

// Feature availability by plan
const planFeatures: Record<string, string[]> = {
  starter: ['leads', 'pipeline', 'follow_ups', 'tasks', 'basic_analytics', 'custom_fields', 'service_boards'],
  growth: ['leads', 'pipeline', 'contacts', 'follow_ups', 'tasks', 'whatsapp_campaigns', 'whatsapp_inbox', 'broadcast',
    'email', 'automation_engine', 'meta_integration', 'google_ads', 'ivr_dialer', 'indiamart', 'justdial',
    'basic_analytics', 'advanced_analytics', 'call_insights', 'api_access', 'webhooks', 'custom_fields',
    'service_boards', 'publishers'],
  enterprise: [...Object.values(featureMatrix).flatMap(c => c.features.map(f => f.key))],
}

export function FeatureAccessPage() {
  const { data: billing } = useQuery({
    queryKey: ['billing'],
    queryFn: () => api.get('/settings/billing').then(r => r.data.data),
  })

  const sub = billing?.subscription
  const usage = billing?.usage
  const planSlug = sub?.plan?.name?.toLowerCase() || 'starter'
  const enabledFeatures = planFeatures[planSlug] || planFeatures.starter
  const trialDaysLeft = sub ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000)) : 0

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">Feature Access</h1>
        <p className="text-text-secondary text-xs mt-0.5">Your current plan, limits, and enabled modules</p>
      </div>

      {/* Current plan card */}
      {sub && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card gradient>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-heading font-bold text-xl text-text-primary">{sub.plan.name} Plan</h2>
                    <Badge variant={sub.status === 'active' ? 'success' : sub.status === 'trial' ? 'warning' : 'secondary'} className="capitalize">
                      {sub.status}
                    </Badge>
                    {sub.status === 'trial' && trialDaysLeft <= 7 && (
                      <Badge variant="danger" className="text-[9px] flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" /> {trialDaysLeft}d left
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-6 text-sm text-text-secondary mt-2">
                    <div>
                      <span className="text-text-muted text-xs">Renews</span>
                      <p className="text-text-primary">{formatDate(sub.currentPeriodEnd)}</p>
                    </div>
                    <div>
                      <span className="text-text-muted text-xs">Billing</span>
                      <p className="text-text-primary capitalize">{sub.billingCycle}</p>
                    </div>
                    <div>
                      <span className="text-text-muted text-xs">Price</span>
                      <p className="text-text-primary">₹{sub.plan.price.toLocaleString('en-IN')}/user/mo</p>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => window.location.href = '/billing'}>
                  Manage Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Usage meters */}
      {usage && sub && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader><CardTitle className="text-sm">Usage & Limits</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Users', used: usage.users, max: sub.plan.maxUsers },
                { label: 'Leads', used: usage.leads, max: sub.plan.maxLeads },
              ].map(m => {
                const pct = m.max === -1 ? 0 : Math.min((m.used / m.max) * 100, 100)
                return (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-text-secondary font-medium">{m.label}</span>
                      <span className={`font-medium ${pct > 90 ? 'text-danger' : pct > 70 ? 'text-warning' : 'text-text-primary'}`}>
                        {m.used.toLocaleString('en-IN')} / {m.max === -1 ? 'Unlimited' : m.max.toLocaleString('en-IN')}
                      </span>
                    </div>
                    {m.max !== -1 && (
                      <div className="h-2.5 rounded-full bg-bg-elevated overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full ${pct > 90 ? 'bg-danger' : pct > 70 ? 'bg-warning' : 'bg-brand-gradient'}`}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Feature matrix */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="font-heading font-semibold text-text-primary mb-4">Enabled Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featureMatrix.map(cat => (
            <Card key={cat.category}>
              <CardHeader><CardTitle className="text-xs text-text-muted uppercase tracking-wider">{cat.category}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {cat.features.map(f => {
                  const enabled = enabledFeatures.includes(f.key)
                  return (
                    <div key={f.key} className="flex items-center justify-between text-sm">
                      <span className={enabled ? 'text-text-primary' : 'text-text-muted'}>{f.label}</span>
                      {enabled
                        ? <Check className="h-4 w-4 text-success" />
                        : <X className="h-4 w-4 text-text-muted" />
                      }
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
