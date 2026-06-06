import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ToggleLeft, ToggleRight, AlertTriangle, CheckCircle, XCircle,
  Clock, RefreshCw, Activity
} from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/toast'

interface ServiceDef {
  key: string
  name: string
  category: string
  isEnabled: boolean
  isMaintenance: boolean
  maintenanceMsg: string | null
  isCore: boolean
}

interface HealthResult {
  key: string
  name: string
  category: string
  status: 'healthy' | 'maintenance' | 'disabled' | 'degraded'
  message?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  crm: 'CRM',
  communication: 'Communication',
  integration: 'Integration',
  analytics: 'Analytics',
  automation: 'Automation',
  ai: 'AI',
  security: 'Security & Data',
}

const STATUS_COLORS = {
  healthy: 'text-success bg-success/10',
  maintenance: 'text-warning bg-warning/10',
  disabled: 'text-danger bg-danger/10',
  degraded: 'text-warning bg-warning/10',
}

function ServiceCard({ svc, onToggle, onMaintenance }: {
  svc: ServiceDef
  onToggle: () => void
  onMaintenance: (enabled: boolean, msg: string) => void
}) {
  const [showMsgInput, setShowMsgInput] = useState(false)
  const [msg, setMsg] = useState(svc.maintenanceMsg || '')

  return (
    <div className="p-3 rounded-lg border border-border bg-bg-elevated space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">{svc.name}</span>
          {svc.isCore && <Badge variant="secondary" className="text-[9px]">Core</Badge>}
        </div>
        <button
          onClick={onToggle}
          disabled={svc.isCore}
          title={svc.isCore ? 'Core services cannot be disabled' : undefined}
          className={`transition-colors ${svc.isCore ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'}`}
        >
          {svc.isEnabled
            ? <ToggleRight className="h-5 w-5 text-success" />
            : <ToggleLeft className="h-5 w-5 text-text-muted" />}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted">Maintenance</span>
        <button
          onClick={() => {
            setShowMsgInput(!svc.isMaintenance)
            if (svc.isMaintenance) onMaintenance(false, '')
          }}
          className="transition-colors hover:opacity-80"
        >
          {svc.isMaintenance
            ? <ToggleRight className="h-4 w-4 text-warning" />
            : <ToggleLeft className="h-4 w-4 text-text-muted" />}
        </button>
      </div>
      {(showMsgInput || svc.isMaintenance) && (
        <div className="space-y-1">
          <Input
            placeholder="Maintenance message..."
            value={msg}
            onChange={e => setMsg(e.target.value)}
            className="text-xs h-7"
          />
          <Button
            size="sm"
            variant="secondary"
            className="h-6 text-[10px]"
            onClick={() => { onMaintenance(true, msg); setShowMsgInput(false) }}
          >
            Save Message
          </Button>
        </div>
      )}
    </div>
  )
}

export function SuperAdminServices() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [healthData, setHealthData] = useState<{ services: HealthResult[]; infrastructure: Record<string, string>; checkedAt: string } | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  const { data: services = [] } = useQuery<ServiceDef[]>({
    queryKey: ['sa-services'],
    queryFn: () => superAdminApi.get('/super-admin/services').then(r => r.data.data),
  })

  const toggleMut = useMutation({
    mutationFn: (key: string) => superAdminApi.put(`/super-admin/services/${key}/toggle`),
    onSuccess: () => { success('Service updated'); qc.invalidateQueries({ queryKey: ['sa-services'] }) },
    onError: () => toastError('Update failed'),
  })

  const maintMut = useMutation({
    mutationFn: ({ key, isMaintenance, maintenanceMsg }: { key: string; isMaintenance: boolean; maintenanceMsg: string }) =>
      superAdminApi.put(`/super-admin/services/${key}/maintenance`, { isMaintenance, maintenanceMsg }),
    onSuccess: () => { success('Maintenance mode updated'); qc.invalidateQueries({ queryKey: ['sa-services'] }) },
    onError: () => toastError('Update failed'),
  })

  const fetchHealth = async () => {
    setHealthLoading(true)
    try {
      const res = await superAdminApi.get('/super-admin/services/health')
      setHealthData(res.data.data)
    } catch {
      toastError('Health check failed')
    } finally {
      setHealthLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 60000)
    return () => clearInterval(interval)
  }, [])

  const grouped = services.reduce<Record<string, ServiceDef[]>>((acc, svc) => {
    if (!acc[svc.category]) acc[svc.category] = []
    acc[svc.category].push(svc)
    return acc
  }, {})

  const getStatusIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle className="h-3.5 w-3.5 text-success" />
    if (status === 'maintenance') return <Clock className="h-3.5 w-3.5 text-warning" />
    if (status === 'disabled') return <XCircle className="h-3.5 w-3.5 text-danger" />
    return <AlertTriangle className="h-3.5 w-3.5 text-warning" />
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">Services & Integrations</h1>
        <p className="text-text-secondary text-xs mt-0.5">Control global service availability and monitor health</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Global Service Control */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Global Service Control Panel</h2>
          {Object.entries(grouped).map(([category, svcs]) => (
            <motion.div key={category} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs">{CATEGORY_LABELS[category] || category}</CardTitle>
                    <Badge variant="secondary" className="text-[9px]">{svcs.length} services</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {svcs.map(svc => (
                      <ServiceCard
                        key={svc.key}
                        svc={svc}
                        onToggle={() => toggleMut.mutate(svc.key)}
                        onMaintenance={(enabled, msg) => maintMut.mutate({ key: svc.key, isMaintenance: enabled, maintenanceMsg: msg })}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Right: Health Monitor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Service Health Monitor</h2>
            <Button size="sm" variant="secondary" onClick={fetchHealth} loading={healthLoading}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
          {healthData && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" /> Infrastructure
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex gap-3">
                  {Object.entries(healthData.infrastructure).map(([k, v]) => (
                    <div key={k} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${STATUS_COLORS[v as keyof typeof STATUS_COLORS] || 'text-text-muted bg-bg-elevated'}`}>
                      {getStatusIcon(v)}
                      {k.charAt(0).toUpperCase() + k.slice(1)}: {v}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="text-[10px] text-text-muted">Last checked: {new Date(healthData.checkedAt).toLocaleTimeString()} · Auto-refreshes every 60s</div>
              <div className="grid grid-cols-2 gap-2">
                {healthData.services.map(svc => (
                  <div key={svc.key} className={`p-3 rounded-lg border ${svc.status === 'healthy' ? 'border-success/20 bg-success/5' : svc.status === 'maintenance' ? 'border-warning/20 bg-warning/5' : 'border-danger/20 bg-danger/5'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {getStatusIcon(svc.status)}
                      <span className="text-xs font-medium text-text-primary">{svc.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-muted">{CATEGORY_LABELS[svc.category] || svc.category}</span>
                      <span className={`text-[10px] font-medium ${STATUS_COLORS[svc.status]?.split(' ')[0]}`}>{svc.status}</span>
                    </div>
                    {svc.message && <p className="text-[10px] text-warning mt-1">{svc.message}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
          {!healthData && healthLoading && (
            <div className="text-center py-8 text-text-muted text-xs">Running health checks...</div>
          )}
        </div>
      </div>
    </div>
  )
}
