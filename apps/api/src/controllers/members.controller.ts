import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../middlewares/auth';

const salarySchema = z.object({
  monthlySalary: z.number().int().min(0),
  salaryVisible: z.boolean().optional(),
});

export async function updateSalary(req: AuthRequest, res: Response): Promise<void> {
  const parsed = salarySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const updated = await prisma.groupMember.update({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
    data: parsed.data,
  });

  res.json(updated);
}

export async function removeMember(req: AuthRequest, res: Response): Promise<void> {
  const { id: groupId, userId: targetUserId } = req.params;

  const requestingMember = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId } },
  });

  if (!requestingMember) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  // Solo admin puede remover a otros; cualquiera puede salir por sí mismo
  if (targetUserId !== req.userId && requestingMember.role !== 'ADMIN') {
    res.status(403).json({ error: 'Solo administradores pueden remover miembros' });
    return;
  }

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });

  res.json({ message: 'Miembro removido' });
}
