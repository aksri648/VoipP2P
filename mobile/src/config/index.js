export const Config = {
  LIVEKIT_URL: process.env.LIVEKIT_URL || 'wss://your-livekit-url.livekit.cloud',
  SOCKET_URL: process.env.SOCKET_URL || 'https://voip-p2p-backend.onrender.com',
  FCM_SENDER_ID: process.env.FCM_SENDER_ID || 'your-fcm-sender-id',
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || 'pk_test_your-clerk-key',
  
  CALL_TIMEOUT: 30000,
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000,
  
  SOCKET_RECONNECT_ATTEMPTS: 10,
  SOCKET_RECONNECT_DELAY: 1000,
  
  CALL_KEEP_CONFIG: {
    android: {
      alertTitle: 'Permissions Required',
      alertMessage: 'This app needs to access your phone to handle incoming calls',
      cancelButton: 'Cancel',
      okButton: 'OK',
      additionalPermissions: [],
      prefix: '',
      ringtoneSound: 'default',
      foregroundService: {
        channelId: 'voip_p2p_channel',
        channelName: 'VoIP P2P Calls',
        notificationTitle: 'Call in progress',
        notificationIcon: 'ic_launcher',
        serviceIcon: 'ic_launcher'
      }
    }
  },
  
  FOREGROUND_SERVICE_CONFIG: {
    id: 3456,
    channelId: 'voip_p2p_foreground',
    channelName: 'VoIP P2P Foreground',
    title: 'VoIP P2P',
    message: 'Call in progress',
    importance: 3,
    vibration: false,
    icon: 'ic_launcher'
  },
  
  NETWORK_TIMEOUT: 15000,
  MAX_CALL_DURATION: 3600000,
  
  CALL_STATES: {
    IDLE: 'idle',
    CALLING: 'calling',
    RINGING: 'ringing',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    FAILED: 'failed',
    BUSY: 'busy',
    REJECTED: 'rejected',
    MISSED: 'missed'
  }
};