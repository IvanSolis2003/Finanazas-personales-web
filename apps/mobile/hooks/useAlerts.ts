import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface Alert {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function useAlerts(groupId: string) {
  return useQuery({
    queryKey: ['alerts', groupId],
    queryFn: () => api.get<Alert[]>(`/groups/${groupId}/alerts`),
    enabled: !!groupId,
    refetchInterval: 60_000, // refresca cada minuto
  });
}

export function useMarkAlertsRead(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/groups/${groupId}/alerts/read-all`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', groupId] }),
  });
}
