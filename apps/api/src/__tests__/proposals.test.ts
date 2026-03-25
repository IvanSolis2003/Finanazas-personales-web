import { Response } from 'express';
import { createProposal, voteProposal } from '../controllers/proposals.controller';
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
    ...overrides,
  } as AuthRequest;
}

const mockMember = { id: 'm1', userId: 'u1', groupId: 'g1', role: 'MEMBER', monthlySalary: 0, salaryVisible: true, joinedAt: new Date() };

const mockGroup = {
  id: 'g1',
  name: 'Familia',
  inviteCode: 'ABC12345',
  approvalMode: 'MAJORITY',
  personalThreshold: 50000,
  createdAt: new Date(),
  members: [
    { userId: 'u1' },
    { userId: 'u2' },
    { userId: 'u3' },
  ],
};

const mockProposalPending = {
  id: 'prop1',
  groupId: 'g1',
  proposedById: 'u2',
  title: 'Nuevo TV',
  amount: 300000,
  category: 'RECREATION',
  isPersonal: false,
  status: 'PENDING',
  createdAt: new Date(),
  resolvedAt: null,
  votes: [],
};

describe('createProposal', () => {
  it('crea propuesta y la marca como personal si el monto es bajo el umbral', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup);
    (prisma.proposal.create as jest.Mock).mockResolvedValue({
      ...mockProposalPending,
      amount: 30000,
      isPersonal: true,
    });

    const req = mockReq({
      body: { title: 'Café', amount: 30000, category: 'FOOD' },
    });
    const res = mockRes();

    await createProposal(req, res);

    expect(prisma.proposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPersonal: true }),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('crea propuesta grupal si el monto supera el umbral', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup);
    (prisma.proposal.create as jest.Mock).mockResolvedValue(mockProposalPending);

    const req = mockReq({
      body: { title: 'Nuevo TV', amount: 300000, category: 'RECREATION' },
    });
    const res = mockRes();

    await createProposal(req, res);

    expect(prisma.proposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPersonal: false }),
      }),
    );
  });

  it('retorna 403 si el usuario no es miembro', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockReq({ body: { title: 'Test', amount: 10000, category: 'FOOD' } });
    const res = mockRes();

    await createProposal(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('voteProposal', () => {
  it('rechaza la propuesta inmediatamente si el voto es REJECT', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(mockProposalPending);
    (prisma.proposalVote.upsert as jest.Mock).mockResolvedValue({});
    (prisma.proposal.update as jest.Mock).mockResolvedValue({
      ...mockProposalPending, status: 'REJECTED',
    });

    const req = mockReq({
      params: { id: 'g1', propId: 'prop1' },
      body: { vote: 'REJECT' },
    });
    const res = mockRes();

    await voteProposal(req, res);

    expect(prisma.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED' }),
      }),
    );
  });

  it('aprueba con mayoría en modo MAJORITY (3 miembros, 2 aprueban)', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(mockProposalPending);
    (prisma.proposalVote.upsert as jest.Mock).mockResolvedValue({});
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup); // 3 miembros
    (prisma.proposalVote.findMany as jest.Mock).mockResolvedValue([
      { vote: 'APPROVE' },
      { vote: 'APPROVE' },
    ]);
    (prisma.proposal.update as jest.Mock).mockResolvedValue({
      ...mockProposalPending, status: 'APPROVED',
    });

    const req = mockReq({
      params: { id: 'g1', propId: 'prop1' },
      body: { vote: 'APPROVE' },
    });
    const res = mockRes();

    await voteProposal(req, res);

    expect(prisma.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED' }),
      }),
    );
  });

  it('no aprueba si no hay mayoría suficiente', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(mockProposalPending);
    (prisma.proposalVote.upsert as jest.Mock).mockResolvedValue({});
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup); // 3 miembros → necesita 2
    (prisma.proposalVote.findMany as jest.Mock).mockResolvedValue([
      { vote: 'APPROVE' }, // solo 1 → no alcanza
    ]);

    const req = mockReq({
      params: { id: 'g1', propId: 'prop1' },
      body: { vote: 'APPROVE' },
    });
    const res = mockRes();

    await voteProposal(req, res);

    // No debe actualizar la propuesta
    expect(prisma.proposal.update).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ approveCount: 1, required: 2 }),
    );
  });

  it('retorna 409 si la propuesta ya fue resuelta', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockMember);
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
      ...mockProposalPending, status: 'APPROVED',
    });

    const req = mockReq({
      params: { id: 'g1', propId: 'prop1' },
      body: { vote: 'APPROVE' },
    });
    const res = mockRes();

    await voteProposal(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});
