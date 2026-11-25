import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { GAME_CATALOG, type ClientToServerEvents, type ServerToClientEvents } from '@chaos/shared';
import { env } from './config/env';
import { authRouter } from './auth/authRouter';
import { RoomManager } from './rooms/roomManager';
import { registerSocketHandlers } from './sockets/socketHandler';

export function createChaosServer() {
  const app = express();
  const server = http.createServer(app);

  const allowedOrigins = env.FRONTEND_URL.split(',').map((o) => o.trim());

  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '256kb' }));

  const roomManager = new RoomManager();

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'chaos-server',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/games', (_req, res) => {
    res.json({ ok: true, games: GAME_CATALOG });
  });

  app.get('/api/rooms/public', (_req, res) => {
    res.json({ ok: true, rooms: roomManager.listPublicRooms() });
  });

  app.use('/api/auth', authRouter);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingTimeout: 20_000,
    pingInterval: 25_000,
  });

  registerSocketHandlers(io, roomManager);

  return { app, server, io, roomManager };
}

if (require.main === module) {
  const { server } = createChaosServer();
  server.listen(env.PORT, () => {
    console.log(`[CHAOS Server] Listening on http://localhost:${env.PORT}`);
  });
}
