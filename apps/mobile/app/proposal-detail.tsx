import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Chip, Button, Divider, Avatar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGroupStore } from '../store/groupStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Proposal {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  isPersonal: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTPONED';
  createdAt: string;
  resolvedAt?: string;
  proposedBy: { id: string; name: string };
  votes: { userId: string; vote: 'APPROVE' | 'REJECT' | 'POSTPONE'; user: { id: string; name: string } }[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F57C00',
  APPROVED: '#388E3C',
  REJECTED: '#D32F2F',
  POSTPONED: '#7B1FA2',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  POSTPONED: 'Postergada',
};

const VOTE_COLOR: Record<string, string> = {
  APPROVE: '#388E3C',
  REJECT: '#D32F2F',
  POSTPONE: '#7B1FA2',
};

const VOTE_LABEL: Record<string, string> = {
  APPROVE: 'Aprobó',
  REJECT: 'Rechazó',
  POSTPONE: 'Postergó',
};

const CAT_LABEL: Record<string, string> = {
  HOUSING: 'Vivienda', FOOD: 'Comida', TRANSPORT: 'Transporte',
  HEALTH: 'Salud', RECREATION: 'Recreación', CLOTHING: 'Ropa',
  EDUCATION: 'Educación', SERVICES: 'Servicios', OTHER: 'Otro',
};

export default function ProposalDetailScreen() {
  const { proposalId } = useLocalSearchParams<{ proposalId: string }>();
  const { currentGroup } = useGroupStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const groupId = currentGroup?.id ?? '';

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', groupId],
    queryFn: () => api.get<Proposal[]>(`/groups/${groupId}/proposals`),
    enabled: !!groupId,
  });

  const proposal = proposals.find((p) => p.id === proposalId);

  const vote = useMutation({
    mutationFn: (v: string) =>
      api.post(`/groups/${groupId}/proposals/${proposalId}/vote`, { vote: v }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals', groupId] }),
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  if (!proposal) {
    return (
      <View style={styles.center}>
        <Text>Cargando propuesta...</Text>
      </View>
    );
  }

  const myVote = proposal.votes.find((v) => v.userId === user?.id);
  const approveCount = proposal.votes.filter((v) => v.vote === 'APPROVE').length;
  const rejectCount = proposal.votes.filter((v) => v.vote === 'REJECT').length;
  const postponeCount = proposal.votes.filter((v) => v.vote === 'POSTPONE').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Button icon="arrow-left" mode="text" onPress={() => router.back()} style={styles.back}>
        Volver
      </Button>

      {/* Cabecera */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text variant="titleLarge" style={{ flex: 1, fontWeight: 'bold' }}>{proposal.title}</Text>
            <Chip
              style={{ backgroundColor: STATUS_COLOR[proposal.status] + '22' }}
              textStyle={{ color: STATUS_COLOR[proposal.status] }}
            >
              {STATUS_LABEL[proposal.status]}
            </Chip>
          </View>

          <Text variant="headlineMedium" style={styles.amount}>{formatCurrency(proposal.amount)}</Text>

          <View style={styles.row}>
            <Chip compact>{CAT_LABEL[proposal.category] ?? proposal.category}</Chip>
            {proposal.isPersonal && <Chip compact style={{ marginLeft: 6 }}>Personal</Chip>}
          </View>

          {proposal.description && (
            <Text variant="bodyMedium" style={styles.description}>{proposal.description}</Text>
          )}

          <Divider style={styles.divider} />

          <Text variant="bodySmall" style={{ color: '#888' }}>
            Propuesto por <Text style={{ fontWeight: 'bold' }}>{proposal.proposedBy.name}</Text>
            {' · '}{format(new Date(proposal.createdAt), "dd 'de' MMMM, HH:mm", { locale: es })}
          </Text>
          {proposal.resolvedAt && (
            <Text variant="bodySmall" style={{ color: '#888' }}>
              Resuelto el {format(new Date(proposal.resolvedAt), "dd 'de' MMMM, HH:mm", { locale: es })}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Resumen de votos */}
      <Card style={styles.card}>
        <Card.Title title="Votos" />
        <Card.Content>
          <View style={styles.votesSummary}>
            <View style={styles.voteCount}>
              <Text variant="headlineSmall" style={{ color: '#388E3C', fontWeight: 'bold' }}>{approveCount}</Text>
              <Text variant="bodySmall">Aprob.</Text>
            </View>
            <View style={styles.voteCount}>
              <Text variant="headlineSmall" style={{ color: '#D32F2F', fontWeight: 'bold' }}>{rejectCount}</Text>
              <Text variant="bodySmall">Rechazo</Text>
            </View>
            <View style={styles.voteCount}>
              <Text variant="headlineSmall" style={{ color: '#7B1FA2', fontWeight: 'bold' }}>{postponeCount}</Text>
              <Text variant="bodySmall">Poster.</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {proposal.votes.map((v) => (
            <View key={v.userId} style={styles.voteRow}>
              <Avatar.Text size={32} label={v.user.name.slice(0, 2).toUpperCase()} />
              <Text variant="bodyMedium" style={{ marginLeft: 10, flex: 1 }}>{v.user.name}</Text>
              <Chip
                compact
                style={{ backgroundColor: VOTE_COLOR[v.vote] + '22' }}
                textStyle={{ color: VOTE_COLOR[v.vote] }}
              >
                {VOTE_LABEL[v.vote]}
              </Chip>
            </View>
          ))}

          {proposal.votes.length === 0 && (
            <Text style={{ color: '#888', textAlign: 'center' }}>Nadie ha votado aún</Text>
          )}
        </Card.Content>
      </Card>

      {/* Acciones de voto */}
      {proposal.status === 'PENDING' && (
        <Card style={styles.card}>
          <Card.Title title={myVote ? `Tu voto: ${VOTE_LABEL[myVote.vote]}` : 'Tu voto'} />
          <Card.Content>
            <View style={styles.actionRow}>
              <Button
                mode={myVote?.vote === 'APPROVE' ? 'contained' : 'outlined'}
                buttonColor={myVote?.vote === 'APPROVE' ? '#388E3C' : undefined}
                onPress={() => vote.mutate('APPROVE')}
                loading={vote.isPending}
                style={styles.actionBtn}
              >
                Aprobar
              </Button>
              <Button
                mode={myVote?.vote === 'REJECT' ? 'contained' : 'outlined'}
                buttonColor={myVote?.vote === 'REJECT' ? '#D32F2F' : undefined}
                textColor={myVote?.vote === 'REJECT' ? '#fff' : '#D32F2F'}
                onPress={() => vote.mutate('REJECT')}
                loading={vote.isPending}
                style={styles.actionBtn}
              >
                Rechazar
              </Button>
            </View>
            <Button
              mode={myVote?.vote === 'POSTPONE' ? 'contained' : 'outlined'}
              buttonColor={myVote?.vote === 'POSTPONE' ? '#7B1FA2' : undefined}
              onPress={() => vote.mutate('POSTPONE')}
              loading={vote.isPending}
              style={{ marginTop: 8 }}
            >
              Postergar
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  card: { borderRadius: 10, marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  amount: { fontWeight: 'bold', color: '#1976D2', marginVertical: 8 },
  row: { flexDirection: 'row', marginTop: 4 },
  description: { marginTop: 12, color: '#444' },
  divider: { marginVertical: 12 },
  votesSummary: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  voteCount: { alignItems: 'center' },
  voteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1 },
});
