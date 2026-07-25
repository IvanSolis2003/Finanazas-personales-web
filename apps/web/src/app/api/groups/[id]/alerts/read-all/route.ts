import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';

// PATCH /api/groups/[id]/alerts/read-all → marcar todas como leídas
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  await prisma.alert.updateMany({
    where: { groupId: id, isRead: false },
    data: { isRead: true },
  });
  return NextResponse.json({ message: 'Alertas marcadas como leídas' });
}
