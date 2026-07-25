import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { createGroupSchema } from '@/lib/validations';
import { generateInviteCode } from '@/lib/inviteCode';

// GET /api/groups → grupos del usuario
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const memberships = await prisma.groupMember.findMany({
    where: { userId: auth.userId },
    include: { group: { include: { members: { select: { id: true } } } } },
    orderBy: { joinedAt: 'desc' },
  });

  return NextResponse.json(memberships.map((m) => ({ group: m.group })));
}

// POST /api/groups → crear grupo (el creador queda ADMIN)
export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // inviteCode único (reintenta ante colisión improbable)
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.group.findUnique({ where: { inviteCode } });
    if (!clash) break;
    inviteCode = generateInviteCode();
  }

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      inviteCode,
      members: { create: { userId: auth.userId, role: 'ADMIN' } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
