import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { recurringSchema } from '@/lib/validations';

// GET /api/groups/[id]/recurring → plantillas de gastos fijos activas
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const recurring = await prisma.recurringExpense.findMany({
    where: { groupId: id, active: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(recurring);
}

// POST /api/groups/[id]/recurring → crear plantilla de gasto fijo
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const body = await req.json().catch(() => null);
  const parsed = recurringSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { description, amount, category, type, splitBetween } = parsed.data;
  const recurring = await prisma.recurringExpense.create({
    data: {
      groupId: id,
      paidById: auth.userId,
      description,
      amount,
      category,
      type,
      splitBetween: type === 'SHARED' ? splitBetween ?? [] : [],
    },
  });
  return NextResponse.json(recurring, { status: 201 });
}
