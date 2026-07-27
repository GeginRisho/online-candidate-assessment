import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { verifyAccessToken } from '@utils/jwt';

export const SOCKET_EVENTS = {
  // Candidate -> Server
  CANDIDATE_JOIN_SESSION: 'candidate:join_session',
  CANDIDATE_HEARTBEAT: 'candidate:heartbeat',
  CANDIDATE_WARNING: 'candidate:warning',
  CANDIDATE_SUBMIT: 'candidate:submit',

  // Server -> Admin (monitoring room)
  ADMIN_JOIN_MONITOR: 'admin:join_monitor',
  SESSION_UPDATE: 'session:update',
  SESSION_WARNING: 'session:warning',
  SESSION_DISQUALIFIED: 'session:disqualified',
  SESSION_STARTED: 'session:started',
  SESSION_COMPLETED: 'session:completed',
} as const;

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins = env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''));
  const fallbacks = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://online-candidate-assessment.vercel.app'
  ];
  fallbacks.forEach((url) => {
    if (!allowedOrigins.includes(url)) {
      allowedOrigins.push(url);
    }
  });

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.trim().replace(/\/$/, '');
        if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    },
    pingInterval: 15000,
    pingTimeout: 10000,
  });


  io.use((socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers.authorization?.replace('Bearer ', '') as string | undefined);

      if (!token) return next(new Error('Authentication required'));

      const payload = verifyAccessToken(token);
      socket.data.user = { id: payload.sub, role: payload.role, email: payload.email };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as { id: string; role: string };
    logger.info({ socketId: socket.id, userId: user.id, role: user.role }, 'Socket connected');

    if (user.role === 'CANDIDATE') {
      socket.on(SOCKET_EVENTS.CANDIDATE_JOIN_SESSION, (examSessionId: string) => {
        socket.join(`session:${examSessionId}`);
        socket.join(`candidate:${user.id}`);
      });
    }

    if (user.role === 'ADMIN') {
      socket.on(SOCKET_EVENTS.ADMIN_JOIN_MONITOR, (examId: string) => {
        socket.join(`monitor:${examId}`);
      });
    }

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, userId: user.id, reason }, 'Socket disconnected');
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer {
  if (!io) throw new Error('Socket.IO server has not been initialized yet');
  return io;
}

/** Broadcast a live-monitoring event to all admins watching a given exam. */
export function emitToMonitors(examId: string, event: string, payload: unknown): void {
  getSocketServer().to(`monitor:${examId}`).emit(event, payload);
}

/** Push a server-initiated event to a specific candidate's session room. */
export function emitToSession(examSessionId: string, event: string, payload: unknown): void {
  getSocketServer().to(`session:${examSessionId}`).emit(event, payload);
}
