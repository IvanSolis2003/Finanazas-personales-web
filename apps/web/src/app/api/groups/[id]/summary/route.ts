import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';

// GET /api/groups/[id]/summary?month=&year= → resumen financiero del mes
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

  const [expenses, members, budgets, goals, savingsAgg] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId: id, date: { gte: startOfMonth, lt: startOfNextMonth } },
    }),
    prisma.groupMember.findMany({
      where: { groupId: id },
      select: { monthlySalary: true, salaryVisible: true, userId: true },
    }),
    prisma.budget.findMany({ where: { groupId: id, month, year } }),
    prisma.savingGoal.findMany({ where: { groupId: id } }),
    prisma.goalContribution.aggregate({
      where: { groupId: id, date: { gte: startOfMonth, lt: startOfNextMonth } },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = members.reduce((sum, m) => sum + m.monthlySalary, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSavings = savingsAgg._sum.amount ?? 0; // aportes a metas este mes
  const available = totalIncome - totalExpenses - totalSavings;

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return NextResponse.json({
    totalIncome,
    totalExpenses,
    totalSavings,
    available,
    byCategory,
    budgets,
    goals,
  });
}
