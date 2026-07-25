import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { salarySchema } from '@/lib/validations';

// PATCH /api/groups/[id]/members/salary → actualizar sueldo del miembro actual
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const body = await req.json().catch(() => null);
  const parsed = salarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.groupMember.update({
    where: { userId_groupId: { userId: auth.userId, groupId: id } },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}
