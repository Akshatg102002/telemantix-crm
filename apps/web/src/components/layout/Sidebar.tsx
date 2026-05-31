import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Target, Calendar, Zap, BarChart3, Plug, Settings,
  Bell, CheckSquare, FolderKanban, Globe, BookOpen, ChevronLeft, ChevronRight,
  CreditCard, MessageSquare, UserCircle2, Shield, FolderInput
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useUiStore } from '../../store/ui'
import { useAuthStore } from '../../store/auth'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'

const navGroups = [
  {
    label: 'CRM',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Leads', icon: Target, href: '/leads' },
      { label: 'Contacts', icon: UserCircle2, href: '/contacts' },
      { label: 'Pipeline', icon: FolderKanban, href: '/pipeline' },
      { label: 'Follow-ups', icon: Calendar, href: '/follow-ups' },
      { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'WA Campaigns', icon: MessageSquare, href: '/whatsapp-campaigns' },
      { label: 'Automation', icon: Zap, href: '/automation' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', icon: BarChart3, href: '/analytics' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Integrations', icon: Plug, href: '/integrations' },
      { label: 'Service Boards', icon: BookOpen, href: '/service-boards' },
      { label: 'Publishers', icon: Globe, href: '/publishers' },
      { label: 'Users', icon: Users, href: '/users' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Notifications', icon: Bell, href: '/notifications' },
      { label: 'Import/Export', icon: FolderInput, href: '/tools' },
      { label: 'Feature Access', icon: Shield, href: '/feature-access' },
      { label: 'Security', icon: Shield, href: '/security' },
      { label: 'Billing', icon: CreditCard, href: '/billing' },
      { label: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore()
  const { pathname } = useLocation()
  const user = useAuthStore(s => s.user)

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 220 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative flex flex-col h-screen bg-bg-surface border-r border-border shrink-0 overflow-hidden z-20"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <div className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0">
            <span className="font-heading font-bold text-white text-sm">T</span>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-heading font-bold text-text-primary text-base whitespace-nowrap"
              >
                Telemantix
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-2.5 mb-1 text-[9px] font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = isActive(item.href)
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          className={cn(
                            'relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs transition-all duration-150 group',
                            active
                              ? 'bg-brand-purple/15 text-brand-purple font-medium'
                              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
                          )}
                        >
                          <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand-purple' : 'text-text-muted group-hover:text-text-secondary')} />
                          <AnimatePresence>
                            {!sidebarCollapsed && (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="whitespace-nowrap overflow-hidden"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          {active && (
                            <motion.div layoutId="activeNav" className="absolute left-0 w-0.5 h-5 bg-brand-purple rounded-r" />
                          )}
                        </Link>
                      </TooltipTrigger>
                      {sidebarCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          <div className={cn('flex items-center gap-2.5', sidebarCollapsed && 'justify-center')}>
            <div className="h-7 w-7 rounded-full bg-brand-gradient flex items-center justify-center shrink-0 text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{user?.name}</p>
                  <p className="text-[10px] text-text-muted capitalize">{user?.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors shadow-md"
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </motion.aside>
    </TooltipProvider>
  )
}
