import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useGroupStore } from '../store/groupStore';
import { useGroupBalance } from '../hooks/useGroup';
import { formatCurrency } from '../utils/formatCurrency';

export default function BalanceDetailScreen() {
  const { currentGroup } = useGroupStore();
  const router = useRouter();
  const groupId = currentGroup?.id ?? '';
  const { data, isLoading } = useGroupBalance(groupId);

  return (
    <View style={styles.container}>
      <Button icon="arrow-left" mode="text" onPress={() => router.back()} style={styles.back}>
        Volver
      </Button>
      <Text variant="titleLarge" style={styles.title}>Balance entre miembros</Text>

      {isLoading ? (
        <Text style={{ textAlign: 'center' }}>Cargando...</Text>
      ) : data?.transactions.length === 0 ? (
        <Text style={styles.empty}>Todos están al día</Text>
      ) : (
        <FlatList
          data={data?.transactions}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="bodyLarge">
                  <Text style={{ fontWeight: 'bold', color: '#D32F2F' }}>{item.from}</Text>
                  {' le debe a '}
                  <Text style={{ fontWeight: 'bold', color: '#388E3C' }}>{item.to}</Text>
                </Text>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 4 }}>
                  {formatCurrency(item.amount)}
                </Text>
              </Card.Content>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { fontWeight: 'bold', color: '#1976D2', marginBottom: 16 },
  card: { marginBottom: 10, borderRadius: 10 },
  empty: { textAlign: 'center', color: '#388E3C', marginTop: 40, fontSize: 16 },
});
