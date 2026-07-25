import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  // La cuenta se crea PENDIENTE (isApproved = false por defecto): no se inicia
  // sesión hasta que el administrador la habilite.
  await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true },
  });

  return NextResponse.json(
    {
      pending: true,
      message:
        'Cuenta creada. Un administrador debe habilitarla antes de que puedas ingresar.',
    },
    { status: 201 },
  );
}
