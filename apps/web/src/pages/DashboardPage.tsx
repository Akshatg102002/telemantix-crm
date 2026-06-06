import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Target, TrendingUp, Calendar, DollarSign, ArrowUpRight, Users, Zap, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { formatCurrency, relativeTime } from '../lib/utils'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

function KpiCard({ title, value, icon: Icon, change, gradient }: {
  title: string; value: string | number; icon: React.ElementType; change?: number; gradient?: string
}) {
  return (
    <motion.div variants={fadeUp}>
      <Card gradient className="h-full hover:shadow-card-hover transition-shadow duration-300">
        <CardContent className="flex items-start justify-between p-5">
          <div>
            <p className="text-text-secondary text-xs font-medium mb-1">{title}</p>
            <p className="font-heading font-bold text-2xl text-text-primary">{value}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-0.5 mt-2 text-xs font-medium ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                <ArrowUpRight className={`h-3 w-3 ${change < 0 ? 'rotate-90' : ''}`} />
                {Math.abs(change)}% vs last week
              </div>
            )}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${gradient || 'bg-brand-purple/15'}`}>
            <Icon className="h-5 w-5 text-brand-purple" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const COLORS = ['#7B2FBE', '#C43E8A', '#E8622A', '#22C55E', '#F59E0B', '#3B82F6']

interface ServiceStatusItem {
  key: string
  name: string
  effectiveEnabled: boolean
  isMaintenance: boolean
  maintenanceMsg: string | null
}

function SystemStatusWidget() {
  const { data: statusData } = useQuery({
    queryKey: ['dashboard-service-status'],
    queryFn: () => api.get('/dashboard/service-status').then(r => r.data.data),
    staleTime: 2 * 60 * 1000,
  })

  if (!statusData) return null

  const getIcon = (svc: ServiceStatusItem) => {
    if (!svc.effectiveEnabled) return <XCircle className="h-3 w-3 text-danger" />
    if (svc.isMaintenance) return <Clock className="h-3 w-3 text-warning" />
    return <CheckCircle className="h-3 w-3 text-success" />
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {statusData.hasIssues
            ? <AlertTriangle className="h-4 w-4 text-warning" />
            : <CheckCircle className="h-4 w-4 text-success" />}
          System Status
        </CardTitle>
        <Badge variant={statusData.hasIssues ? 'warning' : 'success'} className="text-[9px]">
          {statusData.summary}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {statusData.services?.map((svc: ServiceStatusItem) => (
            <div key={svc.key} className={`flex items-center gap-1.5 text-xs p-1.5 rounded-lg ${!svc.effectiveEnabled ? 'bg-danger/5' : svc.isMaintenance ? 'bg-warning/5' : 'bg-bg-elevated'}`}>
              {getIcon(svc)}
              <span className="text-text-secondary truncate">{svc.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then(r => r.data.data),
  })

  const { data: activity } = useQuery({
    queryKey: ['analytics', 'activity'],
    queryFn: () => api.get('/analytics/activity').then(r => r.data.data),
  })

  const kpis = [
    { title: 'Total Leads', value: overview?.totalLeads ?? 0, icon: Target, change: 12, gradient: 'bg-brand-purple/15' },
    { title: 'Converted Today', value: overview?.convertedToday ?? 0, icon: TrendingUp, change: 8, gradient: 'bg-success/15' },
    { title: 'Follow-ups Due', value: overview?.followUpsDue ?? 0, icon: Calendar, change: -3, gradient: 'bg-warning/15' },
    { title: 'Revenue Pipeline', value: overview?.revenuePipeline ? formatCurrency(overview.revenuePipeline) : '0', icon: DollarSign, change: 18, gradient: 'bg-brand-coral/15' },
  ]

  return (
    <div className="p-6 space-y-6">
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={stagger} initial="hidden" animate="show">
        {kpis.map(k => <KpiCard key={k.title} {...k} />)}
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card gradient>
            <CardHeader>
              <CardTitle className="text-sm">Lead Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview?.trend || []}>
                  <defs>
                    <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7B2FBE" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7B2FBE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#16161A', border: '1px solid #2A2A2F', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="leads" stroke="#7B2FBE" strokeWidth={2} fill="url(#leadGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card gradient className="h-full">
            <CardHeader>
              <CardTitle className="text-sm">Leads by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={overview?.sourceBreakdown || []} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                      {(overview?.sourceBreakdown || []).map((_: unknown, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#16161A', border: '1px solid #2A2A2F', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {(overview?.sourceBreakdown || []).slice(0, 4).map((s: { source: string; count: number }, i: number) => (
                  <div key={s.source} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-text-secondary">{s.source}</span>
                    </div>
                    <span className="text-text-primary font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand-coral" /> Live Activity
            </CardTitle>
            <Badge variant="success" className="text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-slow mr-1 inline-block" />
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(activity || []).map((a: { id: string; event: string; lead?: { name: string }; user?: { name: string }; createdAt: string }) => (
                <div key={a.id} className="flex items-start gap-3 text-xs animate-fade-in">
                  <div className="h-6 w-6 rounded-full bg-brand-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="h-3 w-3 text-brand-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-text-primary font-medium">{a.user?.name || 'System'}</span>
                    <span className="text-text-secondary"> {a.event} </span>
                    {a.lead && <span className="text-brand-purple">{a.lead.name}</span>}
                  </div>
                  <span className="text-text-muted shrink-0">{relativeTime(a.createdAt)}</span>
                </div>
              ))}
              {!activity?.length && (
                <p className="text-text-muted text-xs text-center py-6">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <SystemStatusWidget />
      </motion.div>
    </div>
  )
}
