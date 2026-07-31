import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { z } from 'zod';

const contributeSchema = z.object({ amount: z.number().int().positive() });

// PATCH /api/groups/[id]/goals/[goalId] → registrar un APORTE a la meta.
// Solo si la meta está aprobada. Baja el disponible del mes en curso.
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
  if (goal.status !== 'APPROVED') {
    return NextResponse.json(
      { error: 'La meta debe estar aprobada para poder aportar' },
      { status: 409 },
    );
  }

  // Registrar el aporte (con fecha) y sumar al ahorrado.
  await prisma.goalContribution.create({
    data: { goalId, groupId, userId: auth.userId, amount: parsed.data.amount },
  });
  const updated = await prisma.savingGoal.update({
    where: { id: goalId },
    data: { savedAmount: { increment: parsed.data.amount } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/groups/[id]/goals/[goalId] → eliminar la meta (proponente o admin)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> },
) {
  const { id: groupId, goalId } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, groupId);
  if (membership instanceof NextResponse) return membership;

  const goal = await prisma.savingGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.groupId !== groupId) {
    return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 });
  }
  if (goal.proposedById !== auth.userId && membership.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  await prisma.goalVote.deleteMany({ where: { goalId } });
  await prisma.goalContribution.deleteMany({ where: { goalId } });
  await prisma.savingGoal.delete({ where: { id: goalId } });
  return NextResponse.json({ message: 'Meta eliminada' });
}
