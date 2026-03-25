import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: 'SHARED' | 'INDIVIDUAL';
  splitBetween: string[];
  date: string;
  paidBy: { id: string; name: string };
}

interface NewExpense {
  description: string;
  amount: number;
  category: string;
  type: 'SHARED' | 'INDIVIDUAL';
  splitBetween?: string[];
  date?: string;
}

export function useExpenses(groupId: string, month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month) params.set('month', String(month));
  if (year) params.set('year', String(year));
  const query = params.toString() ? `?${params}` : '';

  return useQuery({
    queryKey: ['expenses', groupId, month, year],
    queryFn: () => api.get<Expense[]>(`/groups/${groupId}/expenses${query}`),
    enabled: !!groupId,
  });
}

export function useCreateExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewExpense) => api.post<Expense>(`/groups/${groupId}/expenses`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['summary', groupId] });
    },
  });
}

export function useDeleteExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expId: string) => api.delete(`/groups/${groupId}/expenses/${expId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['summary', groupId] });
    },
  });
}
