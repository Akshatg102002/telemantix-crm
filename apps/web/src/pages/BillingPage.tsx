import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, Zap, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { formatDate } from '../lib/utils'

interface SubscriptionData {
  subscription: {
    status: string
    billingCycle: string
    trialEndsAt: string
    currentPeriodEnd: string
    plan: {
      name: string
      price: number
      yearlyPrice: number
      maxUsers: number
      maxLeads: number
      features: string[]
    }
  }
  usage: { users: number; leads: number }
  plans: Array<{ id: string; name: string; slug: string; price: number; yearlyPrice: number; maxUsers: number; maxLeads: number; features: string[]; isPopular: boolean }>
}

export function BillingPage() {
  const { data, isLoading } = useQuery<SubscriptionData>({
    queryKey: ['billing'],
    queryFn: () => api.get('/settings/billing').then(r => r.data.data),
  })

  const sub = data?.subscription
  const usage = data?.usage
  const plans = data?.plans || []

  const trialDaysLeft = sub ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000)) : 0
  const isTrial = sub?.status === 'trial'
  const usersPercent = sub && usage ? (usage.users / Math.max(sub.plan.maxUsers, 1)) * 100 : 0
  const leadsPercent = sub && usage ? (usage.leads / Math.max(sub.plan.maxLeads, 1)) * 100 : 0

  if (isLoading) return <div className="p-6 flex items-center justify-center h-48"><div className="h-5 w-5 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" /></div>

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Trial banner */}
      {isTrial && trialDaysLeft <= 7 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl border border-warning/40 bg-warning/10">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">
              Your trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">Upgrade to a paid plan to continue using Telemantix without interruption.</p>
          </div>
          <Button size="sm">Upgrade Now</Button>
        </motion.div>
      )}

      {/* Current plan */}
      {sub && (
        <Card gradient>
          <CardHeader><CardTitle className="text-sm">Current Plan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-xl text-text-primary">{sub.plan.name}</h2>
                  <Badge variant={sub.status === 'active' ? 'success' : sub.status === 'trial' ? 'warning' : 'secondary'} className="capitalize">
                    {sub.status}
                  </Badge>
                </div>
                <p className="text-text-secondary text-sm mt-1">
                  ₹{sub.plan.price.toLocaleString('en-IN')}/user/month · {sub.billingCycle === 'yearly' ? 'Billed annually' : 'Billed monthly'}
                </p>
                <p className="text-text-muted text-xs mt-0.5">
                  {isTrial ? `Trial ends ${formatDate(sub.trialEndsAt)}` : `Renews ${formatDate(sub.currentPeriodEnd)}`}
                </p>
              </div>
              <Button variant="secondary" size="sm">Change Plan</Button>
            </div>

            {/* Usage meters */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {[
                { label: 'Users', used: usage?.users || 0, max: sub.plan.maxUsers, percent: usersPercent },
                { label: 'Leads', used: usage?.leads || 0, max: sub.plan.maxLeads, percent: leadsPercent },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">{m.label}</span>
                    <span className="text-text-primary font-medium">
                      {m.used.toLocaleString('en-IN')} / {m.max === -1 ? 'Unlimited' : m.max.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {m.max !== -1 && (
                    <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${m.percent > 90 ? 'bg-danger' : m.percent > 70 ? 'bg-warning' : 'bg-brand-gradient'}`}
                        style={{ width: `${Math.min(m.percent, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan upgrade options */}
      <div>
        <h2 className="font-heading font-semibold text-text-primary mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className={`h-full p-5 rounded-xl border flex flex-col ${
                sub?.plan.name === plan.name ? 'border-brand-purple/60 bg-brand-purple/5' : 'border-border hover:border-brand-purple/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-heading font-semibold text-text-primary">{plan.name}</h3>
                  {plan.isPopular && <span className="text-[9px] bg-brand-gradient text-white px-2 py-0.5 rounded-full">Popular</span>}
                  {sub?.plan.name === plan.name && <Badge variant="default" className="text-[9px]">Current</Badge>}
                </div>
                <div className="flex items-end gap-1 mb-4">
                  <span className="font-heading font-bold text-2xl text-text-primary">₹{plan.price.toLocaleString('en-IN')}</span>
                  <span className="text-text-muted text-xs mb-0.5">/user/mo</span>
                </div>
                <ul className="space-y-2 flex-1">
                  {(plan.features as string[]).map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
                      <Check className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  className="mt-4 w-full"
                  variant={sub?.plan.name === plan.name ? 'secondary' : 'default'}
                  disabled={sub?.plan.name === plan.name}
                >
                  {sub?.plan.name === plan.name ? 'Current Plan' : 'Upgrade'}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Enterprise CTA */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-text-primary">Need Enterprise?</h3>
            <p className="text-text-secondary text-sm mt-1">Unlimited users, dedicated account manager, SLA support, and custom integrations.</p>
          </div>
          <Button variant="secondary">
            <Zap className="h-3.5 w-3.5" /> Contact Sales
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
