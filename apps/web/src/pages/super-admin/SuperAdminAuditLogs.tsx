import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ScrollText, Search, Download } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { formatDate } from '../../lib/utils'

interface AuditEntry {
  id: string
  tenantId?: string
  userId?: string
  action: string
  resource: string
  resourceId?: string
  ipAddress?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

const ACTION_COLORS: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  create: 'success',
  delete: 'danger',
  update: 'warning',
  login: 'default',
  suspend: 'danger',
  impersonate: 'coral' as 'warning',
}

export function SuperAdminAuditLogs() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['sa-audit-logs', search, action, page],
    queryFn: () => superAdminApi.get('/super-admin/audit-logs', {
      params: { action: action || undefined, page, limit: 30 }
    }).then(r => r.data),
  })

  const logs: AuditEntry[] = data?.data || []
  const meta = data?.meta || { total: 0, limit: 30 }

  const exportCSV = () => {
    const csv = ['Date,Action,Resource,Resource ID,IP Address'].concat(
      logs.map(l => [formatDate(l.createdAt, 'time'), l.action, l.resource, l.resourceId || '', l.ipAddress || ''].join(','))
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'audit-logs.csv'
    a.click()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-danger" /> Audit Logs
          </h1>
          <p className="text-text-secondary text-xs mt-0.5">Full audit trail across all platform actions</p>
        </div>
        <Button size="sm" variant="secondary" onClick={exportCSV}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
      </div>

      <div className="flex gap-3">
        <Input icon={<Search className="h-3.5 w-3.5" />} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs max-w-64" />
        <Select className="h-8 text-xs w-36" value={action} onChange={e => setAction(e.target.value)}>
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="suspend">Suspend</option>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Time', 'Action', 'Resource', 'Resource ID', 'IP Address', 'Details'].map(h => (
                  <th key={h} className="p-3 text-left text-text-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-8 text-center text-text-muted">Loading...</td></tr>}
              {!isLoading && !logs.length && <tr><td colSpan={6} className="p-8 text-center text-text-muted">No audit logs found</td></tr>}
              {logs.map((log, i) => (
                <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="p-3 text-text-muted whitespace-nowrap">{formatDate(log.createdAt, 'time')}</td>
                  <td className="p-3">
                    <Badge variant={ACTION_COLORS[log.action.toLowerCase()] || 'secondary'} className="capitalize text-[9px]">
                      {log.action}
                    </Badge>
                  </td>
                  <td className="p-3 text-text-primary font-medium capitalize">{log.resource}</td>
                  <td className="p-3 text-text-muted font-mono text-[10px]">{log.resourceId ? `#${log.resourceId.slice(0, 8)}` : '—'}</td>
                  <td className="p-3 text-text-secondary">{log.ipAddress || '—'}</td>
                  <td className="p-3 text-text-muted max-w-40 truncate">
                    {log.metadata ? JSON.stringify(log.metadata).slice(0, 50) : '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border text-xs text-text-secondary">
          <span>{meta.total} entries</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="self-center">Page {page} of {Math.ceil(meta.total / meta.limit) || 1}</span>
            <Button size="sm" variant="secondary" disabled={page * meta.limit >= meta.total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
