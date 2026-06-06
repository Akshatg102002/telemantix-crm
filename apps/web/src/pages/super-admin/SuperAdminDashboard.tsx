import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Building2, TrendingUp, DollarSign, Target, UserPlus, UserMinus,
  AlertCircle, Activity, Users, Package
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { formatDate } from '../../lib/utils'

const COLORS = ['#7B2FBE', '#C43E8A', '#E8622A', '#22C55E', '#F59E0B', '#3B82F6']

interface Stats {
  totalTenants: number
  activeSubs: number
  trialSubs: number
  suspendedSubs: number
  totalLeads: number
  newThisMonth: number
  churnedThisMonth: number
  mrr: number
  arr: number
  churnRate: string
  mrrTrend: { month: string; mrr: number }[]
  signupTrend: { month: string; count: number }[]
  planDist: { name: string; count: number }[]
  topCompanies: { name: string; count: number }[]
  recentActivity: Array<{
    id: string; name: string; createdAt: string
    subscription?: { status: string; plan: { name: string } }
    _count: { users: number; leads: number }
  }>
}

const statusV = { active: 'success', trial: 'warning', suspended: 'danger', cancelled: 'secondary' } as const

function KpiCard({ title, value, sub, icon: Icon, color = '#7B2FBE', bgColor = 'rgba(123,47,190,0.12)' }: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color?: string; bgColor?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card gradient className="h-full">
        <CardContent className="p-5 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-text-secondary text-xs font-medium mb-1 truncate">{title}</p>
            <p className="font-heading font-bold text-2xl text-text-primary">{value}</p>
            {sub && <p className="text-text-muted text-xs mt-1">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ml-3" style={{ backgroundColor: bgColor }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-surface border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-text-primary font-medium">
          {p.name === 'mrr' ? `₹${p.value.toLocaleString('en-IN')}` : p.value}
        </p>
      ))}
    </div>
  )
}

export function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { data: pendingPackages = [] } = useQuery<Array<{ id: string; tenantId: string; createdAt: string; tenant: { id: string; name: string } }>>({
    queryKey: ['sa-pending-packages'],
    queryFn: () => superAdminApi.get('/super-admin/custom-packages/pending').then(r => r.data.data),
    refetchInterval: 60000,
  })

  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ['sa-stats'],
    queryFn: () => superAdminApi.get('/super-admin/stats').then(r => r.data.data),
    refetchInterval: 60000,
    retry: 2,
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <div className="h-6 w-48 bg-bg-elevated rounded-lg animate-pulse mb-1" />
          <div className="h-3 w-64 bg-bg-elevated rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 bg-bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-danger mx-auto mb-3" />
          <p className="text-text-primary font-medium">Failed to load dashboard</p>
          <p className="text-text-muted text-sm mt-1">
            {error instanceof Error ? error.message : 'Check your super admin token and API connection'}
          </p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-text-primary">Master Dashboard</h1>
        <p className="text-text-secondary text-xs mt-0.5">Platform-wide metrics across all {stats.totalTenants} organizations</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Total Companies" value={stats.totalTenants} icon={Building2} />
        <KpiCard title="Active Subs" value={stats.activeSubs} icon={TrendingUp} color="#22C55E" bgColor="rgba(34,197,94,0.12)" />
        <KpiCard
          title="MRR" value={`₹${(stats.mrr / 1000).toFixed(0)}K`}
          sub={`ARR ₹${(stats.arr / 100000).toFixed(1)}L`}
          icon={DollarSign} color="#E8622A" bgColor="rgba(232,98,42,0.12)"
        />
        <KpiCard title="Total Leads" value={stats.totalLeads.toLocaleString('en-IN')} icon={Target} color="#C43E8A" bgColor="rgba(196,62,138,0.12)" />
        <KpiCard title="New This Month" value={stats.newThisMonth} icon={UserPlus} color="#22C55E" bgColor="rgba(34,197,94,0.12)" />
        <KpiCard title="Churned" value={stats.churnedThisMonth} sub={`${stats.churnRate}% rate`} icon={UserMinus} color="#EF4444" bgColor="rgba(239,68,68,0.12)" />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active', value: stats.activeSubs, color: '#22C55E' },
          { label: 'Trial', value: stats.trialSubs, color: '#F59E0B' },
          { label: 'Suspended', value: stats.suspendedSubs, color: '#EF4444' },
          { label: 'Plans', value: stats.planDist.reduce((s, p) => s + p.count, 0), color: '#7B2FBE' },
        ].map(s => (
          <div key={s.label} className="bg-bg-surface border border-border rounded-xl p-3 text-center">
            <p className="font-heading font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
            <p className="text-text-muted text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card gradient>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-brand-purple" /> MRR Trend (12 months)</CardTitle></CardHeader>
          <CardContent className="h-56">
            {stats.mrrTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.mrrTrend}>
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="mrr" stroke="#7B2FBE" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#7B2FBE' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">No MRR data yet</div>
            )}
          </CardContent>
        </Card>

        <Card gradient>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><UserPlus className="h-4 w-4 text-brand-magenta" /> New Signups per Month</CardTitle></CardHeader>
          <CardContent className="h-56">
            {stats.signupTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.signupTrend}>
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" fill="#C43E8A" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">No signup data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Plan Distribution</CardTitle></CardHeader>
          <CardContent>
            {stats.planDist?.length > 0 ? (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.planDist} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3}>
                        {stats.planDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {stats.planDist.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <div className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {p.name} ({p.count})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-text-muted text-sm">No plan data</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Top 10 Companies by Leads</CardTitle></CardHeader>
          <CardContent className="h-60">
            {stats.topCompanies?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topCompanies} layout="vertical">
                  <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" fill="#E8622A" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    <LabelList dataKey="count" position="right" style={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">No company data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Custom Package Requests */}
      {pendingPackages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-coral" />
              Pending Custom Package Requests
              <Badge variant="coral" className="text-[9px] ml-auto">{pendingPackages.length} pending</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingPackages.map(pkg => (
                <div key={pkg.id} className="flex items-center gap-3 text-xs py-2 border-b border-border/50 last:border-0">
                  <div className="h-7 w-7 rounded-lg bg-brand-coral/15 flex items-center justify-center text-brand-coral font-bold text-[10px] shrink-0">
                    {pkg.tenant.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium truncate">{pkg.tenant.name}</p>
                    <p className="text-text-muted">Requested {formatDate(pkg.createdAt)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/super-admin/companies/${pkg.tenant.id}/custom-package`)}
                  >
                    Configure
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      {stats.recentActivity?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-brand-purple" /> Recent Signups</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.recentActivity.slice(0, 15).map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 text-xs py-1.5 border-b border-border/50 last:border-0">
                  <div className="h-7 w-7 rounded-lg bg-brand-gradient flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                    {t.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium truncate">{t.name}</p>
                    <p className="text-text-muted">{t._count.users} users · {t._count.leads} leads</p>
                  </div>
                  {t.subscription && (
                    <Badge variant={statusV[t.subscription.status as keyof typeof statusV] || 'secondary'} className="text-[9px] shrink-0">
                      {t.subscription.plan.name}
                    </Badge>
                  )}
                  <span className="text-text-muted shrink-0">{formatDate(t.createdAt)}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
