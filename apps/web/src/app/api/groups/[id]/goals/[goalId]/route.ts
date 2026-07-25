import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { z } from 'zod';

const contributeSchema = z.object({ savedAmount: z.number().int().min(0) });

// PATCH /api/groups/[id]/goals/[goalId] → actualizar aporte
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> },
) {
  const { id: groupId, goalId } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, groupId);
  if (membership instanceof NextResponse) return membership;

  const body = await req.json().catch(() => null);
  const parsed = contributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const goal = await prisma.savingGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.groupId !== groupId) {
    return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 });
  }

  const updated = await prisma.savingGoal.update({
    where: { id: goalId },
    data: { savedAmount: parsed.data.savedAmount },
  });
  return NextResponse.json(updated);
}
