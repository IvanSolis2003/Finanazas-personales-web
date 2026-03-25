/**
 * Tests del motor de alertas.
 * Se prueba la lógica de evaluación exponiendo las funciones internas
 * a través de un helper que simula el comportamiento de evaluateGroup.
 */
import prisma from '../prisma/client';

// Mock node-cron para que no arranque el scheduler en tests
jest.mock('node-cron', () => ({ schedule: jest.fn() }));

// Mock pushNotifications para no hacer fetch real
jest.mock('../services/pushNotifications', () => ({
  sendPushNotifications: jest.fn().mockResolvedValue(undefined),
}));

import { startAlertEngine } from '../services/alertEngine';

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

function makeExpense(amount: number, category = 'FOOD', date = now) {
  return { id: `e${Math.random()}`, groupId: 'g1', paidById: 'u1', description: 'T', amount, category, type: 'SHARED', splitBetween: ['u1'], date, createdAt: date };
}

function makeMember(salary = 500000) {
  return { id: 'm1', userId: 'u1', groupId: 'g1', monthlySalary: salary, salaryVisible: true, role: 'MEMBER', joinedAt: new Date(), user: { id: 'u1', pushToken: null } };
}

const mockGroup = {
  id: 'g1',
  name: 'Test',
  inviteCode: 'ABC12345',
  approvalMode: 'MAJORITY',
  personalThreshold: 50000,
  createdAt: new Date(),
};

function setupBaseMocks() {
  (prisma.group.findMany as jest.Mock).mockResolvedValue([{ id: 'g1' }]);
  (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup);
  (prisma.savingGoal.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.proposal.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.alert.findFirst as jest.Mock).mockResolvedValue(null); // sin alertas previas
  (prisma.alert.create as jest.Mock).mockResolvedValue({});
  (prisma.alert.updateMany as jest.Mock).mockResolvedValue({});
}

describe('startAlertEngine', () => {
  it('registra el cron job sin errores', () => {
    const cron = require('node-cron');
    startAlertEngine();
    expect(cron.schedule).toHaveBeenCalledWith('0 20 * * *', expect.any(Function));
  });
});

describe('Regla BUDGET_WARNING (>= 80%)', () => {
  it('crea alerta cuando gasto supera el 80% del presupuesto', async () => {
    setupBaseMocks();
    (prisma.expense.findMany as jest.Mock)
      .mockResolvedValueOnce([makeExpense(85000, 'FOOD')]) // mes actual
      .mockResolvedValueOnce([]);                            // mes anterior
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([
      { id: 'b1', groupId: 'g1', category: 'FOOD', monthlyLimit: 100000, month: now.getMonth() + 1, year: now.getFullYear() },
    ]);
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([makeMember()]);

    const cron = require('node-cron');
    startAlertEngine();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls.at(-1)[1];
    await cronCallback();

    const createCalls = (prisma.alert.create as jest.Mock).mock.calls;
    const types = createCalls.map((c) => c[0].data.type);
    expect(types).toContain('BUDGET_WARNING');
  });
});

describe('Regla BUDGET_EXCEEDED (>= 100%)', () => {
  it('crea alerta BUDGET_EXCEEDED cuando se supera el límite', async () => {
    setupBaseMocks();
    (prisma.expense.findMany as jest.Mock)
      .mockResolvedValueOnce([makeExpense(120000, 'FOOD')])
      .mockResolvedValueOnce([]);
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([
      { id: 'b1', groupId: 'g1', category: 'FOOD', monthlyLimit: 100000, month: now.getMonth() + 1, year: now.getFullYear() },
    ]);
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([makeMember()]);

    const cron = require('node-cron');
    startAlertEngine();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls.at(-1)[1];
    await cronCallback();

    const types = (prisma.alert.create as jest.Mock).mock.calls.map((c) => c[0].data.type);
    expect(types).toContain('BUDGET_EXCEEDED');
  });
});

