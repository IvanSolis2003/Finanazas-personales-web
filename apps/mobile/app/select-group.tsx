import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useGroupStore } from '../store/groupStore';
import { api } from '../services/api';

interface GroupMembership {
  group: {
    id: string;
    name: string;
    inviteCode: string;
    approvalMode: 'MAJORITY' | 'UNANIMOUS';
    personalThreshold: number;
    members: { id: string }[];
  };
}

export default function SelectGroupScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const setCurrentGroup = useGroupStore((s) => s.setCurrentGroup);

  // Reutilizamos el endpoint de cada grupo — necesitamos listar grupos del usuario
  // El backend no tiene un /users/me/groups, así que lo hacemos via el token
  const { data, isLoading } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => api.get<GroupMembership[]>('/groups/mine'),
  });

  function handleSelect(group: GroupMembership['group']) {
    setCurrentGroup({
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      approvalMode: group.approvalMode,
      personalThreshold: group.personalThreshold,
    });
    router.replace('/(tabs)/dashboard');
  }

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Selecciona un grupo</Text>
      <Text variant="bodyMedium" style={styles.sub}>Hola, {user?.name}</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.group.id}
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => handleSelect(item.group)}>
              <Card.Title
                title={item.group.name}
                subtitle={`${item.group.members.length} miembro(s) · #${item.group.inviteCode}`}
                right={() => <Button compact onPress={() => handleSelect(item.group)}>Entrar</Button>}
              />
            </Card>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No perteneces a ningún grupo</Text>
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}

      <Button
        mode="outlined"
        icon="plus"
        onPress={() => router.push('/create-group')}
        style={styles.createBtn}
      >
        Crear grupo nuevo
      </Button>
      <Button mode="text" onPress={() => router.push('/(auth)/join-group')}>
        Unirme con código
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  title: { fontWeight: 'bold', color: '#1976D2', marginTop: 16 },
  sub: { color: '#888', marginBottom: 20 },
  card: { marginBottom: 10, borderRadius: 10 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  createBtn: { marginTop: 16, marginBottom: 8 },
});
