import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import useUserStore from '../stores/useUserStore';
import useCallStore from '../stores/useCallStore';

class FCMService {
  constructor() {
    this.isInitialized = false;
    this.listeners = new Map();
    this.messageHandlers = new Map();
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('[FCMService] Already initialized');
      return;
    }

    try {
      if (Platform.OS === 'android') {
        await this.requestAndroidPermissions();
      }

      this.setupMessageHandlers();
      this.isInitialized = true;
      console.log('[FCMService] Initialized successfully');
    } catch (error) {
      console.error('[FCMService] Initialization error:', error);
      throw error;
    }
  }

  async requestAndroidPermissions() {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        PermissionsAndroid.PERMISSIONS.VIBRATE,
      ]);

      console.log('[FCMService] Android permissions:', granted);
    } catch (error) {
      console.error('[FCMService] Permission error:', error);
    }
  }

  async requestPermission() {
    try {
      const authorizationStatus = await messaging().requestPermission();
      
      const userStore = useUserStore.getState();
      
      if (authorizationStatus === messaging.AuthorizationStatus.AUTHORIZED) {
        console.log('[FCMService] Permission authorized');
        userStore.setFcmToken(await this.getToken());
        return true;
      } else if (authorizationStatus === messaging.AuthorizationStatus.PROVISIONAL) {
        console.log('[FCMService] Permission provisional');
        userStore.setFcmToken(await this.getToken());
        return true;
      } else {
        console.log('[FCMService] Permission denied');
        return false;
      }
    } catch (error) {
      console.error('[FCMService] Request permission error:', error);
      return false;
    }
  }

  async getToken() {
    try {
      const token = await messaging().getToken();
      console.log('[FCMService] FCM token:', token);
      return token;
    } catch (error) {
      console.error('[FCMService] Get token error:', error);
      return null;
    }
  }

  async deleteToken() {
    try {
      await messaging().deleteToken();
      console.log('[FCMService] Token deleted');
    } catch (error) {
      console.error('[FCMService] Delete token error:', error);
    }
  }

  setupMessageHandlers() {
    messaging().onMessage(this.handleForegroundMessage.bind(this));
    messaging().onNotificationOpenedApp(this.handleNotificationOpenedApp.bind(this));
    
    messaging()
      .getInitialNotification()
      .then(this.handleInitialNotification.bind(this));
  }

  handleForegroundMessage(remoteMessage) {
    console.log('[FCMService] Foreground message:', remoteMessage);
    
    const { data } = remoteMessage;
    
    if (data && data.type === 'incoming_call') {
      this.handleIncomingCallData(data);
    }

    this.notifyListeners('foreground_message', remoteMessage);
  }

  handleNotificationOpenedApp(remoteMessage) {
    console.log('[FCMService] Notification opened app:', remoteMessage);
    
    const { data } = remoteMessage;
    
    if (data && data.type === 'incoming_call') {
      this.handleIncomingCallData(data);
    }

    this.notifyListeners('notification_opened', remoteMessage);
  }

  handleInitialNotification(remoteMessage) {
    console.log('[FCMService] Initial notification:', remoteMessage);
    
    if (remoteMessage) {
      const { data } = remoteMessage;
      
      if (data && data.type === 'incoming_call') {
        this.handleIncomingCallData(data);
      }
    }
  }

  handleIncomingCallData(data) {
    console.log('[FCMService] Handling incoming call data:', data);
    
    const callStore = useCallStore.getState();
    
    callStore.setIncomingCall({
      callerId: data.callerId,
      callerName: data.callerName || `User ${data.callerId}`,
      roomName: data.roomName,
      roomToken: data.roomToken,
      callId: data.callId,
      timestamp: data.timestamp
    });

    this.notifyListeners('incoming_call', data);
  }

  subscribeToTopic(topic) {
    messaging()
      .subscribeToTopic(topic)
      .then(() => console.log('[FCMService] Subscribed to topic:', topic))
      .catch(error => console.error('[FCMService] Subscribe error:', error));
  }

  unsubscribeFromTopic(topic) {
    messaging()
      .unsubscribeFromTopic(topic)
      .then(() => console.log('[FCMService] Unsubscribed from topic:', topic))
      .catch(error => console.error('[FCMService] Unsubscribe error:', error));
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[FCMService] Listener error:', error);
        }
      });
    }
  }
}

export const fcmService = new FCMService();
export default fcmService;