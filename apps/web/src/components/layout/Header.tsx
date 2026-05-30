import { Bell, Search, Plus, LogOut, User, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { useNotifStore } from '../../store/notifications'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Badge } from '../ui/badge'
import { api } from '../../lib/api'

export function Header({ title }: { title?: string }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const unreadCount = useNotifStore(s => s.unreadCount)

  const handleLogout = async () => {
    try { await api.post('/auth/logout', { refreshToken: useAuthStore.getState().refreshToken }) } catch {}
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-bg-surface/80 backdrop-blur border-b border-border shrink-0 sticky top-0 z-10">
      {title && (
        <h1 className="font-heading font-semibold text-text-primary text-lg">{title}</h1>
      )}
      <div className="flex-1 max-w-md ml-4">
        <Input icon={<Search className="h-3.5 w-3.5" />} placeholder="Search leads, contacts..." className="h-8 text-xs" />
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => navigate('/leads?new=1')}>
          <Plus className="h-3.5 w-3.5" /> Add Lead
        </Button>
        <button
          className="relative h-8 w-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          onClick={() => navigate('/notifications')}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] leading-none" variant="danger">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full bg-brand-gradient flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="font-medium text-text-primary">{user?.name}</p>
              <p className="text-[10px] text-text-muted font-normal mt-0.5">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border my-1" />
            <DropdownMenuItem onClick={() => navigate('/profile')}><User className="h-3.5 w-3.5" /> Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}><Settings className="h-3.5 w-3.5" /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border my-1" />
            <DropdownMenuItem onClick={handleLogout} className="text-danger hover:text-danger">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
