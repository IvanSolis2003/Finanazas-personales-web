import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { register, login, refresh } from '../controllers/auth.controller';
import prisma from '../prisma/client';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn().mockReturnValue({ userId: 'u1' }),
}));

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function mockReq(body: object): Request {
  return { body } as Request;
}

const mockUser = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@test.com',
  passwordHash: 'hashed_password',
  pushToken: null,
  createdAt: new Date(),
};

describe('register', () => {
  it('crea usuario y retorna tokens', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'u1', name: 'Ana', email: 'ana@test.com',
    });

    const req = mockReq({ name: 'Ana', email: 'ana@test.com', password: 'pass123' });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({ email: 'ana@test.com' }),
      accessToken: 'mock_token',
    }));
  });

  it('retorna 409 si el email ya existe', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const req = mockReq({ name: 'Ana', email: 'ana@test.com', password: 'pass123' });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email ya registrado' });
  });

  it('retorna 400 si faltan campos requeridos', async () => {
    const req = mockReq({ email: 'ana@test.com' }); // sin name ni password
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('login', () => {
  it('retorna tokens con credenciales válidas', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const req = mockReq({ email: 'ana@test.com', password: 'pass123' });
    const res = mockRes();

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: 'mock_token',
      refreshToken: 'mock_token',
    }));
  });

  it('retorna 401 si el usuario no existe', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = mockReq({ email: 'noexiste@test.com', password: 'pass123' });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('retorna 401 si la contraseña es incorrecta', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const req = mockReq({ email: 'ana@test.com', password: 'wrong' });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('refresh', () => {
  it('retorna nuevos tokens con refreshToken válido', async () => {
    const req = mockReq({ refreshToken: 'valid_refresh_token' });
    const res = mockRes();

    await refresh(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: 'mock_token',
    }));
  });

  it('retorna 400 si no se envía refreshToken', async () => {
    const req = mockReq({});
    const res = mockRes();

    await refresh(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
