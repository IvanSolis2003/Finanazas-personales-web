import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middlewares/auth';

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().int().positive(),
  targetDate: z.string(),
});

const contributeSchema = z.object({
  savedAmount: z.number().int().min(0),
});

export async function listGoals(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const goals = await prisma.savingGoal.findMany({
    where: { groupId: req.params.id },
    orderBy: { targetDate: 'asc' },
  });

  res.json(goals);
}

export async function createGoal(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const goal = await prisma.savingGoal.create({
    data: {
      groupId: req.params.id,
      name: parsed.data.name,
      targetAmount: parsed.data.targetAmount,
      targetDate: new Date(parsed.data.targetDate),
    },
  });

  res.status(201).json(goal);
}

export async function updateGoal(req: AuthRequest, res: Response): Promise<void> {
  const { id: groupId, goalId } = req.params;

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const parsed = contributeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const goal = await prisma.savingGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.groupId !== groupId) {
    res.status(404).json({ error: 'Meta no encontrada' });
    return;
  }

  const updated = await prisma.savingGoal.update({
    where: { id: goalId },
    data: { savedAmount: parsed.data.savedAmount },
  });

  res.json(updated);
}
