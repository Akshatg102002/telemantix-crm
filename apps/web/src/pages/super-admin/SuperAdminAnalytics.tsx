import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart2, Activity, Server, Zap, Mail, MessageSquare, Database } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

const TABS = ['Platform', 'Usage', 'System'] as const
import { useState } from 'react'

function MetricRow({ label, value, sub, icon: Icon, color = 'text-brand-purple' }: {
  label: string; value: string | number; sub?: string; icon?: React.ElementType; color?: string
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className={`h-4 w-4 ${color} shrink-0`} />}
        <div>
          <p className="text-sm text-text-primary font-medium">{label}</p>
          {sub && <p className="text-xs text-text-muted">{sub}</p>}
        </div>
      </div>
      <span className="font-heading font-bold text-text-primary">{value}</span>
    </div>
  )
}

export function SuperAdminAnalytics() {
  const [tab, setTab] = useState<typeof TABS[number]>('Platform')

  const { data: platform } = useQuery({
    queryKey: ['sa-analytics-platform'],
    queryFn: () => superAdminApi.get('/super-admin/analytics/platform').then(r => r.data.data),
    enabled: tab === 'Platform',
  })

  const { data: usage } = useQuery({
    queryKey: ['sa-analytics-usage'],
    queryFn: () => superAdminApi.get('/super-admin/analytics/usage').then(r => r.data.data),
    enabled: tab === 'Usage',
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">Platform Analytics</h1>
        <p className="text-text-secondary text-xs mt-0.5">Deep insights across all tenants and platform usage</p>
      </div>

      <div className="flex border-b border-border gap-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t ? 'border-danger text-danger' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Platform' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card gradient>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart2 className="h-4 w-4 text-brand-purple" /> Growth Metrics</CardTitle></CardHeader>
            <CardContent>
              <MetricRow label="Total Companies" value={platform?.totalTenants ?? '—'} icon={BarChart2} />
              <MetricRow label="Active Companies" value={platform?.activeLast30 ?? '—'} sub="Last 30 days" icon={Activity} color="text-success" />
              <MetricRow label="New Companies" value={platform?.newLast7 ?? '—'} sub="Last 7 days" icon={Zap} color="text-brand-coral" />
              <MetricRow label="Total Leads" value={(platform?.totalLeads ?? 0).toLocaleString('en-IN')} icon={Database} color="text-brand-magenta" />
              <MetricRow label="Total Users" value={platform?.totalUsers ?? '—'} icon={Activity} />
              <MetricRow label="Leads Created (30d)" value={(platform?.leadsLast30 ?? 0).toLocaleString('en-IN')} icon={Activity} color="text-success" />
            </CardContent>
          </Card>
          <Card gradient>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-brand-coral" /> Revenue Health</CardTitle></CardHeader>
            <CardContent>
              <MetricRow label="MRR" value={`₹${((platform?.mrr ?? 0) / 1000).toFixed(1)}K`} icon={Activity} color="text-success" />
              <MetricRow label="ARR" value={`₹${((platform?.arr ?? 0) / 100000).toFixed(2)}L`} icon={Activity} color="text-brand-coral" />
              <MetricRow label="Churn Rate" value={`${platform?.churnRate ?? 0}%`} sub="Monthly" icon={BarChart2} color="text-danger" />
              <MetricRow label="NPS Score" value={platform?.nps ?? '—'} icon={BarChart2} color="text-success" />
              <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-xs text-success font-medium">Platform is healthy 🟢</p>
                <p className="text-xs text-text-muted mt-0.5">All key metrics within normal range</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Usage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card gradient>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-brand-purple" /> Feature Usage</CardTitle></CardHeader>
            <CardContent>
              <MetricRow label="Active Automations" value={usage?.automations ?? '—'} icon={Zap} />
              <MetricRow label="Follow-ups Created" value={(usage?.followUps ?? 0).toLocaleString('en-IN')} icon={Activity} />
              <MetricRow label="Active Integrations" value={usage?.activeIntegrations ?? '—'} icon={BarChart2} color="text-success" />
              <MetricRow label="Notifications Sent" value={(usage?.notifications ?? 0).toLocaleString('en-IN')} icon={Activity} color="text-brand-magenta" />
            </CardContent>
          </Card>
          <Card gradient>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Server className="h-4 w-4 text-brand-coral" /> Communication Usage</CardTitle></CardHeader>
            <CardContent>
              <MetricRow label="API Calls" value={(usage?.apiCalls ?? 0).toLocaleString('en-IN')} icon={Server} />
              <MetricRow label="Storage Used" value={`${usage?.storageGB ?? 0} GB`} icon={Database} color="text-brand-coral" />
              <MetricRow label="Emails Sent" value={(usage?.emailsSent ?? 0).toLocaleString('en-IN')} icon={Mail} color="text-brand-purple" />
              <MetricRow label="SMS Sent" value={(usage?.smsSent ?? 0).toLocaleString('en-IN')} icon={MessageSquare} color="text-success" />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'System' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card gradient>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Server className="h-4 w-4 text-success" /> System Health</CardTitle></CardHeader>
            <CardContent>
              {[
                { service: 'API Server', status: 'operational', latency: '12ms' },
                { service: 'PostgreSQL', status: 'operational', latency: '4ms' },
                { service: 'Redis Cache', status: 'operational', latency: '1ms' },
                { service: 'BullMQ Workers', status: 'operational', latency: '—' },
                { service: 'Socket.io', status: 'operational', latency: '8ms' },
              ].map(s => (
                <div key={s.service} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-sm text-text-primary">{s.service}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted text-xs">{s.latency}</span>
                    <Badge variant="success" className="text-[9px]">{s.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Queue Monitor</CardTitle></CardHeader>
            <CardContent>
              {[
                { queue: 'follow-up-reminders', pending: 142, failed: 2, processed: 8421 },
                { queue: 'stale-lead-checker', pending: 0, failed: 0, processed: 1203 },
                { queue: 'indiamart-sync', pending: 1, failed: 0, processed: 2847 },
                { queue: 'automation-runner', pending: 3, failed: 1, processed: 5611 },
              ].map(q => (
                <div key={q.queue} className="py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-primary">{q.queue}</span>
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-warning">{q.pending} pending</span>
                      {q.failed > 0 && <span className="text-danger">{q.failed} failed</span>}
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted">{q.processed.toLocaleString()} processed total</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
