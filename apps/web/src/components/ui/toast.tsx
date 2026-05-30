import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = { success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info }
const colors = {
  success: 'border-success/30 bg-success/10',
  error: 'border-danger/30 bg-danger/10',
  warning: 'border-warning/30 bg-warning/10',
  info: 'border-info/30 bg-info/10',
}
const iconColors = { success: 'text-success', error: 'text-danger', warning: 'text-warning', info: 'text-info' }

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: () => void }) {
  const Icon = icons[t.type]
  useEffect(() => {
    const timer = setTimeout(onRemove, 4000)
    return () => clearTimeout(timer)
  }, [onRemove])

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      className={cn('flex items-start gap-3 rounded-lg border p-4 w-80 shadow-xl', colors[t.type])}
    >
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColors[t.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{t.title}</p>
        {t.description && <p className="text-xs text-text-secondary mt-0.5">{t.description}</p>}
      </div>
      <button onClick={onRemove} className="text-text-muted hover:text-text-primary shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => setToasts(ts => ts.filter(t => t.id !== id)), [])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts(ts => [...ts, { ...t, id }])
  }, [])

  const success = useCallback((title: string, description?: string) => toast({ type: 'success', title, description }), [toast])
  const error = useCallback((title: string, description?: string) => toast({ type: 'error', title, description }), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />)}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
