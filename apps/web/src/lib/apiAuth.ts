import 'server-only';
import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Helper para API Routes: obtiene el userId de la sesión o lanza una respuesta
 * 401. Uso:
 *   const auth = await requireUser();
 *   if (auth instanceof NextResponse) return auth;
 *   const { userId } = auth;
 */
export async function requireUser(): Promise<{ userId: string } | NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  return { userId };
}

/**
 * Verifica que el usuario pertenezca al grupo. Devuelve la membresía o una
 * respuesta 403.
 */
export async function requireMembership(userId: string, groupId: string) {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!member) {
    return NextResponse.json({ error: 'No perteneces a este grupo' }, { status: 403 });
  }
  return member;
}
