import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';

// DELETE /api/groups/[id]/recurring/[rid] → dejar de repetir (borra la plantilla,
// los gastos ya generados se conservan). Autor o admin.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; rid: string }> },
) {
  const { id, rid } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const rec = await prisma.recurringExpense.findUnique({ where: { id: rid } });
  if (!rec || rec.groupId !== id) {
    return NextResponse.json({ error: 'Gasto fijo no encontrado' }, { status: 404 });
  }
  if (rec.paidById !== auth.userId && membership.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  await prisma.recurringExpense.delete({ where: { id: rid } });
  return NextResponse.json({ message: 'Gasto fijo eliminado' });
}
