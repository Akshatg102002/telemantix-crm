import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Upload, Download, Phone, Mail, Tag } from 'lucide-react'
import { api } from '../lib/api'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { useToast } from '../components/ui/toast'
import { formatDate, getInitials } from '../lib/utils'

interface Contact {
  id: string
  name: string
  phone?: string
  email?: string
  company?: string
  tags: string[]
  isActive: boolean
  lastContactedAt?: string
  createdAt: string
}

export function ContactsPage() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', tags: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search, page],
    queryFn: () => api.get('/contacts', { params: { search, page, limit: 20 } }).then(r => r.data),
  })

  const contacts: Contact[] = data?.data || []
  const meta = data?.meta || { total: 0, limit: 20 }

  const createMut = useMutation({
    mutationFn: () => api.post('/contacts', {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => { success('Contact created'); setShowCreate(false); setForm({ name: '', phone: '', email: '', company: '', tags: '' }); qc.invalidateQueries({ queryKey: ['contacts'] }) },
    onError: () => toastError('Failed to create contact'),
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">People & Contacts</h1>
          <p className="text-text-secondary text-xs mt-0.5">{meta.total || 0} contacts in your database</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary"><Upload className="h-3.5 w-3.5" /> Import CSV</Button>
          <Button size="sm" variant="secondary"><Download className="h-3.5 w-3.5" /> Export</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" /> Add Contact</Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Input icon={<Search className="h-3.5 w-3.5" />} placeholder="Search contacts..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="h-8 text-xs max-w-72" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-bg-surface border border-border rounded-xl animate-pulse" />
        ))}
        {!isLoading && !contacts.length && (
          <div className="col-span-3 py-12 text-center text-text-muted text-sm">No contacts found</div>
        )}
        {contacts.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="hover:shadow-card-hover transition-all cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {getInitials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm group-hover:text-brand-purple transition-colors">{c.name}</p>
                    {c.company && <p className="text-xs text-text-muted">{c.company}</p>}
                    <div className="mt-1.5 space-y-0.5">
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <Mail className="h-3 w-3" /> {c.email}
                        </div>
                      )}
                    </div>
                    {c.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="flex items-center gap-0.5 text-[10px] bg-brand-purple/10 text-brand-purple border border-brand-purple/20 px-1.5 py-0.5 rounded">
                            <Tag className="h-2.5 w-2.5" /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant={c.isActive ? 'success' : 'secondary'} className="text-[9px] shrink-0">
                    {c.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-[10px] text-text-muted mt-2">Added {formatDate(c.createdAt)}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {meta.total > meta.limit && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-xs text-text-secondary self-center">Page {page} of {Math.ceil(meta.total / meta.limit)}</span>
          <Button size="sm" variant="secondary" disabled={page * meta.limit >= meta.total} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Full Name *', placeholder: 'John Doe' },
                { key: 'phone', label: 'Phone', placeholder: '+91 9876543210' },
                { key: 'email', label: 'Email', placeholder: 'john@example.com' },
                { key: 'company', label: 'Company', placeholder: 'Acme Corp' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input placeholder={f.placeholder} value={form[f.key as keyof typeof form]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input placeholder="VIP, Real Estate, Mumbai" value={form.tags} onChange={e => setForm(v => ({ ...v, tags: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} loading={createMut.isPending} disabled={!form.name}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
