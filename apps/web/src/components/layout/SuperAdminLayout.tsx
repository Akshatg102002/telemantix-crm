import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Building2, CreditCard, DollarSign, Settings, LogOut, Shield } from 'lucide-react'
import { useSuperAdminStore } from '../../store/superAdmin'
import { cn } from '../../lib/utils'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/super-admin/dashboard' },
  { label: 'Companies', icon: Building2, href: '/super-admin/companies' },
  { label: 'Plans', icon: CreditCard, href: '/super-admin/plans' },
  { label: 'Revenue', icon: DollarSign, href: '/super-admin/revenue' },
  { label: 'Settings', icon: Settings, href: '/super-admin/settings' },
]

export function SuperAdminLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { admin, logout } = useSuperAdminStore()

  const handleLogout = () => {
    logout()
    navigate('/super-admin/login')
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col h-screen bg-bg-surface border-r border-danger/20 shrink-0">
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-danger/20">
          <div className="h-7 w-7 rounded-lg bg-danger/10 border border-danger/30 flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-danger" />
          </div>
          <div>
            <p className="text-xs font-heading font-bold text-text-primary">Super Admin</p>
            <p className="text-[10px] text-danger">Restricted Access</p>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all',
                  active ? 'bg-danger/10 text-danger' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
                )}
              >
                <item.icon className={cn('h-3.5 w-3.5', active ? 'text-danger' : 'text-text-muted')} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-danger/20">
          <div className="flex items-center gap-2 text-xs mb-2">
            <div className="h-6 w-6 rounded-full bg-danger/20 flex items-center justify-center text-danger font-bold text-[10px]">
              {admin?.name?.[0] || 'S'}
            </div>
            <div className="min-w-0">
              <p className="text-text-primary font-medium truncate">{admin?.name}</p>
              <p className="text-text-muted truncate">{admin?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center px-6 bg-bg-surface/80 border-b border-danger/10 backdrop-blur shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-danger font-medium px-2 py-0.5 rounded bg-danger/10 border border-danger/20">ADMIN MODE</span>
            <span className="text-xs text-text-muted">Telemantix Master Control Panel</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
