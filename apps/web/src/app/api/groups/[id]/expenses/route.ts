import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { expenseSchema } from '@/lib/validations';
import { validateSplit } from '@/lib/expenseSplit';
import { Prisma } from '@prisma/client';

// GET /api/groups/[id]/expenses?month=&year=&category=
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const category = searchParams.get('category');

  const where: Prisma.ExpenseWhereInput = { groupId: id };
  if (month && year) {
    const m = Number(month);
    const y = Number(year);
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }
  if (category) where.category = category as Prisma.ExpenseWhereInput['category'];

  const expenses = await prisma.expense.findMany({
    where,
    include: { paidBy: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(expenses);
}

// POST /api/groups/[id]/expenses → registrar gasto
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const body = await req.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { description, amount, category, type, splitBetween, splitShares, date } = parsed.data;

  const split = validateSplit(type, amount, splitBetween, splitShares);
  if (!split.ok) return NextResponse.json({ error: split.error }, { status: 400 });

  const expense = await prisma.expense.create({
    data: {
      groupId: id,
      paidById: auth.userId,
      description,
      amount,
      category,
      type,
      splitBetween: split.splitBetween,
      splitShares: split.splitShares ?? Prisma.JsonNull,
      date: date ? new Date(date) : new Date(),
    },
    include: { paidBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(expense, { status: 201 });
}
