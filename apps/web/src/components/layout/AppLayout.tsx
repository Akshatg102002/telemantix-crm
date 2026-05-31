import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

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


export function AppLayout() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] || pageTitles[Object.keys(pageTitles).find(k => k !== '/' && pathname.startsWith(k)) || ''] || ''

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
