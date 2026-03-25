import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, TextInput, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useGroupStore } from '../store/groupStore';
import { api } from '../services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { currentGroup, setCurrentGroup } = useGroupStore();
  const router = useRouter();

  const [salary, setSalary] = useState('');
  const [salaryVisible, setSalaryVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleUpdateSalary() {
    if (!currentGroup) return;
    if (!salary) {
      Alert.alert('Error', 'Ingresa tu sueldo mensual');
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/groups/${currentGroup.id}/members/salary`, {
        monthlySalary: parseInt(salary, 10),
        salaryVisible,
      });
      Alert.alert('Listo', 'Sueldo actualizado');
      setSalary('');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveGroup() {
    if (!currentGroup || !user) return;
    Alert.alert('Salir del grupo', `¿Seguro que quieres salir de "${currentGroup.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/groups/${currentGroup.id}/members/${user.id}`);
            setCurrentGroup(null);
            router.replace('/(auth)/join-group');
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo salir');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Button icon="arrow-left" mode="text" onPress={() => router.back()} style={styles.back}>
        Volver
      </Button>

      <Text variant="titleLarge" style={styles.title}>Mi perfil</Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{user?.name}</Text>
          <Text variant="bodyMedium" style={{ color: '#888' }}>{user?.email}</Text>
        </Card.Content>
      </Card>

      {currentGroup && (
        <>
          <Text variant="titleMedium" style={styles.section}>Sueldo mensual</Text>
          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                label="Sueldo (CLP)"
                value={salary}
                onChangeText={setSalary}
                keyboardType="numeric"
                style={styles.input}
                placeholder="Ej: 800000"
              />
              <Button
                mode="outlined"
                onPress={() => setSalaryVisible((v) => !v)}
                icon={salaryVisible ? 'eye' : 'eye-off'}
                style={styles.input}
              >
                {salaryVisible ? 'Visible para el grupo' : 'Oculto para el grupo'}
              </Button>
              <Button mode="contained" onPress={handleUpdateSalary} loading={loading}>
                Actualizar sueldo
              </Button>
            </Card.Content>
          </Card>

          <Divider style={styles.divider} />

          <Button
            mode="outlined"
            textColor="#D32F2F"
            icon="exit-to-app"
            onPress={handleLeaveGroup}
            style={styles.leaveBtn}
          >
            Salir del grupo "{currentGroup.name}"
          </Button>
        </>
      )}

      <Button
        mode="text"
        textColor="#D32F2F"
        icon="logout"
        onPress={logout}
        style={{ marginTop: 8 }}
      >
        Cerrar sesión
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { fontWeight: 'bold', color: '#1976D2', marginBottom: 16 },
  card: { borderRadius: 10, marginBottom: 12 },
  section: { fontWeight: 'bold', marginBottom: 8, marginTop: 8 },
  input: { marginBottom: 12 },
  divider: { marginVertical: 16 },
  leaveBtn: { borderColor: '#D32F2F' },
});
