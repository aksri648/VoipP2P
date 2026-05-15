import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

export const BACKGROUND_NOTIFICATION_TASK = 'VOIP_BACKGROUND_CALL';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('[BackgroundTask] Error:', error);
    return;
  }

  const notification = data as any;
  const callData = notification?.notification?.data || notification?.data;

  if (callData?.type === 'incoming_call') {
    console.log('[BackgroundTask] Incoming call from:', callData.callerId);

    try {
      const RNCallKeep = require('react-native-callkeep');

      RNCallKeep.setup({
        ios: {
          appName: 'VoIP P2P',
          includesCallsInRecents: true,
        },
        android: {
          alertTitle: 'VoIP P2P Call',
          alertMessage: 'Incoming call',
          cancelButton: 'Cancel',
          okButton: 'OK',
          additionalPermissions: [],
          foregroundService: {
            channelId: 'voip_p2p_call',
            channelName: 'Call Service',
            notificationTitle: 'Call in progress',
            notificationIcon: 'ic_launcher',
          },
        },
      });

      (RNCallKeep as any).displayIncomingCall(
        `bg_${callData.callerId}_${Date.now()}`,
        callData.callerId,
        callData.callerId || 'Unknown',
        'number',
        true
      );
    } catch (e) {
      console.error('[BackgroundTask] CallKeep error:', e);
    }
  }
});

export async function registerBackgroundHandler() {
  try {
    const hasPermission = await Notifications.getPermissionsAsync();
    if (!hasPermission.granted) return;

    const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_NOTIFICATION_TASK
    );

    if (!alreadyRegistered) {
      await (Notifications.registerTaskAsync as any)(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 0,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('[BackgroundTask] Registered');
    }
  } catch (e) {
    console.warn('[BackgroundTask] Registration failed:', e);
  }
}
