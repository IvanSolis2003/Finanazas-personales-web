'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export type GoalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTPONED';
export type Vote = 'APPROVE' | 'REJECT' | 'POSTPONE';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  status: GoalStatus;
  proposedById: string | null;
  votes: { userId: string; vote: Vote }[];
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', groupId] }),
  });
}

export function useVoteGoal(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, vote }: { goalId: string; vote: Vote }) =>
      apiClient.post(`/groups/${groupId}/goals/${goalId}/vote`, { vote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', groupId] }),
  });
}

// Registrar un aporte a la meta (baja el disponible del mes en curso).
export function useContributeGoal(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, amount }: { goalId: string; amount: number }) =>
      apiClient.patch<Goal>(`/groups/${groupId}/goals/${goalId}`, { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', groupId] });
      qc.invalidateQueries({ queryKey: ['summary', groupId] });
      qc.invalidateQueries({ queryKey: ['members-breakdown', groupId] });
    },
  });
}

export function useDeleteGoal(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => apiClient.delete(`/groups/${groupId}/goals/${goalId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', groupId] }),
  });
}
