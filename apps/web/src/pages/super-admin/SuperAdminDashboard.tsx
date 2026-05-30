import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Building2, TrendingUp, DollarSign, Target, UserPlus, UserMinus } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, BarChart as HBarChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList
} from 'recharts'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { formatCurrency } from '../../lib/utils'

const COLORS = ['#7B2FBE', '#C43E8A', '#E8622A', '#22C55E', '#F59E0B', '#3B82F6']

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

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
  mrrTrend: { month: string; mrr: number }[]
  signupTrend: { month: string; count: number }[]
  planDist: { name: string; count: number }[]
  topCompanies: { name: string; count: number }[]
}

function KpiCard({ title, value, sub, icon: Icon, color = 'text-brand-purple' }: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color?: string
}) {
  return (
    <motion.div variants={fadeUp}>
      <Card gradient className="h-full">
        <CardContent className="p-5 flex items-start justify-between">
          <div>
            <p className="text-text-secondary text-xs font-medium mb-1">{title}</p>
            <p className="font-heading font-bold text-2xl text-text-primary">{value}</p>
            {sub && <p className="text-text-muted text-xs mt-1">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-current/10`} style={{ backgroundColor: 'rgba(123,47,190,0.1)' }}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['sa-stats'],
    queryFn: () => superAdminApi.get('/super-admin/stats').then(r => r.data.data),
    refetchInterval: 60000,
  })

  if (isLoading || !stats) {
    return <div className="flex items-center justify-center h-64"><div className="h-6 w-6 rounded-full border-2 border-danger border-t-transparent animate-spin" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-text-primary">Master Dashboard</h1>
        <p className="text-text-secondary text-xs mt-0.5">Platform-wide metrics across all tenants</p>
      </div>

      {/* KPI Grid */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4" variants={stagger} initial="hidden" animate="show">
        <KpiCard title="Total Companies" value={stats.totalTenants} icon={Building2} />
        <KpiCard title="Active Subs" value={stats.activeSubs} icon={TrendingUp} color="text-success" />
        <KpiCard title="Monthly MRR" value={`₹${(stats.mrr / 1000).toFixed(0)}K`} sub={`ARR ₹${(stats.arr / 100000).toFixed(1)}L`} icon={DollarSign} color="text-brand-coral" />
        <KpiCard title="Total Leads" value={stats.totalLeads.toLocaleString('en-IN')} icon={Target} color="text-brand-magenta" />
        <KpiCard title="New This Month" value={stats.newThisMonth} icon={UserPlus} color="text-success" />
        <KpiCard title="Churned" value={stats.churnedThisMonth} icon={UserMinus} color="text-danger" />
      </motion.div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card gradient>
          <CardHeader><CardTitle className="text-sm">MRR Trend (12 months)</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.mrrTrend}>
                <XAxis dataKey="month" tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: '#16161A', border: '1px solid #2A2A2F', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'MRR']} />
                <Line type="monotone" dataKey="mrr" stroke="#7B2FBE" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card gradient>
          <CardHeader><CardTitle className="text-sm">New Signups per Month</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.signupTrend}>
                <XAxis dataKey="month" tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#16161A', border: '1px solid #2A2A2F', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#C43E8A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Plan Distribution</CardTitle></CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.planDist} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {stats.planDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#16161A', border: '1px solid #2A2A2F', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4">
              {stats.planDist.map((p, i) => (
                <div key={p.name} className="flex items-center gap-1 text-xs text-text-secondary">
                  <div className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {p.name} ({p.count})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Top 10 Companies by Leads</CardTitle></CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <HBarChart data={stats.topCompanies} layout="vertical">
                <XAxis type="number" tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ background: '#16161A', border: '1px solid #2A2A2F', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#E8622A" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="count" position="right" style={{ fill: '#8A8A99', fontSize: 10 }} />
                </Bar>
              </HBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
