'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTPONED';
export type Vote = 'APPROVE' | 'REJECT' | 'POSTPONE';

export interface Proposal {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  isPersonal: boolean;
  status: ProposalStatus;
  createdAt: string;
  proposedBy: { id: string; name: string };
  votes: { id: string; userId: string; vote: Vote; user?: { id: string; name: string } }[];
}

export interface NewProposal {
  title: string;
  description?: string;
  amount: number;
  category: string;
  isPersonal?: boolean;
}

export function useProposals(groupId: string) {
  return useQuery({
    queryKey: ['proposals', groupId],
    queryFn: () => apiClient.get<Proposal[]>(`/groups/${groupId}/proposals`),
    enabled: !!groupId,
  });
}

export function useCreateProposal(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NewProposal) =>
      apiClient.post<Proposal>(`/groups/${groupId}/proposals`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals', groupId] }),
  });
}

export function useVoteProposal(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propId, vote }: { propId: string; vote: Vote }) =>
      apiClient.post(`/groups/${groupId}/proposals/${propId}/vote`, { vote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals', groupId] }),
  });
}
