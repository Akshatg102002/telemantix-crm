import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { SuperAdminLayout } from './components/layout/SuperAdminLayout'

// Public
import { LandingPage } from './pages/public/LandingPage'
import { SignupPage } from './pages/public/SignupPage'
import { LoginPage } from './pages/LoginPage'

// CRM
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
import { BillingPage } from './pages/BillingPage'
import { ContactsPage } from './pages/ContactsPage'
import { WhatsAppCampaignsPage } from './pages/WhatsAppCampaignsPage'
import { FeatureAccessPage } from './pages/FeatureAccessPage'
import { SecurityPage } from './pages/SecurityPage'
import { ImportExportPage } from './pages/ImportExportPage'

// Super Admin
import { SuperAdminLogin } from './pages/super-admin/SuperAdminLogin'
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard'
import { SuperAdminCompanies } from './pages/super-admin/SuperAdminCompanies'
import { SuperAdminPlans } from './pages/super-admin/SuperAdminPlans'
import { SuperAdminRevenue } from './pages/super-admin/SuperAdminRevenue'
import { SuperAdminSettings } from './pages/super-admin/SuperAdminSettings'
import { SuperAdminAnalytics } from './pages/super-admin/SuperAdminAnalytics'
import { SuperAdminUsers } from './pages/super-admin/SuperAdminUsers'
import { SuperAdminFeatureFlags } from './pages/super-admin/SuperAdminFeatureFlags'
import { SuperAdminMonitoring } from './pages/super-admin/SuperAdminMonitoring'
import { SuperAdminAuditLogs } from './pages/super-admin/SuperAdminAuditLogs'

import { ToastProvider } from './components/ui/toast'
import { useAuthStore } from './store/auth'
import { useSuperAdminStore } from './store/superAdmin'
import { connectSocket, disconnectSocket } from './lib/socket'
import { useThemeStore } from './store/theme'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore(s => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const token = useSuperAdminStore(s => s.token)
  if (!token) return <Navigate to="/super-admin/login" replace />
  return <>{children}</>
}

export default function App() {
  const accessToken = useAuthStore(s => s.accessToken)
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  useEffect(() => {
    if (accessToken) connectSocket()
    else disconnectSocket()
  }, [accessToken])

  return (
    <ToastProvider>
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* ── Authenticated CRM ── */}
        <Route path="/dashboard" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
        </Route>
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/follow-ups" element={<FollowUpsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/whatsapp-campaigns" element={<WhatsAppCampaignsPage />} />
          <Route path="/automation" element={<AutomationPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/publishers" element={<PublishersPage />} />
          <Route path="/service-boards" element={<ServiceBoardsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/feature-access" element={<FeatureAccessPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/tools" element={<ImportExportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* ── Super Admin ── */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<RequireSuperAdmin><SuperAdminLayout /></RequireSuperAdmin>}>
          <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="companies" element={<SuperAdminCompanies />} />
          <Route path="users" element={<SuperAdminUsers />} />
          <Route path="plans" element={<SuperAdminPlans />} />
          <Route path="revenue" element={<SuperAdminRevenue />} />
          <Route path="analytics" element={<SuperAdminAnalytics />} />
          <Route path="feature-flags" element={<SuperAdminFeatureFlags />} />
          <Route path="audit-logs" element={<SuperAdminAuditLogs />} />
          <Route path="monitoring" element={<SuperAdminMonitoring />} />
          <Route path="settings" element={<SuperAdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
