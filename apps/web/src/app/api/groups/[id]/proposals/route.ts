import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { proposalSchema } from '@/lib/validations';

// GET /api/groups/[id]/proposals → listar propuestas (con votos)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const proposals = await prisma.proposal.findMany({
    where: { groupId: id },
    include: {
      proposedBy: { select: { id: true, name: true } },
      votes: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(proposals);
}

// POST /api/groups/[id]/proposals → crear propuesta
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, id);
  if (membership instanceof NextResponse) return membership;

  const body = await req.json().catch(() => null);
  const parsed = proposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });

  // isPersonal automático si no se especifica: monto <= umbral personal.
  const isPersonal = parsed.data.isPersonal ?? parsed.data.amount <= group.personalThreshold;

  const proposal = await prisma.proposal.create({
    data: {
      groupId: id,
      proposedById: auth.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      amount: parsed.data.amount,
      category: parsed.data.category,
      isPersonal,
    },
    include: {
      proposedBy: { select: { id: true, name: true } },
      votes: true,
    },
  });

  return NextResponse.json(proposal, { status: 201 });
}
