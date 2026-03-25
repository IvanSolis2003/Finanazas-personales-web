import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middlewares/auth';

export async function listAlerts(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  const alerts = await prisma.alert.findMany({
    where: { groupId: req.params.id, isRead: false },
    orderBy: { createdAt: 'desc' },
  });

  res.json(alerts);
}

export async function markAllRead(req: AuthRequest, res: Response): Promise<void> {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: req.userId!, groupId: req.params.id } },
  });

  if (!member) {
    res.status(403).json({ error: 'No perteneces a este grupo' });
    return;
  }

  await prisma.alert.updateMany({
    where: { groupId: req.params.id, isRead: false },
    data: { isRead: true },
  });

  res.json({ message: 'Alertas marcadas como leídas' });
}
