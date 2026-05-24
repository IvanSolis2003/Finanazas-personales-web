import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, HelperText, Button, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { useGroupStore } from '../store/groupStore';

export default function CreateGroupScreen() {
  const [name, setName] = useState('');
  const [approvalMode, setApprovalMode] = useState<'MAJORITY' | 'UNANIMOUS'>('MAJORITY');
  const [threshold, setThreshold] = useState('50000');
  const [loading, setLoading] = useState(false);
  const setCurrentGroup = useGroupStore((s) => s.setCurrentGroup);
  const router = useRouter();

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para el grupo');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<{ id: string; name: string; inviteCode: string; approvalMode: 'MAJORITY' | 'UNANIMOUS'; personalThreshold: number }>(
        '/groups',
        { name: name.trim(), approvalMode, personalThreshold: parseInt(threshold, 10) },
      );
      setCurrentGroup(data);
      router.replace('/(tabs)/dashboard');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear el grupo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Button icon="arrow-left" mode="text" onPress={() => router.back()} style={styles.back}>
        Volver
      </Button>

      <Text variant="headlineSmall" style={styles.title}>Crear grupo</Text>

      <TextInput label="Nombre del grupo" value={name} onChangeText={setName} style={styles.input} />

      <Text variant="labelMedium" style={styles.label}>Modo de aprobación</Text>
      <SegmentedButtons
        value={approvalMode}
        onValueChange={(v) => setApprovalMode(v as 'MAJORITY' | 'UNANIMOUS')}
        buttons={[
          { value: 'MAJORITY', label: 'Mayoría' },
          { value: 'UNANIMOUS', label: 'Unánime' },
        ]}
        style={styles.input}
      />

      <TextInput
        label="Umbral personal (CLP)"
        value={threshold}
        onChangeText={setThreshold}
        keyboardType="numeric"
        style={styles.input}
      />
      <HelperText type="info">Montos bajo este valor se consideran gastos personales</HelperText>

      <Button mode="contained" onPress={handleCreate} loading={loading} style={styles.btn}>
        Crear grupo
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { fontWeight: 'bold', color: '#1976D2', marginBottom: 24 },
  input: { marginBottom: 16 },
  label: { marginBottom: 8, color: '#555' },
  btn: { marginTop: 8 },
});
