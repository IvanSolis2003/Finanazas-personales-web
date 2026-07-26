import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// GET /api/groups/[id]/metrics?months=6
// Serie de los últimos N meses para comparar (ingreso, gasto, disponible y por categoría).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const { searchParams } = new URL(req.url);
  const n = Math.min(12, Math.max(2, Number(searchParams.get('months') ?? 6)));

  const now = new Date();
  // Lista de meses (más antiguo → más nuevo).
  const months: { month: number; year: number; key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,
    });
  }

  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [members, expenses] = await Promise.all([
    prisma.groupMember.findMany({ where: { groupId: id }, select: { monthlySalary: true } }),
    prisma.expense.findMany({
      where: { groupId: id, date: { gte: rangeStart, lt: rangeEnd } },
      select: { amount: true, category: true, date: true },
    }),
  ]);

  const income = members.reduce((s, m) => s + m.monthlySalary, 0);

  // Bucket por mes.
  const buckets: Record<string, { expenses: number; byCategory: Record<string, number> }> = {};
  for (const m of months) buckets[m.key] = { expenses: 0, byCategory: {} };
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!buckets[key]) continue;
    buckets[key].expenses += e.amount;
    buckets[key].byCategory[e.category] = (buckets[key].byCategory[e.category] ?? 0) + e.amount;
  }

  const series = months.map((m) => ({
    ...m,
    income,
    expenses: buckets[m.key].expenses,
    available: income - buckets[m.key].expenses,
    byCategory: buckets[m.key].byCategory,
  }));

  return NextResponse.json({ income, series });
}
