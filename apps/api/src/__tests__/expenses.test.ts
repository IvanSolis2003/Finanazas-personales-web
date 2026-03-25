import { Response } from 'express';
import { createExpense, deleteExpense, listExpenses } from '../controllers/expenses.controller';
import prisma from '../prisma/client';
import { AuthRequest } from '../middlewares/auth';

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function mockReq(overrides: Partial<AuthRequest>): AuthRequest {
  return {
    userId: 'u1',
    params: { id: 'g1' },
    body: {},
    query: {},
    ...overrides,
  } as AuthRequest;
}

const mockMember = { id: 'm1', userId: 'u1', groupId: 'g1', role: 'MEMBER', monthlySalary: 0, salaryVisible: true, joinedAt: new Date() };
const mockAdminMember = { ...mockMember, role: 'ADMIN' };

const mockExpense = {
  id: 'exp1',
  groupId: 'g1',
  paidById: 'u1',
  description: 'Supermercado',
  amount: 50000,
  category: 'FOOD',
  type: 'SHARED',
  splitBetween: ['u1', 'u2'],
  date: new Date(),
  createdAt: new Date(),
  paidBy: { id: 'u1', name: 'Ana' },
};

describe('createExpense', () => {
  it('crea gasto SHARED correctamente', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);
    (prisma.expense.create as jest.Mock).mockResolvedValue(mockExpense);

    const req = mockReq({
      body: {
        description: 'Supermercado',
        amount: 50000,
        category: 'FOOD',
        type: 'SHARED',
        splitBetween: ['u1', 'u2'],
      },
    });
    const res = mockRes();

    await createExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(prisma.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'SHARED', groupId: 'g1' }),
      }),
    );
  });

  it('retorna 403 si el usuario no es miembro del grupo', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockReq({ body: { description: 'Test', amount: 1000, category: 'FOOD', type: 'INDIVIDUAL' } });
    const res = mockRes();

    await createExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('retorna 400 si el monto es negativo', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);

    const req = mockReq({ body: { description: 'Test', amount: -100, category: 'FOOD', type: 'INDIVIDUAL' } });
    const res = mockRes();

    await createExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 si falta la descripción', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);

    const req = mockReq({ body: { amount: 5000, category: 'FOOD', type: 'INDIVIDUAL' } });
    const res = mockRes();

    await createExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('deleteExpense', () => {
  it('elimina gasto si el usuario es quien pagó', async () => {
    (prisma.expense.findUnique as jest.Mock).mockResolvedValue(mockExpense);
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);
    (prisma.expense.delete as jest.Mock).mockResolvedValue(mockExpense);

    const req = mockReq({ params: { id: 'g1', expId: 'exp1' } });
    const res = mockRes();

    await deleteExpense(req, res);

    expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: 'exp1' } });
    expect(res.json).toHaveBeenCalledWith({ message: 'Gasto eliminado' });
  });

  it('elimina gasto si el usuario es ADMIN aunque no pagó', async () => {
    const otherExpense = { ...mockExpense, paidById: 'u2' };
    (prisma.expense.findUnique as jest.Mock).mockResolvedValue(otherExpense);
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockAdminMember);
    (prisma.expense.delete as jest.Mock).mockResolvedValue(otherExpense);

    const req = mockReq({ params: { id: 'g1', expId: 'exp1' } });
    const res = mockRes();

    await deleteExpense(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Gasto eliminado' });
  });

  it('retorna 403 si el usuario no pagó y no es ADMIN', async () => {
    const otherExpense = { ...mockExpense, paidById: 'u2' };
    (prisma.expense.findUnique as jest.Mock).mockResolvedValue(otherExpense);
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);

    const req = mockReq({ params: { id: 'g1', expId: 'exp1' } });
    const res = mockRes();

    await deleteExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('retorna 404 si el gasto no existe', async () => {
    (prisma.expense.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockReq({ params: { id: 'g1', expId: 'noexiste' } });
    const res = mockRes();

    await deleteExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('listExpenses', () => {
  it('retorna lista de gastos del grupo', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([mockExpense]);

    const req = mockReq({});
    const res = mockRes();

    await listExpenses(req, res);

    expect(res.json).toHaveBeenCalledWith([mockExpense]);
  });

  it('retorna 403 si no es miembro', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockReq({});
    const res = mockRes();

    await listExpenses(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
