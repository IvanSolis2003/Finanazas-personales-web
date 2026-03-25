import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middlewares/auth';

const expenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().int().positive(),
  category: z.enum([
    'HOUSING', 'FOOD', 'TRANSPORT', 'HEALTH',
    'RECREATION', 'CLOTHING', 'EDUCATION', 'SERVICES', 'OTHER',
  ]),
  type: z.enum(['SHARED', 'INDIVIDUAL']),
  splitBetween: z.array(z.string()).optional(),
  date: z.string().optional(),
});

export async function listExpenses(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const { month, year, category } = req.query;
  const where: Record<string, unknown> = { groupId: req.params.id };

  if (month && year) {
    const m = Number(month);
    const y = Number(year);
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }

  if (category) where.category = category;

  const expenses = await prisma.expense.findMany({
    where,
    include: { paidBy: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  });

  res.json(expenses);
}

export async function createExpense(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { description, amount, category, type, splitBetween, date } = parsed.data;

  const expense = await prisma.expense.create({
    data: {
      groupId: req.params.id,
      paidById: req.userId!,
      description,
      amount,
      category,
      type,
      splitBetween: type === 'SHARED' ? (splitBetween ?? []) : [],
      date: date ? new Date(date) : new Date(),
    },
    include: { paidBy: { select: { id: true, name: true } } },
  });

  res.status(201).json(expense);
}

export async function deleteExpense(req: AuthRequest, res: Response): Promise<void> {
  const expense = await prisma.expense.findUnique({
    where: { id: req.params.expId },
  });

  if (!expense || expense.groupId !== req.params.id) {
    res.status(404).json({ error: 'Gasto no encontrado' });
    return;
  }

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  // Solo el que pagó o un admin puede eliminar
  if (expense.paidById !== req.userId && member.role !== 'ADMIN') {
    res.status(403).json({ error: 'Sin permiso para eliminar este gasto' });
    return;
  }

  await prisma.expense.delete({ where: { id: req.params.expId } });
  res.json({ message: 'Gasto eliminado' });
}
