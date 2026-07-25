import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { z } from 'zod';

const updateGroupSchema = z.object({
  name: z.string().min(2).optional(),
  approvalMode: z.enum(['MAJORITY', 'UNANIMOUS']).optional(),
  personalThreshold: z.number().int().positive().optional(),
});

// GET /api/groups/[id] → detalle del grupo (con miembros)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });

  return NextResponse.json(group);
}

// PATCH /api/groups/[id] → editar configuración (solo ADMIN)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;
  if (membership.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo administradores pueden editar el grupo' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const group = await prisma.group.update({ where: { id }, data: parsed.data });
  return NextResponse.json(group);
}
