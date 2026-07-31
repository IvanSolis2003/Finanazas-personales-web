import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { goalSchema } from '@/lib/validations';

// GET /api/groups/[id]/goals → listar metas
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const goals = await prisma.savingGoal.findMany({
    where: { groupId: id },
    include: { votes: { select: { userId: true, vote: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(goals);
}

// POST /api/groups/[id]/goals → crear meta
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const body = await req.json().catch(() => null);
  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // La meta queda PENDIENTE hasta que los miembros la aprueben.
  const goal = await prisma.savingGoal.create({
    data: {
      groupId: id,
      proposedById: auth.userId,
      name: parsed.data.name,
      targetAmount: parsed.data.targetAmount,
      targetDate: new Date(parsed.data.targetDate),
    },
  });
  return NextResponse.json(goal, { status: 201 });
}
