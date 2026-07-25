'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
}

/** Usuario actual según la cookie de sesión (endpoint /api/auth/me). */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<{ user: AuthUser }>('/auth/me').then((r) => r.user),
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiClient.post<{ user: AuthUser }>('/auth/login', data),
    onSuccess: (res) => {
      qc.setQueryData(['me'], res.user);
      router.replace('/dashboard');
    },
  });
}

export function useRegister() {
  // El registro deja la cuenta PENDIENTE de aprobación: no inicia sesión.
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      apiClient.post<{ pending: boolean; message: string }>('/auth/register', data),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout'),
    onSuccess: () => {
      qc.clear();
      router.replace('/login');
    },
  });
}
