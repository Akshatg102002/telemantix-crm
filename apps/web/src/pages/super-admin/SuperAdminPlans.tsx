import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Edit2, Check, X } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/toast'

interface Plan {
  id: string
  name: string
  slug: string
  price: number
  yearlyPrice: number
  maxUsers: number
  maxLeads: number
  features: string[]
  isActive: boolean
  isPopular: boolean
  subscriberCount: number
}

function PlanCard({ plan, onToggle, onEdit }: { plan: Plan; onToggle: () => void; onEdit: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card gradient={plan.isActive} className={!plan.isActive ? 'opacity-60' : ''}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-text-primary">{plan.name}</h3>
                {plan.isPopular && <Badge variant="coral" className="text-[9px]">Popular</Badge>}
              </div>
              <p className="text-xs text-text-muted mt-0.5">slug: {plan.slug}</p>
            </div>
            <div className="flex gap-2">
              <Button size="icon-sm" variant="ghost" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button size="icon-sm" variant={plan.isActive ? 'ghost' : 'secondary'} onClick={onToggle}>
                {plan.isActive ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            <div className="p-2.5 rounded-lg bg-bg-elevated">
              <p className="text-text-muted">Monthly Price</p>
              <p className="font-bold text-text-primary mt-0.5">₹{plan.price.toLocaleString('en-IN')}/user</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-elevated">
              <p className="text-text-muted">Yearly Price</p>
              <p className="font-bold text-text-primary mt-0.5">₹{plan.yearlyPrice.toLocaleString('en-IN')}/user</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-elevated">
              <p className="text-text-muted">Max Users</p>
              <p className="font-bold text-text-primary mt-0.5">{plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-elevated">
              <p className="text-text-muted">Max Leads</p>
              <p className="font-bold text-text-primary mt-0.5">{plan.maxLeads === -1 ? 'Unlimited' : plan.maxLeads.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <Badge variant={plan.isActive ? 'success' : 'secondary'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
            <span className="text-text-muted">{plan.subscriberCount} subscriber{plan.subscriberCount !== 1 ? 's' : ''}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function SuperAdminPlans() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['sa-plans'],
    queryFn: () => superAdminApi.get('/super-admin/plans').then(r => r.data.data),
  })

  const toggleMut = useMutation({
    mutationFn: (p: Plan) => superAdminApi.put(`/super-admin/plans/${p.id}`, { isActive: !p.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-plans'] }),
  })

  const updateMut = useMutation({
    mutationFn: (data: Partial<Plan> & { id: string }) => superAdminApi.put(`/super-admin/plans/${data.id}`, data),
    onSuccess: () => { success('Plan updated'); setEditPlan(null); qc.invalidateQueries({ queryKey: ['sa-plans'] }) },
    onError: () => toastError('Update failed'),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Plans</h1>
          <p className="text-text-secondary text-xs mt-0.5">Manage subscription plans and pricing</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" /> New Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => (
          <PlanCard key={plan.id} plan={plan} onToggle={() => toggleMut.mutate(plan)} onEdit={() => setEditPlan(plan)} />
        ))}
      </div>

      {/* Edit Dialog */}
      {editPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-bg-surface border border-border rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-text-primary">Edit {editPlan.name} Plan</h3>
              <button onClick={() => setEditPlan(null)} className="text-text-muted hover:text-text-primary"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'price', label: 'Monthly Price (₹)' },
                { key: 'yearlyPrice', label: 'Yearly Price (₹)' },
                { key: 'maxUsers', label: 'Max Users (-1 = unlimited)' },
                { key: 'maxLeads', label: 'Max Leads (-1 = unlimited)' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    type="number"
                    defaultValue={(editPlan as unknown as Record<string, number>)[f.key]}
                    onChange={e => setEditPlan(prev => prev ? { ...prev, [f.key]: Number(e.target.value) } : null)}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setEditPlan(null)}>Cancel</Button>
              <Button size="sm" onClick={() => updateMut.mutate(editPlan)} loading={updateMut.isPending}>Save Changes</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
