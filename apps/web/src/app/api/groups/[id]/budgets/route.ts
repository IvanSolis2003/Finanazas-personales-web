import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { z } from 'zod';
import { categoryEnum } from '@/lib/validations';

const upsertSchema = z.object({
  category: categoryEnum,
  monthlyLimit: z.number().int().positive(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().optional(),
});

// GET /api/groups/[id]/budgets?month=&year=
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

  const budgets = await prisma.budget.findMany({ where: { groupId: id, month, year } });
  return NextResponse.json(budgets);
}

// POST /api/groups/[id]/budgets → crear/actualizar presupuesto (solo ADMIN)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;
  if (membership.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Solo administradores pueden configurar presupuestos' },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const { category, monthlyLimit } = parsed.data;
  const month = parsed.data.month ?? now.getMonth() + 1;
  const year = parsed.data.year ?? now.getFullYear();

  const budget = await prisma.budget.upsert({
    where: { groupId_category_month_year: { groupId: id, category, month, year } },
    update: { monthlyLimit },
    create: { groupId: id, category, monthlyLimit, month, year },
  });

  return NextResponse.json(budget);
}
