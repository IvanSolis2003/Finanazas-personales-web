'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  month: number;
  year: number;
}

export interface AlertItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export function useBudgets(groupId: string) {
  return useQuery({
    queryKey: ['budgets', groupId],
    queryFn: () => apiClient.get<Budget[]>(`/groups/${groupId}/budgets`),
    enabled: !!groupId,
  });
}

export function useUpsertBudget(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; monthlyLimit: number }) =>
      apiClient.post<Budget>(`/groups/${groupId}/budgets`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', groupId] }),
  });
}

export function useAlerts(groupId: string) {
  return useQuery({
    queryKey: ['alerts', groupId],
    queryFn: () => apiClient.get<AlertItem[]>(`/groups/${groupId}/alerts`),
    enabled: !!groupId,
  });
}

export function useMarkAlertsRead(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch(`/groups/${groupId}/alerts/read-all`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts', groupId] }),
  });
}

export function useUpdateSalary(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { monthlySalary: number; salaryVisible?: boolean }) =>
      apiClient.patch(`/groups/${groupId}/members/salary`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['summary', groupId] });
    },
  });
}

export function useUpdateGroupConfig(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; approvalMode?: 'MAJORITY' | 'UNANIMOUS'; personalThreshold?: number }) =>
      apiClient.patch(`/groups/${groupId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] }),
  });
}
