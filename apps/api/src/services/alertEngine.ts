import cron from 'node-cron';
import prisma from '../prisma/client';
import { AlertType } from '@prisma/client';
import { sendPushNotifications } from './pushNotifications';

const HOURS_24 = 24 * 60 * 60 * 1000;

async function alertExists(groupId: string, type: AlertType): Promise<boolean> {
  const recent = await prisma.alert.findFirst({
    where: {
      groupId,
      type,
      createdAt: { gte: new Date(Date.now() - HOURS_24) },
    },
  });
  return !!recent;
}

async function createAlert(groupId: string, type: AlertType, message: string) {
  if (await alertExists(groupId, type)) return;
  await prisma.alert.create({ data: { groupId, type, message } });
}

async function getMemberTokens(groupId: string, excludeUserIds: string[] = []): Promise<string[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, pushToken: true } } },
  });
  return members
    .filter((m) => !excludeUserIds.includes(m.userId) && m.user.pushToken)
    .map((m) => m.user.pushToken!);
}

async function evaluateGroup(groupId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const startOfLastMonth = new Date(year, now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(year, now.getMonth(), 0, 23, 59, 59);

  const [expenses, lastMonthExpenses, budgets, members, goals, pendingProposals] = await Promise.all([
    prisma.expense.findMany({ where: { groupId, date: { gte: startOfMonth } } }),
    prisma.expense.findMany({ where: { groupId, date: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.budget.findMany({ where: { groupId, month, year } }),
    prisma.groupMember.findMany({ where: { groupId } }),
    prisma.savingGoal.findMany({ where: { groupId } }),
    prisma.proposal.findMany({
      where: {
        groupId,
        status: 'PENDING',
        createdAt: { lte: new Date(Date.now() - HOURS_24) },
      },
      include: { votes: true },
    }),
  ]);

  const totalIncome = members.reduce((sum, m) => sum + m.monthlySalary, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 1 & 2. BUDGET_WARNING / BUDGET_EXCEEDED
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  for (const budget of budgets) {
    const spent = byCategory[budget.category] ?? 0;
    const pct = spent / budget.monthlyLimit;

    if (pct >= 1) {
      await createAlert(
        groupId,
        'BUDGET_EXCEEDED',
        `Presupuesto de ${budget.category} superado: $${spent.toLocaleString('es-CL')} / $${budget.monthlyLimit.toLocaleString('es-CL')}`,
      );
    } else if (pct >= 0.8) {
      await createAlert(
        groupId,
        'BUDGET_WARNING',
        `Categoría ${budget.category} al ${Math.round(pct * 100)}% del presupuesto mensual`,
      );
    }
  }

  // 3. SPENDING_INCREASE
  if (totalLastMonth > 0 && totalExpenses > totalLastMonth * 1.2) {
    const pct = Math.round(((totalExpenses - totalLastMonth) / totalLastMonth) * 100);
    await createAlert(
      groupId,
      'SPENDING_INCREASE',
      `Los gastos del mes subieron un ${pct}% respecto al mes anterior`,
    );
  }

  // 4. SPENDING_DECREASE
  if (totalLastMonth > 0 && totalExpenses < totalLastMonth * 0.85) {
    const pct = Math.round(((totalLastMonth - totalExpenses) / totalLastMonth) * 100);
    await createAlert(
      groupId,
      'SPENDING_DECREASE',
      `Los gastos bajaron un ${pct}% respecto al mes anterior. ¡Buen trabajo!`,
    );
  }

  // 5. LOW_BALANCE
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (group && totalIncome > 0) {
    const available = totalIncome - totalExpenses;
    if (available < group.personalThreshold) {
      await createAlert(
        groupId,
        'LOW_BALANCE',
        `Balance disponible bajo: $${available.toLocaleString('es-CL')}`,
      );
    }
  }

  // 6. PROPOSAL_PENDING — push a miembros que aún no han votado
  if (pendingProposals.length > 0) {
    await createAlert(
      groupId,
      'PROPOSAL_PENDING',
      `Hay ${pendingProposals.length} propuesta(s) sin resolver hace más de 24 horas`,
    );

    for (const proposal of pendingProposals) {
      const voterIds = proposal.votes.map((v) => v.userId);
      const tokens = await getMemberTokens(groupId, voterIds);
      await sendPushNotifications(
        tokens.map((to) => ({
          to,
          title: 'Propuesta pendiente',
          body: `"${proposal.title}" lleva más de 24h esperando tu voto`,
          data: { proposalId: proposal.id, groupId },
        })),
      );
    }
  }

  // 7 & 8. Goals
  const today = now.getTime();
  for (const goal of goals) {
    if (goal.savedAmount >= goal.targetAmount) {
      const alreadyCreated = await alertExists(groupId, 'GOAL_ACHIEVED');
      if (!alreadyCreated) {
        await prisma.alert.create({
          data: { groupId, type: 'GOAL_ACHIEVED', message: `¡Meta "${goal.name}" completada!` },
        });
        // Push a todos los miembros
        const tokens = await getMemberTokens(groupId);
        await sendPushNotifications(
          tokens.map((to) => ({
            to,
            title: '¡Meta cumplida!',
            body: `El grupo alcanzó la meta "${goal.name}"`,
            data: { goalId: goal.id, groupId },
          })),
        );
      }
      continue;
    }

    const totalDays = (goal.targetDate.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = elapsedDays / totalDays;
    const actualProgress = goal.savedAmount / goal.targetAmount;

    if (actualProgress < expectedProgress) {
      await createAlert(
        groupId,
        'GOAL_AT_RISK',
        `La meta "${goal.name}" está en riesgo: ${Math.round(actualProgress * 100)}% ahorrado, se esperaba ${Math.round(expectedProgress * 100)}%`,
      );
    }
  }
}

export function startAlertEngine() {
  cron.schedule('0 20 * * *', async () => {
    console.log('[AlertEngine] Evaluando alertas...');
    const groups = await prisma.group.findMany({ select: { id: true } });
    await Promise.all(groups.map((g) => evaluateGroup(g.id)));
    console.log(`[AlertEngine] Evaluados ${groups.length} grupos`);
  });
}
