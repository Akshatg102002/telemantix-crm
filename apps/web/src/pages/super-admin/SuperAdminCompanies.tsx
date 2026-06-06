import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, Pause, Play, Trash2, UserCheck, Settings, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { superAdminApi } from '../../lib/superAdminApi'
import { useAuthStore } from '../../store/auth'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { useToast } from '../../components/ui/toast'
import { formatDate } from '../../lib/utils'

interface Company {
  id: string
  name: string
  industry?: string
  isActive: boolean
  createdAt: string
  subscription?: { status: string; plan: { name: string; price: number } }
  _count: { users: number; leads: number }
}

interface ServiceWithTenant {
  key: string
  name: string
  category: string
  isCore: boolean
  isEnabled: boolean
  isMaintenance: boolean
  tenantEnabled: boolean | null
  overriddenBySuperAdmin: boolean
  disabledReason: string | null
}

const statusVariant = { active: 'success', trial: 'warning', suspended: 'danger', cancelled: 'secondary' } as const

const CATEGORY_LABELS: Record<string, string> = {
  crm: 'CRM', communication: 'Communication', integration: 'Integration',
  analytics: 'Analytics', automation: 'Automation', ai: 'AI', security: 'Security & Data',
}

function ServicesTab({ companyId }: { companyId: string }) {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [disabledReasons, setDisabledReasons] = useState<Record<string, string>>({})

  const { data: services = [], isLoading } = useQuery<ServiceWithTenant[]>({
    queryKey: ['sa-company-services', companyId],
    queryFn: () => superAdminApi.get(`/super-admin/companies/${companyId}/services`).then(r => r.data.data),
  })

  const toggleMut = useMutation({
    mutationFn: ({ key, isEnabled, disabledReason }: { key: string; isEnabled: boolean; disabledReason?: string }) =>
      superAdminApi.put(`/super-admin/companies/${companyId}/services/${key}`, { isEnabled, disabledReason }),
    onSuccess: () => { success('Service updated'); qc.invalidateQueries({ queryKey: ['sa-company-services', companyId] }) },
    onError: () => toastError('Update failed'),
  })

  const resetMut = useMutation({
    mutationFn: () => superAdminApi.post(`/super-admin/companies/${companyId}/services/reset`),
    onSuccess: () => { success('Reset to plan defaults'); qc.invalidateQueries({ queryKey: ['sa-company-services', companyId] }) },
    onError: () => toastError('Reset failed'),
  })

  const grouped = services.reduce<Record<string, ServiceWithTenant[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})

  if (isLoading) return <div className="py-8 text-center text-text-muted text-xs">Loading services...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">{services.length} services configured</p>
        <Button size="sm" variant="secondary" onClick={() => resetMut.mutate()} loading={resetMut.isPending}>
          <RefreshCw className="h-3.5 w-3.5" /> Reset to Plan Defaults
        </Button>
      </div>
      {Object.entries(grouped).map(([cat, svcs]) => (
        <div key={cat}>
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">{CATEGORY_LABELS[cat] || cat}</p>
          <div className="grid grid-cols-2 gap-2">
            {svcs.map(svc => {
              const effectiveEnabled = svc.isEnabled && (svc.tenantEnabled ?? true)
              return (
                <div key={svc.key} className={`p-2.5 rounded-lg border ${effectiveEnabled ? 'border-border bg-bg-elevated' : 'border-danger/20 bg-danger/5'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-text-primary">{svc.name}</span>
                      {svc.isCore && <Badge variant="secondary" className="text-[8px] py-0">Core</Badge>}
                      {svc.overriddenBySuperAdmin && <Badge variant="warning" className="text-[8px] py-0">Override</Badge>}
                    </div>
                    <button
                      onClick={() => toggleMut.mutate({ key: svc.key, isEnabled: !(svc.tenantEnabled ?? true), disabledReason: disabledReasons[svc.key] })}
                      disabled={svc.isCore}
                      className={svc.isCore ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'}
                    >
                      {effectiveEnabled
                        ? <ToggleRight className="h-4 w-4 text-success" />
                        : <ToggleLeft className="h-4 w-4 text-text-muted" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${svc.isEnabled ? 'bg-success' : 'bg-danger'}`} />
                    <span className="text-[10px] text-text-muted">Global: {svc.isEnabled ? 'on' : 'off'}</span>
                    {svc.isMaintenance && <span className="text-[10px] text-warning ml-1">• maintenance</span>}
                  </div>
                  {!effectiveEnabled && (
                    <div className="mt-1.5">
                      <Input
                        placeholder="Disabled reason..."
                        value={disabledReasons[svc.key] || svc.disabledReason || ''}
                        onChange={e => setDisabledReasons(prev => ({ ...prev, [svc.key]: e.target.value }))}
                        className="text-[10px] h-6"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SuperAdminCompanies() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()
  const { setAuth } = useAuthStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)
  const [servicesCompany, setServicesCompany] = useState<Company | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'services'>('overview')

  const { data, isLoading } = useQuery({
    queryKey: ['sa-companies', search, statusFilter, page],
    queryFn: () => superAdminApi.get('/super-admin/companies', { params: { search, status: statusFilter || undefined, page, limit: 20 } }).then(r => r.data),
  })

  const companies: Company[] = data?.data || []
  const meta = data?.meta || { total: 0, page: 1, limit: 20 }

  const suspendMut = useMutation({
    mutationFn: (id: string) => superAdminApi.post(`/super-admin/companies/${id}/suspend`),
    onSuccess: () => { success('Company suspended'); qc.invalidateQueries({ queryKey: ['sa-companies'] }) },
    onError: () => toastError('Failed to suspend'),
  })

  const reactivateMut = useMutation({
    mutationFn: (id: string) => superAdminApi.post(`/super-admin/companies/${id}/reactivate`),
    onSuccess: () => { success('Company reactivated'); qc.invalidateQueries({ queryKey: ['sa-companies'] }) },
    onError: () => toastError('Failed to reactivate'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => superAdminApi.delete(`/super-admin/companies/${id}`),
    onSuccess: () => { success('Company deleted'); setDeleteTarget(null); qc.invalidateQueries({ queryKey: ['sa-companies'] }) },
    onError: () => toastError('Failed to delete'),
  })

  const impersonateMut = useMutation({
    mutationFn: (id: string) => superAdminApi.post(`/super-admin/companies/${id}/impersonate`),
    onSuccess: (res) => {
      const { user, tenant, accessToken } = res.data.data
      setAuth(user, tenant, accessToken, '')
      success(`Impersonating ${tenant.name}`)
      window.open('/dashboard', '_blank')
    },
    onError: () => toastError('Impersonation failed'),
  })

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">Companies</h1>
        <p className="text-text-secondary text-xs mt-0.5">{meta.total} total organizations</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input icon={<Search className="h-3.5 w-3.5" />} placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="h-8 text-xs max-w-64" />
        <Select className="h-8 text-xs w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
          <option value="custom">Custom Package</option>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Company', 'Plan', 'Status', 'Users', 'Leads', 'MRR', 'Signed Up', 'Actions'].map(h => (
                  <th key={h} className="p-3 text-left text-text-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="p-8 text-center text-text-muted">Loading...</td></tr>}
              {!isLoading && companies.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-text-muted">No companies found</td></tr>}
              {companies.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors group">
                  <td className="p-3">
                    <div className="font-medium text-text-primary">{c.name}</div>
                    {c.industry && <div className="text-text-muted">{c.industry}</div>}
                  </td>
                  <td className="p-3 text-text-secondary">{c.subscription?.plan?.name || '—'}</td>
                  <td className="p-3">
                    {c.subscription ? (
                      <Badge variant={statusVariant[c.subscription.status as keyof typeof statusVariant] || 'secondary'} className="capitalize text-[9px]">
                        {c.subscription.status}
                      </Badge>
                    ) : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="p-3 text-text-secondary">{c._count.users}</td>
                  <td className="p-3 text-text-secondary">{c._count.leads.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-text-secondary">
                    {c.subscription ? `₹${c.subscription.plan.price.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="p-3 text-text-muted">{formatDate(c.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button size="icon-sm" variant="ghost" title="Impersonate" onClick={() => impersonateMut.mutate(c.id)}>
                        <UserCheck className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Manage Services" onClick={() => { setServicesCompany(c); setActiveTab('services') }}>
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Custom Package" onClick={() => navigate(`/super-admin/companies/${c.id}/custom-package`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {c.isActive ? (
                        <Button size="icon-sm" variant="ghost" title="Suspend" onClick={() => suspendMut.mutate(c.id)}>
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button size="icon-sm" variant="ghost" title="Reactivate" onClick={() => reactivateMut.mutate(c.id)}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon-sm" variant="ghost" className="text-danger" title="Delete" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border text-xs text-text-secondary">
          <span>{meta.total} companies</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span>Page {page} of {Math.ceil(meta.total / meta.limit) || 1}</span>
            <Button size="sm" variant="secondary" disabled={page * meta.limit >= meta.total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Company</DialogTitle></DialogHeader>
          <div className="p-6">
            <p className="text-sm text-text-secondary">
              Are you sure you want to permanently delete <span className="font-medium text-text-primary">{deleteTarget?.name}</span>?
              This will delete ALL leads, users, and data. This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button className="bg-danger/80 hover:bg-danger border-0" onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)} loading={deleteMut.isPending}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Services Management Dialog */}
      <Dialog open={!!servicesCompany} onOpenChange={v => !v && setServicesCompany(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{servicesCompany?.name} — Company Details</DialogTitle>
          </DialogHeader>
          <div className="border-b border-border flex gap-4 px-6 -mx-6">
            {(['overview', 'services'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-medium pb-2.5 border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-brand-purple text-brand-purple' : 'border-transparent text-text-muted hover:text-text-primary'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'overview' && servicesCompany && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-bg-elevated">
                    <p className="text-text-muted">Plan</p>
                    <p className="font-medium text-text-primary mt-0.5">{servicesCompany.subscription?.plan?.name || '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-bg-elevated">
                    <p className="text-text-muted">Status</p>
                    <p className="font-medium text-text-primary mt-0.5 capitalize">{servicesCompany.subscription?.status || '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-bg-elevated">
                    <p className="text-text-muted">Users</p>
                    <p className="font-medium text-text-primary mt-0.5">{servicesCompany._count.users}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-bg-elevated">
                    <p className="text-text-muted">Leads</p>
                    <p className="font-medium text-text-primary mt-0.5">{servicesCompany._count.leads.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-bg-elevated text-xs">
                  <p className="text-text-muted">Industry</p>
                  <p className="font-medium text-text-primary mt-0.5">{servicesCompany.industry || '—'}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => navigate(`/super-admin/companies/${servicesCompany.id}/custom-package`)}>
                  Configure Custom Package
                </Button>
              </div>
            )}
            {activeTab === 'services' && servicesCompany && (
              <ServicesTab companyId={servicesCompany.id} />
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setServicesCompany(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
