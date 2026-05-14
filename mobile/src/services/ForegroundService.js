import { NativeModules, Platform } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import useCallStore from '../stores/useCallStore';
import { Config } from '../config';

const { ReactNativeForegroundService } = NativeModules;

class ForegroundService {
  constructor() {
    this.isRunning = false;
    this.timerId = null;
    this.listeners = new Map();
  }

  async start() {
    if (this.isRunning) {
      console.log('[ForegroundService] Already running');
      return;
    }

    try {
      if (Platform.OS === 'android') {
        await this.startAndroid();
      }

      this.startDurationTimer();
      this.isRunning = true;
      
      const callStore = useCallStore.getState();
      callStore.setForegroundServiceActive(true);
      
      console.log('[ForegroundService] Started');
      this.notifyListeners('started', {});
    } catch (error) {
      console.error('[ForegroundService] Start error:', error);
      throw error;
    }
  }

  async startAndroid() {
    try {
      await ReactNativeForegroundService.start({
        id: Config.FOREGROUND_SERVICE_CONFIG.id,
        title: Config.FOREGROUND_SERVICE_CONFIG.title,
        message: Config.FOREGROUND_SERVICE_CONFIG.message,
        importance: Config.FOREGROUND_SERVICE_CONFIG.importance,
        vibration: Config.FOREGROUND_SERVICE_CONFIG.vibration,
        icon: Config.FOREGROUND_SERVICE_CONFIG.icon,
        channelId: Config.FOREGROUND_SERVICE_CONFIG.channelId,
        channelName: Config.FOREGROUND_SERVICE_CONFIG.channelName
      });
      
      console.log('[ForegroundService] Android service started');
    } catch (error) {
      console.error('[ForegroundService] Android start error:', error);
      throw error;
    }
  }

  startDurationTimer() {
    this.timerId = BackgroundTimer.setInterval(() => {
      const callStore = useCallStore.getState();
      callStore.updateCallDuration();
    }, 1000);
  }

  async stop() {
    if (!this.isRunning) {
      console.log('[ForegroundService] Not running');
      return;
    }

    try {
      if (this.timerId) {
        BackgroundTimer.clearInterval(this.timerId);
        this.timerId = null;
      }

      if (Platform.OS === 'android') {
        await this.stopAndroid();
      }

      this.isRunning = false;
      
      const callStore = useCallStore.getState();
      callStore.setForegroundServiceActive(false);
      
      console.log('[ForegroundService] Stopped');
      this.notifyListeners('stopped', {});
    } catch (error) {
      console.error('[ForegroundService] Stop error:', error);
    }
  }

  async stopAndroid() {
    try {
      await ReactNativeForegroundService.stop();
      console.log('[ForegroundService] Android service stopped');
    } catch (error) {
      console.error('[ForegroundService] Android stop error:', error);
    }
  }

  async updateNotification(title, message) {
    if (!this.isRunning) {
      return;
    }

    try {
      if (Platform.OS === 'android') {
        await ReactNativeForegroundService.updateNotification({
          title,
          message
        });
      }
      
      console.log('[ForegroundService] Notification updated');
    } catch (error) {
      console.error('[ForegroundService] Update notification error:', error);
    }
  }

  isActive() {
    return this.isRunning;
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
          console.error('[ForegroundService] Listener error:', error);
        }
      });
    }
  }
}

export const foregroundService = new ForegroundService();
export default foregroundService;