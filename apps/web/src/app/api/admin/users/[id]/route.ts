import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { z } from 'zod';

const patchSchema = z.object({ isApproved: z.boolean() });

// PATCH /api/admin/users/[id] → habilitar/deshabilitar una cuenta (solo admin)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Un admin no puede deshabilitarse a sí mismo (evita quedarse fuera).
  if (id === auth.userId && !parsed.data.isApproved) {
    return NextResponse.json({ error: 'No puedes deshabilitar tu propia cuenta' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isApproved: parsed.data.isApproved },
    select: { id: true, name: true, email: true, isApproved: true, isAdmin: true, createdAt: true },
  });

  return NextResponse.json(user);
}
