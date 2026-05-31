import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Database, Server, Zap, CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'

interface HealthData {
  api: string
  database: string
  redis: string
  queues: Record<string, { waiting: number; active: number; failed: number; completed: number }>
  uptime: number
  responseTimeMs: number
  timestamp: string
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'healthy') return <CheckCircle className="h-4 w-4 text-success" />
  if (status === 'degraded') return <AlertCircle className="h-4 w-4 text-warning" />
  return <XCircle className="h-4 w-4 text-danger" />
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'danger'} className="capitalize text-[9px]">
      {status}
    </Badge>
  )
}

export function SuperAdminMonitoring() {
  const { data: health, isLoading, refetch, dataUpdatedAt } = useQuery<HealthData>({
    queryKey: ['sa-health'],
    queryFn: () => superAdminApi.get('/super-admin/monitoring/health').then(r => r.data.data),
    refetchInterval: 30000,
    retry: 1,
  })

  const services = health ? [
    { name: 'API Server', status: health.api, detail: `${health.responseTimeMs}ms response`, icon: Server },
    { name: 'PostgreSQL', status: health.database, detail: 'Primary database', icon: Database },
    { name: 'Redis Cache', status: health.redis, detail: 'Cache & queues', icon: Zap },
  ] : []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary flex items-center gap-2">
            <Activity className="h-5 w-5 text-danger" /> System Monitoring
          </h1>
          <p className="text-text-secondary text-xs mt-0.5">
            {dataUpdatedAt ? `Last updated: ${new Date(dataUpdatedAt).toLocaleTimeString()}` : 'Loading...'}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Overall health */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card gradient>
            <CardContent className="p-4 text-center">
              <p className="font-heading font-bold text-2xl text-success">{health.uptime}%</p>
              <p className="text-text-muted text-xs mt-0.5">Uptime</p>
            </CardContent>
          </Card>
          <Card gradient>
            <CardContent className="p-4 text-center">
              <p className="font-heading font-bold text-2xl text-text-primary">{health.responseTimeMs}ms</p>
              <p className="text-text-muted text-xs mt-0.5">Response Time</p>
            </CardContent>
          </Card>
          <Card gradient>
            <CardContent className="p-4 text-center">
              <p className="font-heading font-bold text-2xl text-brand-purple">
                {Object.values(health.queues).reduce((s, q) => s + q.active, 0)}
              </p>
              <p className="text-text-muted text-xs mt-0.5">Active Jobs</p>
            </CardContent>
          </Card>
          <Card gradient>
            <CardContent className="p-4 text-center">
              <p className="font-heading font-bold text-2xl text-danger">
                {Object.values(health.queues).reduce((s, q) => s + q.failed, 0)}
              </p>
              <p className="text-text-muted text-xs mt-0.5">Failed Jobs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-bg-surface border border-border rounded-xl animate-pulse" />)}
        </div>
      )}

      {/* Service health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map((s, i) => (
          <motion.div key={s.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`border ${s.status === 'healthy' ? 'border-success/20' : s.status === 'degraded' ? 'border-warning/20' : 'border-danger/20'}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  s.status === 'healthy' ? 'bg-success/10' : s.status === 'degraded' ? 'bg-warning/10' : 'bg-danger/10'
                }`}>
                  <s.icon className={`h-5 w-5 ${s.status === 'healthy' ? 'text-success' : s.status === 'degraded' ? 'text-warning' : 'text-danger'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{s.name}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-text-muted">{s.detail}</p>
                </div>
                <StatusIcon status={s.status} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Queue monitor */}
      {health?.queues && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-brand-purple" /> Queue Monitor</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Queue', 'Waiting', 'Active', 'Failed', 'Completed', 'Status'].map(h => (
                      <th key={h} className="p-3 text-left text-text-muted font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(health.queues).map(([name, stats]) => (
                    <tr key={name} className="border-b border-border/50 hover:bg-bg-elevated/50">
                      <td className="p-3 font-medium text-text-primary font-mono text-[11px]">{name}</td>
                      <td className="p-3 text-warning font-medium">{stats.waiting}</td>
                      <td className="p-3 text-success font-medium">{stats.active}</td>
                      <td className="p-3 text-danger font-medium">{stats.failed}</td>
                      <td className="p-3 text-text-secondary">{stats.completed.toLocaleString()}</td>
                      <td className="p-3">
                        <Badge variant={stats.failed > 5 ? 'danger' : stats.active > 0 ? 'success' : 'secondary'} className="text-[9px]">
                          {stats.failed > 5 ? 'degraded' : stats.active > 0 ? 'active' : 'idle'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
