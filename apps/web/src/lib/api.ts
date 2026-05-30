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
  const tenant = useAuthStore.getState().tenant?.slug || 'demo'
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['x-tenant'] = tenant
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
          refreshing = axios
            .post(`${BASE_URL}/auth/refresh`, { refreshToken: rt }, {
              headers: { 'x-tenant': 'demo' },
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