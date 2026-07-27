'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface Recurring {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: 'SHARED' | 'INDIVIDUAL';
  splitBetween: string[];
  paidById: string;
}

export interface NewRecurring {
  description: string;
  amount: number;
  category: string;
  type: 'SHARED' | 'INDIVIDUAL';
  splitBetween?: string[];
}

export function useRecurring(groupId: string) {
  return useQuery({
    queryKey: ['recurring', groupId],
    queryFn: () => apiClient.get<Recurring[]>(`/groups/${groupId}/recurring`),
    enabled: !!groupId,
  });
}

export function useCreateRecurring(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NewRecurring) =>
      apiClient.post<Recurring>(`/groups/${groupId}/recurring`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring', groupId] }),
  });
}

export function useDeleteRecurring(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rid: string) => apiClient.delete(`/groups/${groupId}/recurring/${rid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring', groupId] }),
  });
}

// Materializa los gastos fijos del mes indicado (idempotente).
export function useApplyRecurring(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      apiClient.post<{ created: number }>(
        `/groups/${groupId}/recurring/apply?month=${month}&year=${year}`,
      ),
    onSuccess: (res) => {
      if (res.created > 0) {
        qc.invalidateQueries({ queryKey: ['expenses', groupId] });
        qc.invalidateQueries({ queryKey: ['summary', groupId] });
        qc.invalidateQueries({ queryKey: ['balance', groupId] });
        qc.invalidateQueries({ queryKey: ['members-breakdown', groupId] });
      }
    },
  });
}
