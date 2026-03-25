import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';
import { useGroupSummary } from '../../hooks/useGroup';
import { useAlerts, useMarkAlertsRead } from '../../hooks/useAlerts';
import { formatCurrency } from '../../utils/formatCurrency';

const ALERT_COLORS: Record<string, string> = {
  BUDGET_EXCEEDED: '#D32F2F',
  BUDGET_WARNING: '#F57C00',
  LOW_BALANCE: '#D32F2F',
  SPENDING_INCREASE: '#F57C00',
  SPENDING_DECREASE: '#388E3C',
  GOAL_ACHIEVED: '#388E3C',
  GOAL_AT_RISK: '#F57C00',
  PROPOSAL_PENDING: '#1976D2',
};

export default function DashboardScreen() {
  const { currentGroup } = useGroupStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const groupId = currentGroup?.id ?? '';
  const { data: summary } = useGroupSummary(groupId);
  const { data: alerts } = useAlerts(groupId);
  const markRead = useMarkAlertsRead(groupId);

  if (!currentGroup) {
    return (
      <View style={styles.center}>
        <Text variant="headlineSmall">¡Bienvenido, {user?.name}!</Text>
        <Text variant="bodyMedium" style={{ marginVertical: 16, color: '#555' }}>
          Aún no perteneces a ningún grupo.
        </Text>
        <Button mode="contained" onPress={() => router.push('/(auth)/join-group')}>
          Unirme a un grupo
        </Button>
        <Button mode="text" onPress={logout} style={{ marginTop: 8 }}>
          Cerrar sesión
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.groupName}>{currentGroup.name}</Text>
        <Text variant="bodySmall" style={styles.code}>#{currentGroup.inviteCode}</Text>
      </View>

      {summary && (
        <>
          <Card style={[styles.card, { backgroundColor: '#E3F2FD' }]}>
            <Card.Content>
              <Text variant="labelLarge" style={{ color: '#555' }}>Disponible este mes</Text>
              <Text variant="headlineMedium" style={{ color: summary.available >= 0 ? '#1976D2' : '#D32F2F', fontWeight: 'bold' }}>
                {formatCurrency(summary.available)}
              </Text>
            </Card.Content>
          </Card>

          <View style={styles.row}>
            <Card style={[styles.halfCard, { backgroundColor: '#E8F5E9' }]}>
              <Card.Content>
                <Text variant="labelSmall" style={{ color: '#555' }}>Ingresos</Text>
                <Text variant="titleMedium" style={{ color: '#388E3C', fontWeight: 'bold' }}>
                  {formatCurrency(summary.totalIncome)}
                </Text>
              </Card.Content>
            </Card>
            <Card style={[styles.halfCard, { backgroundColor: '#FFEBEE' }]}>
              <Card.Content>
                <Text variant="labelSmall" style={{ color: '#555' }}>Gastos</Text>
                <Text variant="titleMedium" style={{ color: '#D32F2F', fontWeight: 'bold' }}>
                  {formatCurrency(summary.totalExpenses)}
                </Text>
              </Card.Content>
            </Card>
          </View>
        </>
      )}

      {alerts && alerts.length > 0 && (
        <Card style={styles.card}>
          <Card.Title
            title="Alertas"
            right={() => (
              <Button compact onPress={() => markRead.mutate()}>
                Marcar leídas
              </Button>
            )}
          />
          <Card.Content>
            {alerts.slice(0, 5).map((alert) => (
              <Chip
                key={alert.id}
                style={[styles.alertChip, { backgroundColor: ALERT_COLORS[alert.type] + '22' }]}
                textStyle={{ color: ALERT_COLORS[alert.type] }}
              >
                {alert.message}
              </Chip>
            ))}
          </Card.Content>
        </Card>
      )}

      <Button
        mode="outlined"
        onPress={() => router.push('/balance')}
        style={styles.balanceBtn}
        icon="swap-horizontal"
      >
        Ver balance entre miembros
      </Button>

      <View style={styles.bottomRow}>
        <Button mode="text" icon="account" onPress={() => router.push('/profile')}>
          Perfil
        </Button>
        <Button mode="text" icon="swap-vertical" onPress={() => router.push('/select-group')}>
          Grupos
        </Button>
        <Button mode="text" icon="cog" onPress={() => router.push('/group-settings')}>
          Config
        </Button>
        <Button mode="text" textColor="#D32F2F" icon="logout" onPress={logout}>
          Salir
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { marginBottom: 16 },
  groupName: { fontWeight: 'bold', color: '#1976D2' },
  code: { color: '#888' },
  card: { marginBottom: 12, borderRadius: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfCard: { flex: 1, borderRadius: 12 },
  alertChip: { marginBottom: 6 },
  balanceBtn: { marginTop: 8 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
});
