import { Platform } from 'react-native';

const DEV_SOCKET_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export const Config = {
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || DEV_SOCKET_URL,
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || 'development-key',
  SIGNALING_SERVER_URL: process.env.EXPO_PUBLIC_SOCKET_URL || DEV_SOCKET_URL,

  CALL_TIMEOUT: 30000,
  RING_TIMEOUT: 45000,
  RECONNECT_ATTEMPTS: 10,
  RECONNECT_DELAY: 1000,
  NETWORK_TIMEOUT: 15000,

  ICE_SERVERS: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },

  CALL_KEEP_OPTIONS: {
    android: {
      alertTitle: 'VoIP P2P Permissions',
      alertMessage: 'This app needs phone permissions to handle calls.',
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
  },
};
