import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireMembership } from '@/lib/apiAuth';
import { voteSchema } from '@/lib/validations';
import { materializeApprovedProposal } from '@/lib/proposalExpense';

// POST /api/groups/[id]/proposals/[propId]/vote → votar propuesta
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; propId: string }> },
) {
  const { id: groupId, propId } = await params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const membership = await requireMembership(auth.userId, groupId);
  if (membership instanceof NextResponse) return membership;

  const body = await req.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: propId },
    include: { votes: true },
  });
  if (!proposal || proposal.groupId !== groupId) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 });
  }
  if (proposal.status !== 'PENDING') {
    return NextResponse.json({ error: 'La propuesta ya fue resuelta' }, { status: 409 });
  }

  // Registrar o actualizar el voto
  await prisma.proposalVote.upsert({
    where: { proposalId_userId: { proposalId: propId, userId: auth.userId } },
    update: { vote: parsed.data.vote },
    create: { proposalId: propId, userId: auth.userId, vote: parsed.data.vote },
  });

  // REJECT → rechazo inmediato
  if (parsed.data.vote === 'REJECT') {
    const updated = await prisma.proposal.update({
      where: { id: propId },
      data: { status: 'REJECTED', resolvedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  // Propuesta personal → el proponente la aprueba
  if (proposal.isPersonal && proposal.proposedById === auth.userId) {
    const updated = await prisma.proposal.update({
      where: { id: propId },
      data: { status: 'APPROVED', resolvedAt: new Date() },
    });
    await materializeApprovedProposal(proposal); // pasa a gasto del mes en curso
    return NextResponse.json(updated);
  }

  // ¿Se alcanzó la aprobación según el modo del grupo?
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  const totalMembers = group!.members.length;
  const allVotes = await prisma.proposalVote.findMany({ where: { proposalId: propId } });
  const approveCount = allVotes.filter((v) => v.vote === 'APPROVE').length;
  const required = Math.floor(totalMembers / 2) + 1;

  const approved =
    group!.approvalMode === 'MAJORITY'
      ? approveCount >= required
      : approveCount === totalMembers;

  if (approved) {
    const updated = await prisma.proposal.update({
      where: { id: propId },
      data: { status: 'APPROVED', resolvedAt: new Date() },
    });
    await materializeApprovedProposal(proposal); // pasa a gasto del mes en curso
    return NextResponse.json(updated);
  }

  return NextResponse.json({ message: 'Voto registrado', approveCount, required });
}
