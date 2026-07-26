import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { z } from 'zod';
import { categoryEnum } from '@/lib/validations';

const upsertSchema = z.object({
  category: categoryEnum,
  monthlyLimit: z.number().int().positive(),
  userId: z.string().nullable().optional(), // null/undefined = presupuesto del grupo
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().optional(),
});

// GET /api/groups/[id]/budgets?month=&year= → presupuestos del grupo Y de miembros
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

// POST /api/groups/[id]/budgets → crear/actualizar presupuesto (grupo o miembro)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const targetUserId = parsed.data.userId ?? null;

  // Permisos: presupuesto del grupo → solo admin. Presupuesto de miembro →
  // el propio miembro o un admin.
  if (targetUserId === null) {
    if (membership.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden configurar el presupuesto del grupo' },
        { status: 403 },
      );
    }
  } else if (targetUserId !== auth.userId && membership.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Solo puedes configurar tu propio presupuesto' },
      { status: 403 },
    );
  }

  // Si es de miembro, validar que pertenezca al grupo.
  if (targetUserId !== null) {
    const target = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId: id } },
    });
    if (!target) {
      return NextResponse.json({ error: 'El miembro no pertenece al grupo' }, { status: 400 });
    }
  }

  const now = new Date();
  const { category, monthlyLimit } = parsed.data;
  const month = parsed.data.month ?? now.getMonth() + 1;
  const year = parsed.data.year ?? now.getFullYear();

  // Upsert manual (el unique con userId nullable no sirve para upsert directo).
  const existing = await prisma.budget.findFirst({
    where: { groupId: id, userId: targetUserId, category, month, year },
  });

  const budget = existing
    ? await prisma.budget.update({ where: { id: existing.id }, data: { monthlyLimit } })
    : await prisma.budget.create({
        data: { groupId: id, userId: targetUserId, category, monthlyLimit, month, year },
      });

  return NextResponse.json(budget);
}
