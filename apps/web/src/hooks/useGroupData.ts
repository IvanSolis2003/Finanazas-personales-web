'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface Summary {
  totalIncome: number;
  totalExpenses: number;
  available: number;
  byCategory: Record<string, number>;
  budgets: { id: string; category: string; monthlyLimit: number }[];
  goals: { id: string; name: string; targetAmount: number; savedAmount: number }[];
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: 'SHARED' | 'INDIVIDUAL';
  splitBetween: string[];
  recurringId: string | null;
  date: string;
  paidBy: { id: string; name: string };
}

export interface NewExpense {
  description: string;
  amount: number;
  category: string;
  type: 'SHARED' | 'INDIVIDUAL';
  splitBetween?: string[];
  date?: string;
}

export interface GroupMemberDetail {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  monthlySalary: number;
  salaryVisible: boolean;
  user: { id: string; name: string; email: string };
}

export interface GroupDetail {
  id: string;
  name: string;
  inviteCode: string;
  approvalMode: 'MAJORITY' | 'UNANIMOUS';
  personalThreshold: number;
  members: GroupMemberDetail[];
}

export interface BalanceResult {
  balances: Record<string, number>;
  transactions: { from: string; fromId: string; to: string; toId: string; amount: number }[];
}

export function useSummary(groupId: string, month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month) params.set('month', String(month));
  if (year) params.set('year', String(year));
  const qs = params.toString() ? `?${params}` : '';

  return useQuery({
    queryKey: ['summary', groupId, month, year],
    queryFn: () => apiClient.get<Summary>(`/groups/${groupId}/summary${qs}`),
    enabled: !!groupId,
  });
}

export function useGroupDetail(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => apiClient.get<GroupDetail>(`/groups/${groupId}`),
    enabled: !!groupId,
  });
}

export function useExpenses(groupId: string, month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month) params.set('month', String(month));
  if (year) params.set('year', String(year));
  const qs = params.toString() ? `?${params}` : '';

  return useQuery({
    queryKey: ['expenses', groupId, month, year],
    queryFn: () => apiClient.get<Expense[]>(`/groups/${groupId}/expenses${qs}`),
    enabled: !!groupId,
  });
}

export function useCreateExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NewExpense) => apiClient.post<Expense>(`/groups/${groupId}/expenses`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['summary', groupId] });
      qc.invalidateQueries({ queryKey: ['balance', groupId] });
      qc.invalidateQueries({ queryKey: ['members-breakdown', groupId] });
    },
  });
}

export function useUpdateExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ expId, data }: { expId: string; data: NewExpense }) =>
      apiClient.patch<Expense>(`/groups/${groupId}/expenses/${expId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['summary', groupId] });
      qc.invalidateQueries({ queryKey: ['balance', groupId] });
      qc.invalidateQueries({ queryKey: ['members-breakdown', groupId] });
    },
  });
}

export function useDeleteExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expId: string) => apiClient.delete(`/groups/${groupId}/expenses/${expId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['summary', groupId] });
      qc.invalidateQueries({ queryKey: ['balance', groupId] });
      qc.invalidateQueries({ queryKey: ['members-breakdown', groupId] });
    },
  });
}

export function useBalance(groupId: string) {
  return useQuery({
    queryKey: ['balance', groupId],
    queryFn: () => apiClient.get<BalanceResult>(`/groups/${groupId}/balance`),
    enabled: !!groupId,
  });
}

export interface MemberBreakdown {
  userId: string;
  name: string;
  isSelf: boolean;
  incomeVisible: boolean;
  income: number | null;
  spent: number;
  byCategory: Record<string, number>;
  over: boolean;
  remaining: number | null;
}

export interface MonthMetric {
  month: number;
  year: number;
  key: string;
  label: string;
  future: boolean;
  income: number;
  expenses: number;
  available: number;
  byCategory: Record<string, number>;
}

export function useMetrics(groupId: string, months = 6, userId?: string) {
  const qs = `?months=${months}${userId ? `&userId=${userId}` : ''}`;
  return useQuery({
    queryKey: ['metrics', groupId, months, userId ?? 'group'],
    queryFn: () =>
      apiClient.get<{ income: number; series: MonthMetric[] }>(`/groups/${groupId}/metrics${qs}`),
    enabled: !!groupId,
  });
}

export function useMembersBreakdown(groupId: string, month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month) params.set('month', String(month));
  if (year) params.set('year', String(year));
  const qs = params.toString() ? `?${params}` : '';

  return useQuery({
    queryKey: ['members-breakdown', groupId, month, year],
    queryFn: () => apiClient.get<MemberBreakdown[]>(`/groups/${groupId}/members-breakdown${qs}`),
    enabled: !!groupId,
  });
}
