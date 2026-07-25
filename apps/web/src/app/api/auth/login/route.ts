import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signSession, setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  await setSessionCookie(await signSession(user.id));
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
