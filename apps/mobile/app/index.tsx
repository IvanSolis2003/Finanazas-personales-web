import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useGroupStore } from '../store/groupStore';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const currentGroup = useGroupStore((s) => s.currentGroup);

  // Mientras se hidrata la sesión desde SecureStore, mostramos un loader.
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  // Redirección explícita según estado de sesión y grupo.
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!currentGroup) return <Redirect href="/select-group" />;
  return <Redirect href="/(tabs)/dashboard" />;
}
