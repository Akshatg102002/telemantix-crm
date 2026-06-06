import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X, AlertTriangle } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { api } from '../../lib/api'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/contacts': 'People & Contacts',
  '/pipeline': 'Pipeline',
  '/follow-ups': 'Follow-ups',
  '/tasks': 'Tasks',
  '/analytics': 'Analytics',
  '/whatsapp-campaigns': 'WhatsApp Campaigns',
  '/automation': 'Automation',
  '/integrations': 'Integrations',
  '/publishers': 'Publishers',
  '/service-boards': 'Service Boards',
  '/users': 'Users',
  '/notifications': 'Notifications',
  '/feature-access': 'Feature Access',
  '/security': 'Security',
  '/tools': 'Import / Export',
  '/billing': 'Billing',
  '/settings': 'Settings',
  '/profile': 'Profile',
}

interface ServiceStatus {
  key: string
  name: string
  isMaintenance: boolean
  maintenanceMsg: string | null
  effectiveEnabled: boolean
}

function MaintenanceBanner({ services, onDismiss }: { services: ServiceStatus[]; onDismiss: (key: string) => void }) {
  const maintenanceServices = services.filter(s => s.isMaintenance && s.effectiveEnabled)
  if (maintenanceServices.length === 0) return null
  return (
    <div className="flex flex-col gap-1">
      {maintenanceServices.map(svc => (
        <div key={svc.key} className="flex items-center gap-3 px-4 py-2 bg-warning/10 border-b border-warning/20 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            <span className="font-medium">{svc.name}</span> is under maintenance.{' '}
            {svc.maintenanceMsg && <span className="text-warning/80">{svc.maintenanceMsg}</span>}
          </span>
          <button onClick={() => onDismiss(svc.key)} className="hover:opacity-70 shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] || pageTitles[Object.keys(pageTitles).find(k => k !== '/' && pathname.startsWith(k)) || ''] || ''
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/settings/my-services')
        setServiceStatuses(res.data.data || [])
      } catch { /* non-fatal */ }
    }
    fetchStatus()
  }, [])

  const DISMISSED_KEY = 'maintenance_dismissed'
  useEffect(() => {
    const stored = sessionStorage.getItem(DISMISSED_KEY)
    if (stored) setDismissed(JSON.parse(stored))
  }, [])

  const handleDismiss = (key: string) => {
    const newDismissed = [...dismissed, key]
    setDismissed(newDismissed)
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(newDismissed))
  }

  const visibleServices = serviceStatuses.filter(s => !dismissed.includes(s.key))

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} />
        <MaintenanceBanner services={visibleServices} onDismiss={handleDismiss} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
