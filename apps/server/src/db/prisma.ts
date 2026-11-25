import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient | null =
  env.DATABASE_URL && env.NODE_ENV !== 'test'
    ? (globalForPrisma.prisma ??
      new PrismaClient({
        log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      }))
    : null;

if (prisma && env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
