import { z } from 'zod';

// Esquemas Zod equivalentes a los del backend Express. Se usan tanto en las
// API Routes (validar el body) como en los formularios de MUI (client-side).

export const EXPENSE_CATEGORIES = [
  'HOUSING',
  'FOOD',
  'TRANSPORT',
  'HEALTH',
  'RECREATION',
  'CLOTHING',
  'EDUCATION',
  'SERVICES',
  'OTHER',
] as const;

export const categoryEnum = z.enum(EXPENSE_CATEGORIES);

export const registerSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Requerido'),
});

export const createGroupSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(4, 'Código inválido'),
});

export const expenseSchema = z.object({
  description: z.string().min(1, 'Requerido'),
  amount: z.number().int().positive('Debe ser mayor a 0'),
  category: categoryEnum,
  type: z.enum(['SHARED', 'INDIVIDUAL']),
  splitBetween: z.array(z.string()).optional(),
  date: z.string().optional(),
});

export const proposalSchema = z.object({
  title: z.string().min(1, 'Requerido'),
  description: z.string().optional(),
  amount: z.number().int().positive('Debe ser mayor a 0'),
  category: categoryEnum,
  isPersonal: z.boolean().optional(),
});

export const voteSchema = z.object({
  vote: z.enum(['APPROVE', 'REJECT', 'POSTPONE']),
});

export const goalSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  targetAmount: z.number().int().positive('Debe ser mayor a 0'),
  targetDate: z.string(),
});

export const budgetSchema = z.object({
  category: categoryEnum,
  monthlyLimit: z.number().int().positive('Debe ser mayor a 0'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
});

export const salarySchema = z.object({
  monthlySalary: z.number().int().min(0),
  salaryVisible: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ProposalInput = z.infer<typeof proposalSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
