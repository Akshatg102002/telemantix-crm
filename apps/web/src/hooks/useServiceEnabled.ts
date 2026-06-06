import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

interface ServiceStatus {
  key: string
  effectiveEnabled: boolean
  isMaintenance: boolean
  maintenanceMsg: string | null
}

export function useServiceEnabled(serviceKey: string): boolean {
  const { data } = useQuery<ServiceStatus[]>({
    queryKey: ['my-services'],
    queryFn: () => api.get('/settings/my-services').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  if (!data) return true // default to enabled while loading
  const svc = data.find(s => s.key === serviceKey)
  if (!svc) return true // if not found, assume enabled (no record = default)
  return svc.effectiveEnabled && !svc.isMaintenance
}
