import axios from 'axios'
import { useSuperAdminStore } from '../store/superAdmin'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const superAdminApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

superAdminApi.interceptors.request.use(config => {
  const token = useSuperAdminStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

superAdminApi.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useSuperAdminStore.getState().logout()
      window.location.href = '/super-admin/login'
    }
    return Promise.reject(err)
  },
)
