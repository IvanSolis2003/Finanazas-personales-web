import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';

// POST /api/groups/[id]/recurring/apply?month=&year=
// Crea (si faltan) los gastos de las plantillas fijas para ese mes. Idempotente:
// no duplica, y no crea meses anteriores a la creación de la plantilla.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const now = new Date();
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get('month') ?? now.getMonth() + 1);
  const year = Number(searchParams.get('year') ?? now.getFullYear());
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const targetYM = year * 12 + (month - 1);

  const templates = await prisma.recurringExpense.findMany({
    where: { groupId: id, active: true },
  });
  if (templates.length === 0) return NextResponse.json({ created: 0 });

  // Gastos fijos ya materializados en este mes.
  const existing = await prisma.expense.findMany({
    where: {
      groupId: id,
      date: { gte: monthStart, lt: monthEnd },
      recurringId: { in: templates.map((t) => t.id) },
    },
    select: { recurringId: true },
  });
  const done = new Set(existing.map((e) => e.recurringId));

  const toCreate = templates.filter((t) => {
    if (done.has(t.id)) return false;
    // No crear en meses anteriores a la creación de la plantilla.
    const createdYM = t.createdAt.getUTCFullYear() * 12 + t.createdAt.getUTCMonth();
    return targetYM >= createdYM;
  });

  if (toCreate.length > 0) {
    await prisma.expense.createMany({
      data: toCreate.map((t) => ({
        groupId: id,
        paidById: t.paidById,
        description: t.description,
        amount: t.amount,
        category: t.category,
        type: t.type,
        splitBetween: t.splitBetween,
        recurringId: t.id,
        date: new Date(Date.UTC(year, month - 1, 1, 12)),
      })),
    });
  }

  return NextResponse.json({ created: toCreate.length });
}
