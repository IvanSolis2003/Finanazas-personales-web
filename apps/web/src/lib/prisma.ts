import { PrismaClient } from '@prisma/client';

// Singleton para evitar múltiples instancias de PrismaClient en desarrollo
// (Next.js recarga módulos en cada cambio con HMR).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
