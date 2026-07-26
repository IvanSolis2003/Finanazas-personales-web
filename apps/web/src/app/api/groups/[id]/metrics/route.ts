import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// GET /api/groups/[id]/metrics?months=6
// Serie de los últimos N meses (+ meses futuros que ya tengan gastos cargados)
// para comparar: ingreso, gasto, disponible y por categoría.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const { searchParams } = new URL(req.url);
  const n = Math.min(12, Math.max(2, Number(searchParams.get('months') ?? 6)));

  const now = new Date();
  const FUTURE_MAX = 3; // hasta 3 meses adelante si tienen datos

  // Rango amplio: desde N-1 meses atrás hasta FUTURE_MAX meses adelante.
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + FUTURE_MAX + 1, 1);

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
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!buckets[key]) buckets[key] = { expenses: 0, byCategory: {} };
    buckets[key].expenses += e.amount;
    buckets[key].byCategory[e.category] = (buckets[key].byCategory[e.category] ?? 0) + e.amount;
  }

  const build = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const b = buckets[key] ?? { expenses: 0, byCategory: {} };
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      key,
      label: `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,
      future: offset > 0,
      income,
      expenses: b.expenses,
      available: income - b.expenses,
      byCategory: b.byCategory,
    };
  };

  // Pasados + actual (siempre).
  const series = [];
  for (let i = n - 1; i >= 0; i--) series.push(build(-i));

  // Futuros: solo hasta el último mes futuro con gastos cargados.
  const future = [];
  let lastWithData = -1;
  for (let k = 1; k <= FUTURE_MAX; k++) {
    const m = build(k);
    future.push(m);
    if (m.expenses > 0) lastWithData = k - 1;
  }
  series.push(...future.slice(0, lastWithData + 1));

  return NextResponse.json({ income, series });
}
