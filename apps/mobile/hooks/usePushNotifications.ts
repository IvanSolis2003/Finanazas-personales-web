import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);
}

async function registerForPushNotifications() {
  if (!Device.isDevice) return;

  const existing = await Notifications.getPermissionsAsync();
  let isGranted = (existing as unknown as { granted: boolean }).granted;

  if (!isGranted) {
    const requested = await Notifications.requestPermissionsAsync();
    isGranted = (requested as unknown as { granted: boolean }).granted;
  }

  if (!isGranted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await api.patch('/auth/push-token', { pushToken: token });
  } catch {
    // Silencioso — no bloquea la app si falla
  }
}