describe('Regla SPENDING_INCREASE (> 20%)', () => {
  it('crea alerta cuando el gasto sube más del 20%', async () => {
    setupBaseMocks();
    (prisma.expense.findMany as jest.Mock)
      .mockResolvedValueOnce([makeExpense(130000)]) // mes actual
      .mockResolvedValueOnce([makeExpense(100000)]); // mes anterior
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([makeMember()]);

    const cron = require('node-cron');
    startAlertEngine();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls.at(-1)[1];
    await cronCallback();

    const types = (prisma.alert.create as jest.Mock).mock.calls.map((c) => c[0].data.type);
    expect(types).toContain('SPENDING_INCREASE');
  });

  it('NO crea alerta si el aumento es del 20% o menos', async () => {
    setupBaseMocks();
    (prisma.expense.findMany as jest.Mock)
      .mockResolvedValueOnce([makeExpense(115000)])
      .mockResolvedValueOnce([makeExpense(100000)]);
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([makeMember()]);

    const cron = require('node-cron');
    startAlertEngine();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls.at(-1)[1];
    await cronCallback();

    const types = (prisma.alert.create as jest.Mock).mock.calls.map((c) => c[0].data.type);
    expect(types).not.toContain('SPENDING_INCREASE');
  });
});

describe('Regla LOW_BALANCE', () => {
  it('crea alerta cuando el balance disponible cae bajo el umbral', async () => {
    setupBaseMocks();
    // Sueldo $500k, gastos $470k → disponible $30k < umbral $50k
    (prisma.expense.findMany as jest.Mock)
      .mockResolvedValueOnce([makeExpense(470000)])
      .mockResolvedValueOnce([]);
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([makeMember(500000)]);

    const cron = require('node-cron');
    startAlertEngine();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls.at(-1)[1];
    await cronCallback();

    const types = (prisma.alert.create as jest.Mock).mock.calls.map((c) => c[0].data.type);
    expect(types).toContain('LOW_BALANCE');
  });
});

describe('Regla GOAL_ACHIEVED', () => {
  it('crea alerta y envía push cuando se alcanza la meta', async () => {
    const { sendPushNotifications } = require('../services/pushNotifications');
    setupBaseMocks();
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([]).mockResolvedValue([]);
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([
      { ...makeMember(), user: { id: 'u1', pushToken: 'ExponentPushToken[abc]' } },
    ]);
    (prisma.savingGoal.findMany as jest.Mock).mockResolvedValue([
      { id: 'goal1', groupId: 'g1', name: 'Vacaciones', targetAmount: 100000, savedAmount: 100000, targetDate: new Date('2026-12-31'), createdAt: new Date('2026-01-01') },
    ]);

    const cron = require('node-cron');
    startAlertEngine();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls.at(-1)[1];
    await cronCallback();

    const types = (prisma.alert.create as jest.Mock).mock.calls.map((c) => c[0].data.type);
    expect(types).toContain('GOAL_ACHIEVED');
    expect(sendPushNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: '¡Meta cumplida!' }),
      ]),
    );
  });
});

describe('Regla PROPOSAL_PENDING', () => {
  it('crea alerta y envía push a quien no ha votado', async () => {
    const { sendPushNotifications } = require('../services/pushNotifications');
    setupBaseMocks();
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([]).mockResolvedValue([]);
    (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.groupMember.findMany as jest.Mock)
      .mockResolvedValueOnce([makeMember()])      // para income
      .mockResolvedValueOnce([                    // para getMemberTokens
        { userId: 'u2', user: { id: 'u2', pushToken: 'ExponentPushToken[xyz]' } },
      ]);
    (prisma.proposal.findMany as jest.Mock).mockResolvedValue([
      { id: 'prop1', title: 'Comprar silla', votes: [] }, // nadie ha votado
    ]);

    const cron = require('node-cron');
    startAlertEngine();
    const cronCallback = (cron.schedule as jest.Mock).mock.calls.at(-1)[1];
    await cronCallback();

    const types = (prisma.alert.create as jest.Mock).mock.calls.map((c) => c[0].data.type);
    expect(types).toContain('PROPOSAL_PENDING');
    expect(sendPushNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Propuesta pendiente' }),
      ]),
    );
  });
});
