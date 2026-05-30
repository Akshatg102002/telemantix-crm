import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Users } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { formatDate } from '../../lib/utils'

interface Sub {
  id: string
  status: string
  billingCycle: string
  monthlyAmount: number
  tenant: { name: string }
  plan: { name: string }
  currentPeriodEnd: string
}

interface RevenueData {
  mrr: number
  arr: number
  avgRevPerUser: number
  subscriptions: Sub[]
}

export function SuperAdminRevenue() {
  const { data, isLoading } = useQuery<RevenueData>({
    queryKey: ['sa-revenue'],
    queryFn: () => superAdminApi.get('/super-admin/revenue').then(r => r.data.data),
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">Revenue</h1>
        <p className="text-text-secondary text-xs mt-0.5">Real-time subscription revenue across all tenants</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Monthly Recurring Revenue', value: `₹${((data?.mrr || 0) / 1000).toFixed(1)}K`, sub: 'MRR', icon: DollarSign },
          { title: 'Annual Recurring Revenue', value: `₹${((data?.arr || 0) / 100000).toFixed(2)}L`, sub: 'ARR', icon: TrendingUp },
          { title: 'Avg Revenue Per Account', value: `₹${(data?.avgRevPerUser || 0).toLocaleString('en-IN')}`, sub: 'ARPA / month', icon: Users },
        ].map(k => (
          <motion.div key={k.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card gradient>
              <CardContent className="p-5 flex items-start justify-between">
                <div>
                  <p className="text-text-secondary text-xs font-medium">{k.title}</p>
                  <p className="font-heading font-bold text-3xl text-text-primary mt-1">{k.value}</p>
                  <p className="text-text-muted text-xs mt-1">{k.sub}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-brand-purple/15 flex items-center justify-center">
                  <k.icon className="h-5 w-5 text-brand-purple" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">All Active Subscriptions</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-text-muted text-sm text-center py-6">Loading...</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Company', 'Plan', 'Cycle', 'Monthly Amount', 'Status', 'Renews'].map(h => (
                    <th key={h} className="p-3 text-left text-text-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.subscriptions || []).map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                    <td className="p-3 font-medium text-text-primary">{s.tenant.name}</td>
                    <td className="p-3 text-text-secondary">{s.plan.name}</td>
                    <td className="p-3 text-text-secondary capitalize">{s.billingCycle}</td>
                    <td className="p-3 text-success font-medium">₹{s.monthlyAmount.toLocaleString('en-IN')}/mo</td>
                    <td className="p-3">
                      <Badge variant={s.status === 'active' ? 'success' : s.status === 'trial' ? 'warning' : 'secondary'} className="capitalize text-[9px]">
                        {s.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-text-muted">{formatDate(s.currentPeriodEnd)}</td>
                  </motion.tr>
                ))}
                {!data?.subscriptions?.length && !isLoading && (
                  <tr><td colSpan={6} className="p-6 text-center text-text-muted">No subscriptions</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
