import { useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, FAB, Card, Chip, IconButton, Portal, Modal, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { useGroupStore } from '../../store/groupStore';
import { useExpenses, useCreateExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { formatCurrency } from '../../utils/formatCurrency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIES = [
  'HOUSING', 'FOOD', 'TRANSPORT', 'HEALTH',
  'RECREATION', 'CLOTHING', 'EDUCATION', 'SERVICES', 'OTHER',
];

const CAT_LABEL: Record<string, string> = {
  HOUSING: 'Vivienda', FOOD: 'Comida', TRANSPORT: 'Transporte',
  HEALTH: 'Salud', RECREATION: 'Recreación', CLOTHING: 'Ropa',
  EDUCATION: 'Educación', SERVICES: 'Servicios', OTHER: 'Otro',
};

export default function ExpensesScreen() {
  const { currentGroup } = useGroupStore();
  const groupId = currentGroup?.id ?? '';
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const { data: expenses = [], isLoading } = useExpenses(groupId, month, year);
  const createExpense = useCreateExpense(groupId);
  const deleteExpense = useDeleteExpense(groupId);

  const [visible, setVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [type, setType] = useState<'SHARED' | 'INDIVIDUAL'>('SHARED');

  function resetForm() {
    setDescription(''); setAmount(''); setCategory('FOOD'); setType('SHARED');
  }

  async function handleCreate() {
    if (!description || !amount) {
      Alert.alert('Error', 'Completa descripción y monto');
      return;
    }
    try {
      await createExpense.mutateAsync({
        description,
        amount: parseInt(amount, 10),
        category,
        type,
      });
      setVisible(false);
      resetForm();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear el gasto');
    }
  }

  function confirmDelete(expId: string) {
    Alert.alert('Eliminar gasto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteExpense.mutate(expId) },
    ]);
  }

  if (!currentGroup) {
    return (
      <View style={styles.center}>
        <Text>Primero únete a un grupo</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>
        Gastos — {format(new Date(year, month - 1), 'MMMM yyyy', { locale: es })}
      </Text>

      {isLoading ? (
        <Text style={styles.center}>Cargando...</Text>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Title
                title={item.description}
                subtitle={`${item.paidBy.name} · ${format(new Date(item.date), 'dd MMM', { locale: es })}`}
                right={() => (
                  <IconButton icon="trash-can-outline" onPress={() => confirmDelete(item.id)} />
                )}
              />
              <Card.Content style={styles.row}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  {formatCurrency(item.amount)}
                </Text>
                <View style={styles.chips}>
                  <Chip compact style={styles.chip}>{CAT_LABEL[item.category] ?? item.category}</Chip>
                  <Chip compact style={[styles.chip, item.type === 'SHARED' ? styles.shared : styles.individual]}>
                    {item.type === 'SHARED' ? 'Compartido' : 'Personal'}
                  </Chip>
                </View>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Sin gastos este mes</Text>}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={() => setVisible(true)} />

      <Portal>
        <Modal visible={visible} onDismiss={() => { setVisible(false); resetForm(); }} contentContainerStyle={styles.modal}>
          <Text variant="titleMedium" style={styles.modalTitle}>Nuevo gasto</Text>

          <TextInput label="Descripción" value={description} onChangeText={setDescription} style={styles.input} />
          <TextInput
            label="Monto (CLP)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text variant="labelMedium" style={styles.label}>Categoría</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                selected={category === c}
                onPress={() => setCategory(c)}
                style={styles.catChip}
                compact
              >
                {CAT_LABEL[c]}
              </Chip>
            ))}
          </View>

          <SegmentedButtons
            value={type}
            onValueChange={(v) => setType(v as 'SHARED' | 'INDIVIDUAL')}
            buttons={[
              { value: 'SHARED', label: 'Compartido' },
              { value: 'INDIVIDUAL', label: 'Personal' },
            ]}
            style={styles.input}
          />

          <Button mode="contained" onPress={handleCreate} loading={createExpense.isPending}>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { height: 24 },
  shared: { backgroundColor: '#E3F2FD' },
  individual: { backgroundColor: '#F3E5F5' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#1976D2' },
  modal: { backgroundColor: 'white', margin: 20, padding: 20, borderRadius: 12 },
  modalTitle: { fontWeight: 'bold', marginBottom: 16 },
  input: { marginBottom: 12 },
  label: { marginBottom: 6, color: '#555' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catChip: { marginBottom: 4 },
});
