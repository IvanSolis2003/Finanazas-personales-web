interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Filtrar solo tokens válidos de Expo
  const valid = messages.filter((m) => m.to.startsWith('ExponentPushToken['));
  if (valid.length === 0) return;

  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(valid),
    });
  } catch (err) {
    console.error('[Push] Error enviando notificaciones:', err);
  }
}
