import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middlewares/auth';

const budgetSchema = z.object({
  category: z.enum([
    'HOUSING', 'FOOD', 'TRANSPORT', 'HEALTH',
    'RECREATION', 'CLOTHING', 'EDUCATION', 'SERVICES', 'OTHER',
  ]),
  monthlyLimit: z.number().int().positive(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().optional(),
});

export async function listBudgets(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const now = new Date();
  const month = Number(req.query.month ?? now.getMonth() + 1);
  const year = Number(req.query.year ?? now.getFullYear());

  const budgets = await prisma.budget.findMany({
    where: { groupId: req.params.id, month, year },
  });

  res.json(budgets);
}

export async function upsertBudget(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member || member.role !== 'ADMIN') {
    res.status(403).json({ error: 'Solo administradores pueden configurar presupuestos' });
    return;
  }

  const parsed = budgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const now = new Date();
  const { category, monthlyLimit, month = now.getMonth() + 1, year = now.getFullYear() } = parsed.data;

  const budget = await prisma.budget.upsert({
    where: { groupId_category_month_year: { groupId: req.params.id, category, month, year } },
    update: { monthlyLimit },
    create: { groupId: req.params.id, category, monthlyLimit, month, year },
  });

  res.json(budget);
}
