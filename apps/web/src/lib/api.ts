import axios from 'axios'
import { useAuthStore } from '../store/auth'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-tenant': 'demo',
  },
})

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken
  const tenant = useAuthStore.getState().tenant?.slug

  if (token) config.headers.Authorization = `Bearer ${token}`

  // Only set x-tenant from store if not already set by the caller.
  // This allows login (and any other pre-auth call) to pass the tenant
  // explicitly per-request without the interceptor overwriting it.
  if (!config.headers['x-tenant']) {
    config.headers['x-tenant'] = tenant || 'demo'
  }

  return config
})

let refreshing: Promise<string> | null = null

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshing) {
          const rt = useAuthStore.getState().refreshToken
          // Use the tenant from the store (or fall back to the tenant on the
          // original failed request) so the refresh call hits the right tenant.
          const tenant =
            useAuthStore.getState().tenant?.slug ||
            original.headers['x-tenant'] ||
            'demo'
          refreshing = axios
            .post(`${BASE_URL}/auth/refresh`, { refreshToken: rt }, {
              headers: { 'x-tenant': tenant },
            })
            .then(r => {
              const { accessToken, refreshToken } = r.data.data
              useAuthStore.getState().setTokens(accessToken, refreshToken)
              return accessToken
            })
            .finally(() => { refreshing = null })
        }
        const newToken = await refreshing
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)