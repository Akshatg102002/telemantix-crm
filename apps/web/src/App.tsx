import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { LeadsPage } from './pages/LeadsPage'
import { LeadDetailPage } from './pages/LeadDetailPage'
import { FollowUpsPage } from './pages/FollowUpsPage'
import { TasksPage } from './pages/TasksPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AutomationPage } from './pages/AutomationPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { PublishersPage } from './pages/PublishersPage'
import { ServiceBoardsPage } from './pages/ServiceBoardsPage'
import { UsersPage } from './pages/UsersPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { SettingsPage } from './pages/SettingsPage'
import { PipelinePage } from './pages/PipelinePage'
import { ToastProvider } from './components/ui/toast'
import { useAuthStore } from './store/auth'
import { connectSocket, disconnectSocket } from './lib/socket'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore(s => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const accessToken = useAuthStore(s => s.accessToken)

  useEffect(() => {
    if (accessToken) connectSocket()
    else disconnectSocket()
  }, [accessToken])

  return (
    <ToastProvider>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<DashboardPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="follow-ups" element={<FollowUpsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="automation" element={<AutomationPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="publishers" element={<PublishersPage />} />
            <Route path="service-boards" element={<ServiceBoardsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </ToastProvider>
  )
}
