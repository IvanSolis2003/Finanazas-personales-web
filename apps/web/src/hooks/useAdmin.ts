'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isApproved: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get<AdminUser[]>('/admin/users'),
  });
}

export function useSetApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      apiClient.patch<AdminUser>(`/admin/users/${id}`, { isApproved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}
