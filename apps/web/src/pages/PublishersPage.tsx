import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Globe, Copy, ExternalLink } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePublishers } from '../hooks/useApi'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/toast'
import { api } from '../lib/api'

interface Publisher {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  trackingToken: string
  isActive: boolean
  _count?: { leads: number }
}

export function PublishersPage() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const { data: publishers } = usePublishers()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '' })

  const createMutation = useMutation({
    mutationFn: () => api.post('/publishers', form),
    onSuccess: () => {
      success('Publisher created')
      setShowCreate(false)
      setForm({ name: '', company: '', email: '', phone: '' })
      qc.invalidateQueries({ queryKey: ['publishers'] })
    },
    onError: () => toastError('Failed to create publisher'),
  })

  const copyLink = (token: string) => {
    const url = `${window.location.origin.replace('5173', '4000')}/api/webhooks/publisher/${token}`
    navigator.clipboard.writeText(url)
    success('Publisher link copied!')
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-text-primary">Publishers</h2>
          <p className="text-text-secondary text-xs mt-0.5">External partners who refer leads to your organization</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Publisher
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(publishers || []).map((p: Publisher, i: number) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card gradient={p.isActive} className="h-full hover:shadow-card-hover transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{p.name}</p>
                    {p.company && <p className="text-xs text-text-muted">{p.company}</p>}
                  </div>
                  <Badge variant={p.isActive ? 'success' : 'secondary'} className="text-[9px] shrink-0">
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-text-secondary">
                  {p.email && <p>{p.email}</p>}
                  {p.phone && <p>{p.phone}</p>}
                  <p className="text-text-primary font-medium mt-2">{p._count?.leads || 0} leads submitted</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => copyLink(p.trackingToken)}>
                    <Copy className="h-3 w-3" /> Copy Link
                  </Button>
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {!(publishers || []).length && (
          <div className="col-span-3">
            <Card>
              <CardContent className="p-12 text-center text-text-muted text-sm">
                No publishers yet. Add external partners to track their lead referrals.
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Publisher</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            {[
              { key: 'name', label: 'Publisher Name *', type: 'text', placeholder: 'e.g. Lead Gen Partners' },
              { key: 'company', label: 'Company', type: 'text', placeholder: 'Company name' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'contact@publisher.com' },
              { key: 'phone', label: 'Phone', type: 'text', placeholder: '+91 9876543210' },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type={f.type as 'text' | 'email'}
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!form.name}>
              Create Publisher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
