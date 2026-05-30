import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/auth'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
      autoConnect: false,
      auth: cb => cb({ token: useAuthStore.getState().accessToken }),
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
