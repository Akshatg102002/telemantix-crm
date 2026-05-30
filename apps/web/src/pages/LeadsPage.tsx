import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, Filter, Download, RefreshCw, MoreHorizontal, Phone, Mail, User } from 'lucide-react'
import { useLeads, useServiceBoards, useUsers } from '../hooks/useApi'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { Select } from '../components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { LeadForm } from '../components/forms/LeadForm'
import { formatDate, scoreColor, scoreLabel } from '../lib/utils'
import { api } from '../lib/api'
import { useToast } from '../components/ui/toast'

interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  score: number
  isStale: boolean
  reEnquiredCount: number
  createdAt: string
  source?: { name: string; color: string }
  status?: { name: string; color: string }
  serviceBoard?: { name: string }
  assignedUser?: { name: string }
}

const statusColors: Record<string, string> = {
  New: 'secondary',
  Contacted: 'default',
  'Site Visit': 'warning',
  Negotiation: 'coral',
  Closed: 'success',
  Lost: 'danger',
}

export function LeadsPage() {
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [boardFilter, setBoardFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, refetch } = useLeads({
    search: search || undefined,
    page,
    limit: 20,
    statusId: statusFilter || undefined,
    serviceBoardId: boardFilter || undefined,
  })
  const { data: boards } = useServiceBoards()
  const { data: users } = useUsers()

  const leads: Lead[] = data?.data || []
  const meta = data?.meta || { total: 0, page: 1, limit: 20 }

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }, [])

  const selectAll = () => setSelected(leads.length === selected.size ? new Set() : new Set(leads.map(l => l.id)))

  const handleBulkExport = async () => {
    try {
      const res = await api.post('/leads/bulk', { action: 'export', leadIds: [...selected] })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'leads.csv'
      a.click()
    } catch { toastError('Export failed') }
  }

  const handleBulkAssign = async (userId: string) => {
    try {
      await api.post('/leads/bulk', { action: 'assign', leadIds: [...selected], assignedUserId: userId })
      success(`${selected.size} leads assigned`)
      setSelected(new Set())
      refetch()
    } catch { toastError('Bulk assign failed') }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input
            icon={<Search className="h-3.5 w-3.5" />}
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="h-8 text-xs"
          />
        </div>
        <Select className="h-8 text-xs w-40" value={boardFilter} onChange={e => setBoardFilter(e.target.value)}>
          <option value="">All Boards</option>
          {(boards || []).map((b: { id: string; name: string }) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </Select>
        <Button size="sm" variant="secondary" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-3.5 w-3.5" /> Filters
        </Button>
        <Button size="sm" variant="secondary" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        {selected.size > 0 && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">{selected.size} selected ▾</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleBulkExport}><Download className="h-3.5 w-3.5" /> Export CSV</DropdownMenuItem>
                {(users || []).map((u: { id: string; name: string }) => (
                  <DropdownMenuItem key={u.id} onClick={() => handleBulkAssign(u.id)}>
                    <User className="h-3.5 w-3.5" /> Assign to {u.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Lead
        </Button>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left w-8">
                  <input type="checkbox" checked={selected.size === leads.length && leads.length > 0} onChange={selectAll} className="rounded border-border bg-bg-elevated" />
                </th>
                <th className="p-3 text-left text-text-muted font-medium">Name</th>
                <th className="p-3 text-left text-text-muted font-medium">Contact</th>
                <th className="p-3 text-left text-text-muted font-medium">Source</th>
                <th className="p-3 text-left text-text-muted font-medium">Status</th>
                <th className="p-3 text-left text-text-muted font-medium">Board</th>
                <th className="p-3 text-left text-text-muted font-medium">Score</th>
                <th className="p-3 text-left text-text-muted font-medium">Assigned</th>
                <th className="p-3 text-left text-text-muted font-medium">Created</th>
                <th className="p-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10} className="p-8 text-center text-text-muted">Loading leads...</td></tr>
              )}
              {!isLoading && leads.length === 0 && (
                <tr><td colSpan={10} className="p-8 text-center text-text-muted">No leads found</td></tr>
              )}
              {leads.map((lead, i) => (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/leads/${lead.id}`)}
                >
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded border-border bg-bg-elevated" />
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-text-primary group-hover:text-brand-purple transition-colors">
                      {lead.name}
                    </div>
                    {lead.isStale && <Badge variant="warning" className="mt-0.5 text-[9px] py-0">Stale</Badge>}
                    {lead.reEnquiredCount > 0 && <Badge variant="coral" className="mt-0.5 ml-1 text-[9px] py-0">Re-enquired</Badge>}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-text-secondary">
                      <Phone className="h-3 w-3" /> {lead.phone}
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-1 text-text-muted mt-0.5">
                        <Mail className="h-3 w-3" /> {lead.email}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {lead.source ? (
                      <span className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ background: lead.source.color }} />
                        {lead.source.name}
                      </span>
                    ) : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="p-3">
                    {lead.status ? (
                      <Badge variant={(statusColors[lead.status.name] as 'default') || 'secondary'}>
                        {lead.status.name}
                      </Badge>
                    ) : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="p-3 text-text-secondary">{lead.serviceBoard?.name || '—'}</td>
                  <td className="p-3">
                    <span className={`font-semibold ${scoreColor(lead.score)}`}>
                      {lead.score} <span className="font-normal text-text-muted">({scoreLabel(lead.score)})</span>
                    </span>
                  </td>
                  <td className="p-3 text-text-secondary">{lead.assignedUser?.name || 'Unassigned'}</td>
                  <td className="p-3 text-text-muted">{formatDate(lead.createdAt)}</td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-bg-elevated text-text-muted transition-all">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>View Detail</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}?tab=followup`)}>Add Follow-up</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}?tab=history`)}>View History</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-border text-xs text-text-secondary">
          <span>{meta.total} total leads</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="px-2">Page {page} of {Math.ceil(meta.total / meta.limit) || 1}</span>
            <Button size="sm" variant="secondary" disabled={page * meta.limit >= meta.total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      {/* Create Lead Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <LeadForm onSuccess={() => { setShowCreate(false); refetch() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
