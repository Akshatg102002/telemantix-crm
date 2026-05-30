import { create } from 'zustand'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
}

interface NotifState {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Notification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  setNotifications: (ns: Notification[]) => void
}

export const useNotifStore = create<NotifState>()(set => ({
  notifications: [],
  unreadCount: 0,
  addNotification: n =>
    set(s => ({ notifications: [n, ...s.notifications], unreadCount: s.unreadCount + 1 })),
  markRead: id =>
    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
  markAllRead: () =>
    set(s => ({ notifications: s.notifications.map(n => ({ ...n, isRead: true })), unreadCount: 0 })),
  setNotifications: ns =>
    set({ notifications: ns, unreadCount: ns.filter(n => !n.isRead).length }),
}))
