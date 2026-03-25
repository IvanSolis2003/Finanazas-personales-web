import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useGroupStore } from '../store/groupStore';
import { usePushNotifications } from '../hooks/usePushNotifications';

const queryClient = new QueryClient();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976D2',
    secondary: '#42A5F5',
  },
};

function AuthGuard() {
  const { user, isLoading } = useAuthStore();
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    const inSelectGroup = segments[0] === 'select-group';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      // Si no tiene grupo → seleccionar; si tiene → dashboard
      router.replace(currentGroup ? '/(tabs)/dashboard' : '/select-group');
    } else if (user && !currentGroup && !inSelectGroup && segments[0] === '(tabs)') {
      router.replace('/select-group');
    }
  }, [user, isLoading, currentGroup, segments]);

  return null;
}

function PushRegistrar() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateGroup = useGroupStore((s) => s.hydrateGroup);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    hydrate();
    hydrateGroup();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthGuard />
        {user && <PushRegistrar />}
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </QueryClientProvider>
  );
}
