import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import { Text, Card, TextInput, Button, SegmentedButtons, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGroupStore } from '../store/groupStore';
import { api } from '../services/api';

interface Member {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  monthlySalary: number;
  salaryVisible: boolean;
  user: { id: string; name: string; email: string };
}

export default function GroupSettingsScreen() {
  const { currentGroup, setCurrentGroup } = useGroupStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const groupId = currentGroup?.id ?? '';

  const [name, setName] = useState(currentGroup?.name ?? '');
  const [approvalMode, setApprovalMode] = useState<'MAJORITY' | 'UNANIMOUS'>(
    currentGroup?.approvalMode ?? 'MAJORITY',
  );
  const [threshold, setThreshold] = useState(String(currentGroup?.personalThreshold ?? 50000));

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.get<{ id: string; name: string; inviteCode: string; members: Member[]; approvalMode: 'MAJORITY' | 'UNANIMOUS'; personalThreshold: number }>(`/groups/${groupId}`),
    enabled: !!groupId,
  });

  const updateGroup = useMutation({
    mutationFn: (data: { name?: string; approvalMode?: string; personalThreshold?: number }) =>
      api.patch<{ id: string; name: string; inviteCode: string; approvalMode: 'MAJORITY' | 'UNANIMOUS'; personalThreshold: number }>(`/groups/${groupId}`, data),
    onSuccess: (updated: { id: string; name: string; inviteCode: string; approvalMode: 'MAJORITY' | 'UNANIMOUS'; personalThreshold: number }) => {
      setCurrentGroup(updated);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      Alert.alert('Listo', 'Grupo actualizado');
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => api.delete(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', groupId] }),
  });

  async function handleShare() {
    await Share.share({
      message: `Únete a nuestro grupo en Iasmtech Finanzas con el código: ${currentGroup?.inviteCode}`,
    });
  }

  function confirmRemove(member: Member) {
    Alert.alert(`Remover a ${member.user.name}`, '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => removeMember.mutate(member.userId),
      },
    ]);
  }

  if (!currentGroup) {
    return <View style={styles.center}><Text>No hay grupo seleccionado</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Button icon="arrow-left" mode="text" onPress={() => router.back()} style={styles.back}>
        Volver
      </Button>

      <Text variant="titleLarge" style={styles.title}>Configuración del grupo</Text>

      {/* Código de invitación */}
      <Card style={styles.card}>
        <Card.Title title="Código de invitación" />
        <Card.Content>
          <Text variant="headlineSmall" style={styles.code}>{currentGroup.inviteCode}</Text>
          <Button icon="share-variant" mode="outlined" onPress={handleShare} style={{ marginTop: 8 }}>
            Compartir código
          </Button>
        </Card.Content>
      </Card>

      {/* Editar grupo */}
      <Card style={styles.card}>
        <Card.Title title="Editar grupo" />
        <Card.Content>
          <TextInput label="Nombre" value={name} onChangeText={setName} style={styles.input} />

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

          <Button
            mode="contained"
            onPress={() =>
              updateGroup.mutate({
                name,
                approvalMode,
                personalThreshold: parseInt(threshold, 10),
              })
            }
            loading={updateGroup.isPending}
          >
            Guardar cambios
          </Button>
        </Card.Content>
      </Card>

      {/* Miembros */}
      <Card style={styles.card}>
        <Card.Title title="Miembros" />
        <Card.Content>
          {group?.members.map((member, i) => (
            <View key={member.id}>
              {i > 0 && <Divider style={{ marginVertical: 8 }} />}
              <View style={styles.memberRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{member.user.name}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>
                    {member.role === 'ADMIN' ? 'Administrador' : 'Miembro'}
                    {member.salaryVisible ? ` · $${member.monthlySalary.toLocaleString('es-CL')}` : ''}
                  </Text>
                </View>
                {member.role !== 'ADMIN' && (
                  <Button
                    compact
                    mode="text"
                    textColor="#D32F2F"
                    onPress={() => confirmRemove(member)}
                  >
                    Remover
                  </Button>
                )}
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { fontWeight: 'bold', color: '#1976D2', marginBottom: 16 },
  card: { borderRadius: 10, marginBottom: 12 },
  code: { letterSpacing: 4, fontWeight: 'bold', color: '#1976D2', textAlign: 'center' },
  input: { marginBottom: 12 },
  label: { marginBottom: 6, color: '#555' },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
});
