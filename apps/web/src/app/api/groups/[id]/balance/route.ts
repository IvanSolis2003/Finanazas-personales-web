import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { calculateBalance, simplifyDebts } from '@/lib/balanceCalc';

// GET /api/groups/[id]/balance → balance y deudas simplificadas
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const expenses = await prisma.expense.findMany({
    where: { groupId: id, type: 'SHARED' },
  });

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    include: { user: { select: { id: true, name: true } } },
  });

  const balances = calculateBalance(expenses);
  const transactions = simplifyDebts(balances);

  const memberMap = Object.fromEntries(members.map((m) => [m.userId, m.user.name]));

  const result = transactions.map((t) => ({
    from: memberMap[t.from] ?? t.from,
    fromId: t.from,
    to: memberMap[t.to] ?? t.to,
    toId: t.to,
    amount: t.amount,
  }));

  return NextResponse.json({ balances, transactions: result });
}
