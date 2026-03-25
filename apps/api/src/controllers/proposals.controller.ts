import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middlewares/auth';

const proposalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().int().positive(),
  category: z.enum([
    'HOUSING', 'FOOD', 'TRANSPORT', 'HEALTH',
    'RECREATION', 'CLOTHING', 'EDUCATION', 'SERVICES', 'OTHER',
  ]),
  isPersonal: z.boolean().optional(),
});

const voteSchema = z.object({
  vote: z.enum(['APPROVE', 'REJECT', 'POSTPONE']),
});

export async function listProposals(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const proposals = await prisma.proposal.findMany({
    where: { groupId: req.params.id },
    include: {
      proposedBy: { select: { id: true, name: true } },
      votes: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(proposals);
}

export async function createProposal(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const parsed = proposalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) {
    res.status(404).json({ error: 'Grupo no encontrado' });
    return;
  }

  // Determinar isPersonal automáticamente si no se especifica
  const isPersonal = parsed.data.isPersonal ?? (parsed.data.amount <= group.personalThreshold);

  const proposal = await prisma.proposal.create({
    data: {
      groupId: req.params.id,
      proposedById: req.userId!,
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

  res.status(201).json(proposal);
}

export async function voteProposal(req: AuthRequest, res: Response): Promise<void> {
  const { id: groupId, propId } = req.params;

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: propId },
    include: { votes: true },
  });

  if (!proposal || proposal.groupId !== groupId) {
    res.status(404).json({ error: 'Propuesta no encontrada' });
    return;
  }

  if (proposal.status !== 'PENDING') {
    res.status(409).json({ error: 'La propuesta ya fue resuelta' });
    return;
  }

  // Registrar o actualizar el voto
  await prisma.proposalVote.upsert({
    where: { proposalId_userId: { proposalId: propId, userId: req.userId! } },
    update: { vote: parsed.data.vote },
    create: { proposalId: propId, userId: req.userId!, vote: parsed.data.vote },
  });

  // Si REJECT → rechazar inmediatamente
  if (parsed.data.vote === 'REJECT') {
    const updated = await prisma.proposal.update({
      where: { id: propId },
      data: { status: 'REJECTED', resolvedAt: new Date() },
    });
    res.json(updated);
    return;
  }

  // Propuesta personal → el proponente ya aprobó al crear
  if (proposal.isPersonal && proposal.proposedById === req.userId) {
    const updated = await prisma.proposal.update({
      where: { id: propId },
      data: { status: 'APPROVED', resolvedAt: new Date() },
    });
    res.json(updated);
    return;
  }

  // Calcular si se alcanzó la mayoría
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  const totalMembers = group!.members.length;
  const allVotes = await prisma.proposalVote.findMany({ where: { proposalId: propId } });
  const approveCount = allVotes.filter((v) => v.vote === 'APPROVE').length;

  let approved = false;
  if (group!.approvalMode === 'MAJORITY') {
    approved = approveCount >= Math.floor(totalMembers / 2) + 1;
  } else {
    approved = approveCount === totalMembers;
  }

  if (approved) {
    const updated = await prisma.proposal.update({
      where: { id: propId },
      data: { status: 'APPROVED', resolvedAt: new Date() },
    });
    res.json(updated);
    return;
  }

  res.json({ message: 'Voto registrado', approveCount, required: Math.floor(totalMembers / 2) + 1 });
}

export async function updateProposal(req: AuthRequest, res: Response): Promise<void> {
  const { id: groupId, propId } = req.params;

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId } },
  });

  if (!member || member.role !== 'ADMIN') {
    res.status(403).json({ error: 'Solo administradores pueden actualizar propuestas' });
    return;
  }

  const { status } = req.body;
  if (!['PENDING', 'APPROVED', 'REJECTED', 'POSTPONED'].includes(status)) {
    res.status(400).json({ error: 'Estado inválido' });
    return;
  }

  const proposal = await prisma.proposal.update({
    where: { id: propId },
    data: { status, resolvedAt: status !== 'PENDING' ? new Date() : null },
  });

  res.json(proposal);
}
