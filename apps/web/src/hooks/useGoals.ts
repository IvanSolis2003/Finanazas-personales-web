'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
}

export function useGoals(groupId: string) {
  return useQuery({
    queryKey: ['goals', groupId],
    queryFn: () => apiClient.get<Goal[]>(`/groups/${groupId}/goals`),
    enabled: !!groupId,
  });
}

export function useCreateGoal(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; targetAmount: number; targetDate: string }) =>
      apiClient.post<Goal>(`/groups/${groupId}/goals`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', groupId] });
      qc.invalidateQueries({ queryKey: ['summary', groupId] });
    },
  });
}

export function useUpdateGoal(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, savedAmount }: { goalId: string; savedAmount: number }) =>
      apiClient.patch<Goal>(`/groups/${groupId}/goals/${goalId}`, { savedAmount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', groupId] });
      qc.invalidateQueries({ queryKey: ['summary', groupId] });
    },
  });
}
