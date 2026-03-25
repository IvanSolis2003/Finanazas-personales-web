import { useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, FAB, Card, Chip, Button, Portal, Modal, TextInput } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useGroupStore } from '../../store/groupStore';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
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
  proposedBy: { id: string; name: string };
  votes: { userId: string; vote: string; user: { name: string } }[];
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

const CATEGORIES = ['HOUSING', 'FOOD', 'TRANSPORT', 'HEALTH', 'RECREATION', 'CLOTHING', 'EDUCATION', 'SERVICES', 'OTHER'];
const CAT_LABEL: Record<string, string> = {
  HOUSING: 'Vivienda', FOOD: 'Comida', TRANSPORT: 'Transporte',
  HEALTH: 'Salud', RECREATION: 'Recreación', CLOTHING: 'Ropa',
  EDUCATION: 'Educación', SERVICES: 'Servicios', OTHER: 'Otro',
};

export default function ProposalsScreen() {
  const { currentGroup } = useGroupStore();
  const groupId = currentGroup?.id ?? '';
  const queryClient = useQueryClient();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals', groupId],
    queryFn: () => api.get<Proposal[]>(`/groups/${groupId}/proposals`),
    enabled: !!groupId,
  });

  const vote = useMutation({
    mutationFn: ({ propId, v }: { propId: string; v: string }) =>
      api.post(`/groups/${groupId}/proposals/${propId}/vote`, { vote: v }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals', groupId] }),
  });

  const createProposal = useMutation({
    mutationFn: (data: { title: string; description?: string; amount: number; category: string }) =>
      api.post(`/groups/${groupId}/proposals`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', groupId] });
      setVisible(false);
      resetForm();
    },
  });

  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('OTHER');

  function resetForm() {
    setTitle(''); setDescription(''); setAmount(''); setCategory('OTHER');
  }

  async function handleCreate() {
    if (!title || !amount) {
      Alert.alert('Error', 'Completa título y monto');
      return;
    }
    try {
      await createProposal.mutateAsync({ title, description: description || undefined, amount: parseInt(amount, 10), category });
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear');
    }
  }

  if (!currentGroup) {
    return <View style={styles.center}><Text>Primero únete a un grupo</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Propuestas</Text>

      {isLoading ? (
        <Text style={{ textAlign: 'center' }}>Cargando...</Text>
      ) : (
        <FlatList
          data={proposals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => router.push({ pathname: '/proposal-detail', params: { proposalId: item.id } })}>
              <Card.Title
                title={item.title}
                subtitle={`${item.proposedBy.name} · ${format(new Date(item.createdAt), 'dd MMM', { locale: es })}`}
                right={() => (
                  <Chip style={{ backgroundColor: STATUS_COLOR[item.status] + '22', marginRight: 8 }}
                    textStyle={{ color: STATUS_COLOR[item.status] }}>
                    {STATUS_LABEL[item.status]}
                  </Chip>
                )}
              />
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{formatCurrency(item.amount)}</Text>
                <Text variant="bodySmall" style={{ color: '#888' }}>{CAT_LABEL[item.category]}{item.isPersonal ? ' · Personal' : ''}</Text>
                {item.description ? <Text variant="bodySmall" style={{ marginTop: 4 }}>{item.description}</Text> : null}

                {item.status === 'PENDING' && (
                  <View style={styles.voteRow}>
                    <Button mode="contained" compact buttonColor="#388E3C"
                      onPress={() => vote.mutate({ propId: item.id, v: 'APPROVE' })}>
                      Aprobar
                    </Button>
                    <Button mode="contained" compact buttonColor="#D32F2F"
                      onPress={() => vote.mutate({ propId: item.id, v: 'REJECT' })}>
                      Rechazar
                    </Button>
                    <Button mode="outlined" compact
                      onPress={() => vote.mutate({ propId: item.id, v: 'POSTPONE' })}>
                      Postergar
                    </Button>
                  </View>
                )}

                {item.votes.length > 0 && (
                  <Text variant="bodySmall" style={{ color: '#888', marginTop: 6 }}>
                    Votos: {item.votes.map((v) => `${v.user.name}: ${v.vote}`).join(', ')}
                  </Text>
                )}
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Sin propuestas</Text>}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={() => setVisible(true)} />

      <Portal>
        <Modal visible={visible} onDismiss={() => { setVisible(false); resetForm(); }} contentContainerStyle={styles.modal}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>Nueva propuesta</Text>
          <TextInput label="Título" value={title} onChangeText={setTitle} style={styles.input} />
          <TextInput label="Descripción (opcional)" value={description} onChangeText={setDescription} style={styles.input} multiline />
          <TextInput label="Monto (CLP)" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => (
              <Chip key={c} selected={category === c} onPress={() => setCategory(c)} compact style={{ marginBottom: 4 }}>
                {CAT_LABEL[c]}
              </Chip>
            ))}
          </View>
          <Button mode="contained" onPress={handleCreate} loading={createProposal.isPending} style={{ marginTop: 8 }}>
            Proponer
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontWeight: 'bold', color: '#1976D2', marginBottom: 12 },
  card: { marginBottom: 10, borderRadius: 10 },
  voteRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#1976D2' },
  modal: { backgroundColor: 'white', margin: 20, padding: 20, borderRadius: 12 },
  input: { marginBottom: 12 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
});
