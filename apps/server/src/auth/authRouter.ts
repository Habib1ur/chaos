import crypto from 'node:crypto';
import { Router } from 'express';
import { authLoginSchema, authRegisterSchema, nicknameSchema } from '@chaos/shared';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../utils/crypto';

export interface AuthUserRecord {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarId: string;
  passwordHash: string;
  role: 'user' | 'admin';
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  createdAt: number;
}

// In-memory store for dev/test when PostgreSQL is not yet connected.
// When DATABASE_URL is configured and Prisma is available, routes can persist to Supabase PostgreSQL.
const usersByEmail = new Map<string, AuthUserRecord>();

export const authRouter = Router();

authRouter.post('/guest', (req, res) => {
  const parsed = nicknameSchema.safeParse(req.body?.nickname ?? 'ChaosGuest');
  const nickname = parsed.success ? parsed.data : 'ChaosGuest';
  const avatarId = typeof req.body?.avatarId === 'string' ? req.body.avatarId : 'fox';
  const guestId = `guest-${crypto.randomUUID().slice(0, 8)}`;
  const token = signToken({ type: 'guest', guestId, nickname, avatarId });
  res.json({
    ok: true,
    user: { id: guestId, nickname, avatarId, isGuest: true },
    token,
  });
});

authRouter.post('/register', (req, res) => {
  const parsed = authRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  if (usersByEmail.has(email)) {
    res.status(409).json({ ok: false, error: 'An account with that email already exists.' });
    return;
  }

  const record: AuthUserRecord = {
    id: `usr-${crypto.randomUUID().slice(0, 8)}`,
    email,
    username: parsed.data.username,
    displayName: parsed.data.displayName,
    avatarId: 'fox',
    passwordHash: hashPassword(parsed.data.password),
    role: 'user',
    gamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0,
    createdAt: Date.now(),
  };
  usersByEmail.set(email, record);

  const token = signToken({ type: 'user', userId: record.id, email: record.email });
  res.status(201).json({
    ok: true,
    user: {
      id: record.id,
      email: record.email,
      username: record.username,
      displayName: record.displayName,
      avatarId: record.avatarId,
      isGuest: false,
    },
    token,
  });
});

authRouter.post('/login', (req, res) => {
  const parsed = authLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'Email and password are required.' });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const record = usersByEmail.get(email);
  if (!record || !verifyPassword(parsed.data.password, record.passwordHash)) {
    res.status(401).json({ ok: false, error: 'Invalid email or password.' });
    return;
  }
  const token = signToken({ type: 'user', userId: record.id, email: record.email });
  res.json({
    ok: true,
    user: {
      id: record.id,
      email: record.email,
      username: record.username,
      displayName: record.displayName,
      avatarId: record.avatarId,
      isGuest: false,
      gamesPlayed: record.gamesPlayed,
      gamesWon: record.gamesWon,
      totalScore: record.totalScore,
    },
    token,
  });
});

authRouter.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ ok: false, error: 'Not authenticated' });
    return;
  }
  const payload = verifyToken<{ type: string; email?: string; guestId?: string; nickname?: string; avatarId?: string }>(
    token
  );
  if (!payload) {
    res.status(401).json({ ok: false, error: 'Invalid session token' });
    return;
  }
  if (payload.type === 'guest') {
    res.json({
      ok: true,
      user: {
        id: payload.guestId,
        nickname: payload.nickname,
        avatarId: payload.avatarId ?? 'fox',
        isGuest: true,
      },
    });
    return;
  }
  const record = payload.email ? usersByEmail.get(payload.email) : undefined;
  if (!record) {
    res.status(404).json({ ok: false, error: 'User not found' });
    return;
  }
  res.json({
    ok: true,
    user: {
      id: record.id,
      email: record.email,
      username: record.username,
      displayName: record.displayName,
      avatarId: record.avatarId,
      isGuest: false,
      gamesPlayed: record.gamesPlayed,
      gamesWon: record.gamesWon,
      totalScore: record.totalScore,
    },
  });
});
