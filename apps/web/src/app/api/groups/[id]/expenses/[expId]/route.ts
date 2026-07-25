import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';

// DELETE /api/groups/[id]/expenses/[expId] → eliminar gasto (autor o admin)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; expId: string }> },
) {
  const { id, expId } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const expense = await prisma.expense.findUnique({ where: { id: expId } });
  if (!expense || expense.groupId !== id) {
    return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
  }

  if (expense.paidById !== auth.userId && membership.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso para eliminar este gasto' }, { status: 403 });
  }

  await prisma.expense.delete({ where: { id: expId } });
  return NextResponse.json({ message: 'Gasto eliminado' });
}
