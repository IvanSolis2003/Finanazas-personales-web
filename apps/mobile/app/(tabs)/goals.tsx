import { useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, FAB, Card, ProgressBar, Button, Portal, Modal, TextInput } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGroupStore } from '../../store/groupStore';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  createdAt: string;
}

export default function GoalsScreen() {
  const { currentGroup } = useGroupStore();
  const groupId = currentGroup?.id ?? '';
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', groupId],
    queryFn: () => api.get<SavingGoal[]>(`/groups/${groupId}/goals`),
    enabled: !!groupId,
  });

  const createGoal = useMutation({
    mutationFn: (data: { name: string; targetAmount: number; targetDate: string }) =>
      api.post(`/groups/${groupId}/goals`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', groupId] });
      setVisible(false);
      resetForm();
    },
  });

  const updateGoal = useMutation({
    mutationFn: ({ goalId, savedAmount }: { goalId: string; savedAmount: number }) =>
      api.patch(`/groups/${groupId}/goals/${goalId}`, { savedAmount }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals', groupId] }),
  });

  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const [contributeVisible, setContributeVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingGoal | null>(null);
  const [contribution, setContribution] = useState('');

  function resetForm() { setName(''); setTargetAmount(''); setTargetDate(''); }

  async function handleCreate() {
    if (!name || !targetAmount || !targetDate) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    try {
      await createGoal.mutateAsync({ name, targetAmount: parseInt(targetAmount, 10), targetDate });
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear');
    }
  }

  async function handleContribute() {
    if (!selectedGoal || !contribution) return;
    const newAmount = selectedGoal.savedAmount + parseInt(contribution, 10);
    try {
      await updateGoal.mutateAsync({ goalId: selectedGoal.id, savedAmount: newAmount });
      setContributeVisible(false);
      setContribution('');
      setSelectedGoal(null);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
    }
  }

  if (!currentGroup) {
    return <View style={styles.center}><Text>Primero únete a un grupo</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Metas de Ahorro</Text>

      {isLoading ? (
        <Text style={{ textAlign: 'center' }}>Cargando...</Text>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const progress = item.savedAmount / item.targetAmount;
            const daysLeft = differenceInDays(new Date(item.targetDate), new Date());
            const achieved = item.savedAmount >= item.targetAmount;

            return (
              <Card style={styles.card}>
                <Card.Title
                  title={item.name}
                  subtitle={`Fecha límite: ${format(new Date(item.targetDate), 'dd MMM yyyy', { locale: es })}`}
                />
                <Card.Content>
                  <View style={styles.row}>
                    <Text variant="bodyMedium">{formatCurrency(item.savedAmount)}</Text>
                    <Text variant="bodySmall" style={{ color: '#888' }}>de {formatCurrency(item.targetAmount)}</Text>
                  </View>
                  <ProgressBar
                    progress={Math.min(progress, 1)}
                    color={achieved ? '#388E3C' : progress >= 0.8 ? '#F57C00' : '#1976D2'}
                    style={styles.progress}
                  />
                  <Text variant="bodySmall" style={{ color: '#888', marginTop: 4 }}>
                    {achieved ? '¡Meta cumplida!' : `${Math.round(progress * 100)}% · ${daysLeft} días restantes`}
                  </Text>

                  {!achieved && (
                    <Button
                      mode="outlined"
                      compact
                      style={{ marginTop: 8 }}
                      onPress={() => { setSelectedGoal(item); setContributeVisible(true); }}
                    >
                      Agregar aporte
                    </Button>
                  )}
                </Card.Content>
              </Card>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Sin metas de ahorro</Text>}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={() => setVisible(true)} />

      <Portal>
        <Modal visible={visible} onDismiss={() => { setVisible(false); resetForm(); }} contentContainerStyle={styles.modal}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>Nueva meta</Text>
          <TextInput label="Nombre" value={name} onChangeText={setName} style={styles.input} />
          <TextInput label="Monto objetivo (CLP)" value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" style={styles.input} />
          <TextInput label="Fecha límite (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} style={styles.input} placeholder="2026-12-31" />
          <Button mode="contained" onPress={handleCreate} loading={createGoal.isPending}>
            Crear meta
          </Button>
        </Modal>

        <Modal visible={contributeVisible} onDismiss={() => setContributeVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>
            Aporte a "{selectedGoal?.name}"
          </Text>
          <TextInput label="Monto a agregar (CLP)" value={contribution} onChangeText={setContribution} keyboardType="numeric" style={styles.input} />
          <Button mode="contained" onPress={handleContribute} loading={updateGoal.isPending}>
            Agregar
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progress: { height: 8, borderRadius: 4, marginTop: 8 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#1976D2' },
  modal: { backgroundColor: 'white', margin: 20, padding: 20, borderRadius: 12 },
  input: { marginBottom: 12 },
});
