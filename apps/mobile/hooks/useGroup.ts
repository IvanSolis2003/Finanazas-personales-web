import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useGroupStore } from '../store/groupStore';

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.get<{ id: string; name: string; inviteCode: string; members: unknown[] }>(`/groups/${groupId}`),
    enabled: !!groupId,
  });
}

export function useGroupSummary(groupId: string) {
  return useQuery({
    queryKey: ['summary', groupId],
    queryFn: () =>
      api.get<{
        totalIncome: number;
        totalExpenses: number;
        available: number;
        byCategory: Record<string, number>;
      }>(`/groups/${groupId}/summary`),
    enabled: !!groupId,
  });
}

export function useGroupBalance(groupId: string) {
  return useQuery({
    queryKey: ['balance', groupId],
    queryFn: () =>
      api.get<{
        balances: Record<string, number>;
        transactions: { from: string; fromId: string; to: string; toId: string; amount: number }[];
      }>(`/groups/${groupId}/balance`),
    enabled: !!groupId,
  });
}
