import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { attributeSpending } from '@/lib/memberSpending';

// GET /api/groups/[id]/members-breakdown?month=&year=
// Ingreso (sueldo) vs gasto atribuido de cada miembro en el mes.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const now = new Date();
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get('month') ?? now.getMonth() + 1);
  const year = Number(searchParams.get('year') ?? now.getFullYear());
  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);

  const [members, expenses] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId: id },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.expense.findMany({
      where: { groupId: id, date: { gte: startOfMonth, lt: startOfNextMonth } },
      select: { amount: true, category: true, type: true, splitBetween: true, paidById: true },
    }),
  ]);

  const memberIds = members.map((m) => m.userId);
  const { total, byCategory } = attributeSpending(expenses, memberIds);

  const breakdown = members.map((m) => {
    // El sueldo se muestra si es visible o si es el propio usuario.
    const canSeeIncome = m.salaryVisible || m.userId === auth.userId;
    const income = canSeeIncome ? m.monthlySalary : null;
    const spent = total[m.userId] ?? 0;
    return {
      userId: m.userId,
      name: m.user.name,
      isSelf: m.userId === auth.userId,
      incomeVisible: canSeeIncome,
      income,
      spent,
      byCategory: byCategory[m.userId] ?? {},
      over: income !== null ? spent > income : false,
      remaining: income !== null ? income - spent : null,
    };
  });

  return NextResponse.json(breakdown);
}
