import 'server-only';
import { prisma } from '@/lib/prisma';
import type { ExpenseCategory } from '@prisma/client';

interface ApprovedProposal {
  id: string;
  groupId: string;
  proposedById: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  isPersonal: boolean;
}

/**
 * Convierte una propuesta APROBADA en un gasto del mes en curso.
 * Idempotente: si ya se generó el gasto de esa propuesta, no lo duplica.
 * - Personal → gasto INDIVIDUAL del proponente.
 * - Grupal   → gasto COMPARTIDO repartido entre todos los miembros.
 */
export async function materializeApprovedProposal(proposal: ApprovedProposal) {
  const already = await prisma.expense.findFirst({ where: { proposalId: proposal.id } });
  if (already) return already;

  const type = proposal.isPersonal ? 'INDIVIDUAL' : 'SHARED';
  let splitBetween: string[] = [];
  if (type === 'SHARED') {
    const members = await prisma.groupMember.findMany({
      where: { groupId: proposal.groupId },
      select: { userId: true },
    });
    splitBetween = members.map((m) => m.userId);
  }

  return prisma.expense.create({
    data: {
      groupId: proposal.groupId,
      paidById: proposal.proposedById,
      description: proposal.title,
      amount: proposal.amount,
      category: proposal.category,
      type,
      splitBetween,
      proposalId: proposal.id,
      date: new Date(), // mes en curso
    },
  });
}
