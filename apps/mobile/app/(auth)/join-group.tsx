import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useGroupStore } from '../../store/groupStore';

export default function JoinGroupScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const setCurrentGroup = useGroupStore((s) => s.setCurrentGroup);
  const router = useRouter();

  async function handleJoin() {
    if (!code.trim()) {
      Alert.alert('Error', 'Ingresa el código de invitación');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<{ group: { id: string; name: string; inviteCode: string; approvalMode: 'MAJORITY' | 'UNANIMOUS'; personalThreshold: number } }>(
        '/groups/join',
        { inviteCode: code.trim() },
      );
      setCurrentGroup(data.group);
      router.replace('/(tabs)/dashboard');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Código inválido');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    router.push('/create-group');
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Unirse a un grupo</Text>
      <Text variant="bodyMedium" style={styles.sub}>
        Ingresa el código de 8 caracteres que te compartieron
      </Text>

      <TextInput
        label="Código de invitación"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        maxLength={8}
        style={styles.input}
      />

      <Button mode="contained" onPress={handleJoin} loading={loading} style={styles.btn}>
        Unirme
      </Button>
      <Button mode="outlined" onPress={handleCreate}>
        Crear nuevo grupo
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { textAlign: 'center', fontWeight: 'bold', color: '#1976D2' },
  sub: { textAlign: 'center', color: '#555', marginVertical: 16 },
  input: { marginBottom: 12 },
  btn: { marginBottom: 12 },
});
