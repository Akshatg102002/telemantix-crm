import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

// Leads
export function useLeads(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => api.get('/leads', { params }).then(r => r.data),
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => api.get(`/leads/${id}`).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post('/leads', data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch(`/leads/${id}`, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

// Follow-ups
export function useFollowUps(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['follow-ups', params],
    queryFn: () => api.get('/follow-ups', { params }).then(r => r.data),
  })
}

// Tasks
export function useTasks(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => api.get('/tasks', { params }).then(r => r.data),
  })
}

// Analytics
export function useAnalytics(type: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['analytics', type, params],
    queryFn: () => api.get(`/analytics/${type}`, { params }).then(r => r.data.data),
  })
}

// Service Boards
export function useServiceBoards() {
  return useQuery({
    queryKey: ['service-boards'],
    queryFn: () => api.get('/service-boards').then(r => r.data.data),
  })
}

// Users
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data.data),
  })
}

// Notifications
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
  })
}

// Automations
export function useAutomations() {
  return useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get('/automations').then(r => r.data.data),
  })
}

// Integrations
export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get('/integrations').then(r => r.data.data),
  })
}

// Publishers
export function usePublishers() {
  return useQuery({
    queryKey: ['publishers'],
    queryFn: () => api.get('/publishers').then(r => r.data.data),
  })
}
