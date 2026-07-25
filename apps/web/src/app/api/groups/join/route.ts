import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { joinGroupSchema } from '@/lib/validations';

// POST /api/groups/join → unirse con inviteCode
export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = joinGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { inviteCode: parsed.data.inviteCode.trim() },
  });
  if (!group) {
    return NextResponse.json({ error: 'Código de invitación inválido' }, { status: 404 });
  }

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: auth.userId, groupId: group.id } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Ya eres miembro de este grupo' }, { status: 409 });
  }

  await prisma.groupMember.create({
    data: { userId: auth.userId, groupId: group.id, role: 'MEMBER' },
  });

  return NextResponse.json(group, { status: 201 });
}
