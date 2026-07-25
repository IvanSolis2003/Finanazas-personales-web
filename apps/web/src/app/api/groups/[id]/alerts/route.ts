import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';

// GET /api/groups/[id]/alerts → alertas no leídas
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const alerts = await prisma.alert.findMany({
    where: { groupId: id, isRead: false },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(alerts);
}
