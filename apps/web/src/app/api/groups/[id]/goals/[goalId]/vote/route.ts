import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { voteSchema } from '@/lib/validations';

// POST /api/groups/[id]/goals/[goalId]/vote → aprobar/rechazar una meta
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> },
) {
  const { id: groupId, goalId } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, groupId);
  if (membership instanceof NextResponse) return membership;

  const body = await req.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const goal = await prisma.savingGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.groupId !== groupId) {
    return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 });
  }
  if (goal.status !== 'PENDING') {
    return NextResponse.json({ error: 'La meta ya fue resuelta' }, { status: 409 });
  }

  await prisma.goalVote.upsert({
    where: { goalId_userId: { goalId, userId: auth.userId } },
    update: { vote: parsed.data.vote },
    create: { goalId, userId: auth.userId, vote: parsed.data.vote },
  });

  if (parsed.data.vote === 'REJECT') {
    const updated = await prisma.savingGoal.update({
      where: { id: goalId },
      data: { status: 'REJECTED' },
    });
    return NextResponse.json(updated);
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  const totalMembers = group!.members.length;
  const allVotes = await prisma.goalVote.findMany({ where: { goalId } });
  const approveCount = allVotes.filter((v) => v.vote === 'APPROVE').length;
  const required = Math.floor(totalMembers / 2) + 1;

  const approved =
    group!.approvalMode === 'MAJORITY' ? approveCount >= required : approveCount === totalMembers;

  if (approved) {
    const updated = await prisma.savingGoal.update({
      where: { id: goalId },
      data: { status: 'APPROVED' },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ message: 'Voto registrado', approveCount, required });
}
