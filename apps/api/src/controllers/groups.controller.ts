import { Response } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import prisma from '../prisma/client';
import { AuthRequest } from '../middlewares/auth';
import { calculateBalance, simplifyDebts } from '../services/balanceCalc';

const createGroupSchema = z.object({
  name: z.string().min(2),
  approvalMode: z.enum(['MAJORITY', 'UNANIMOUS']).optional(),
  personalThreshold: z.number().int().positive().optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(2).optional(),
  approvalMode: z.enum(['MAJORITY', 'UNANIMOUS']).optional(),
  personalThreshold: z.number().int().positive().optional(),
});

export async function listMyGroups(req: AuthRequest, res: Response): Promise<void> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.userId! },
    include: {
      group: {
        include: { members: { select: { id: true } } },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  res.json(memberships.map((m) => ({ group: m.group })));
}

export async function createGroup(req: AuthRequest, res: Response): Promise<void> {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { name, approvalMode, personalThreshold } = parsed.data;

  const group = await prisma.group.create({
    data: {
      name,
      inviteCode: nanoid(8),
      approvalMode: approvalMode ?? 'MAJORITY',
      personalThreshold: personalThreshold ?? 50000,
      members: {
        create: { userId: req.userId!, role: 'ADMIN' },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });

  res.status(201).json(group);
}

export async function getGroup(req: AuthRequest, res: Response): Promise<void> {
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!group) {
    res.status(404).json({ error: 'Grupo no encontrado' });
    return;
  }

  const isMember = group.members.some((m) => m.userId === req.userId);
  if (!isMember) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  res.json(group);
}

export async function joinGroup(req: AuthRequest, res: Response): Promise<void> {
  const { inviteCode } = req.body;
  if (!inviteCode) {
    res.status(400).json({ error: 'inviteCode requerido' });
    return;
  }

  const group = await prisma.group.findUnique({ where: { inviteCode } });
  if (!group) {
    res.status(404).json({ error: 'Código de invitación inválido' });
    return;
  }

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: group.id } },
  });

  if (existing) {
    res.status(409).json({ error: 'Ya eres miembro de este grupo' });
    return;
  }

  const member = await prisma.groupMember.create({
    data: { userId: req.userId!, groupId: group.id, role: 'MEMBER' },
    include: { group: true },
  });

  res.status(201).json(member);
}

export async function updateGroup(req: AuthRequest, res: Response): Promise<void> {
  const parsed = updateGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member || member.role !== 'ADMIN') {
    res.status(403).json({ error: 'Solo administradores pueden editar el grupo' });
    return;
  }

  const group = await prisma.group.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json(group);
}

export async function getBalance(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const expenses = await prisma.expense.findMany({
    where: { groupId: req.params.id, type: 'SHARED' },
  });

  const members = await prisma.groupMember.findMany({
    where: { groupId: req.params.id },
    include: { user: { select: { id: true, name: true } } },
  });

  const balances = calculateBalance(expenses);
  const transactions = simplifyDebts(balances);

  const memberMap = Object.fromEntries(members.map((m) => [m.userId, m.user.name]));

  const result = transactions.map((t) => ({
    from: memberMap[t.from] ?? t.from,
    fromId: t.from,
    to: memberMap[t.to] ?? t.to,
    toId: t.to,
    amount: t.amount,
  }));

  res.json({ balances, transactions: result });
}

export async function getSummary(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [expenses, members, budgets, goals] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId: req.params.id, date: { gte: startOfMonth } },
    }),
    prisma.groupMember.findMany({
      where: { groupId: req.params.id },
      select: { monthlySalary: true, salaryVisible: true, userId: true },
    }),
    prisma.budget.findMany({
      where: { groupId: req.params.id, month: now.getMonth() + 1, year: now.getFullYear() },
    }),
    prisma.savingGoal.findMany({ where: { groupId: req.params.id } }),
  ]);

  const totalIncome = members.reduce((sum, m) => sum + m.monthlySalary, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const available = totalIncome - totalExpenses;

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  res.json({ totalIncome, totalExpenses, available, byCategory, budgets, goals });
}
