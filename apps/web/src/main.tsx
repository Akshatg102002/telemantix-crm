import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { useThemeStore, applyTheme } from './store/theme'

// Apply saved theme before React mounts (prevents flash)
const savedTheme = (() => {
  try {
    const stored = localStorage.getItem('tmx-theme')
    if (stored) return (JSON.parse(stored) as { state: { theme: string } }).state.theme as 'dark' | 'light'
  } catch { /* ignore */ }
  return 'dark'
})()
applyTheme(savedTheme)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
