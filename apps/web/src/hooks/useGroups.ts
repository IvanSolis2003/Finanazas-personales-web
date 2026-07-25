'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { Group } from '@/store/groupStore';

interface Membership {
  group: Group & { members: { id: string }[] };
}

/** Grupos a los que pertenece el usuario. */
export function useMyGroups() {
  return useQuery({
    queryKey: ['my-groups'],
    queryFn: () => apiClient.get<Membership[]>('/groups'),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => apiClient.post<Group>('/groups', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-groups'] }),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { inviteCode: string }) => apiClient.post<Group>('/groups/join', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-groups'] }),
  });
}
