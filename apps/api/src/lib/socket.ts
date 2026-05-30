import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { redis } from './redis';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    adapter: undefined, // use Redis adapter in production
  });

  io.on('connection', (socket: Socket) => {
    socket.on('room:join', ({ tenantId }: { tenantId: string }) => {
      socket.join(`tenant:${tenantId}`);
    });
    socket.on('room:leave', ({ tenantId }: { tenantId: string }) => {
      socket.leave(`tenant:${tenantId}`);
    });
    socket.on('disconnect', () => {});
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToTenant(tenantId: string, event: string, data: unknown): void {
  getIo().to(`tenant:${tenantId}`).emit(event, data);
}
