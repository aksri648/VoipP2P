import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type Listener = (...args: any[]) => void;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

class FCMService {
  private listeners = new Map<string, Set<Listener>>();

  async initialize(): Promise<string | null> {
    await this.requestPermission();

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
    }).catch(() => null);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('voip_p2p_call', {
        name: 'VoIP P2P Calls',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#1a1a2e',
      });
    }

    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      this.notify('notificationResponse', data);
    });

    Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'incoming_call') {
        this.notify('incoming_call', data);
      }
    });

    return token?.data ?? null;
  }

  private async requestPermission() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[FCM] Notification permission not granted');
    }
  }

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Listener) {
    this.listeners.get(event)?.delete(callback);
  }

  private notify(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(...args);
      } catch (e) {
        console.error(`[FCM] listener error on "${event}":`, e);
      }
    });
  }
}

export const fcmService = new FCMService();
