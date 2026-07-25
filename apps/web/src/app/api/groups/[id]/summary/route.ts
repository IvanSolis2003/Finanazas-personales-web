import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';

// GET /api/groups/[id]/summary → resumen financiero del mes actual
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [expenses, members, budgets, goals] = await Promise.all([
    prisma.expense.findMany({ where: { groupId: id, date: { gte: startOfMonth } } }),
    prisma.groupMember.findMany({
      where: { groupId: id },
      select: { monthlySalary: true, salaryVisible: true, userId: true },
    }),
    prisma.budget.findMany({
      where: { groupId: id, month: now.getMonth() + 1, year: now.getFullYear() },
    }),
    prisma.savingGoal.findMany({ where: { groupId: id } }),
  ]);

  const totalIncome = members.reduce((sum, m) => sum + m.monthlySalary, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const available = totalIncome - totalExpenses;

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return NextResponse.json({ totalIncome, totalExpenses, available, byCategory, budgets, goals });
}
