import InCallManager from 'react-native-incall-manager';
import { Platform, NativeModules } from 'react-native';
import useCallStore from '../stores/useCallStore';
import { Config } from '../config';

class InCallManagerService {
  constructor() {
    this.isInitialized = false;
    this.isScreenOn = false;
    this.listeners = new Map();
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('[InCallManagerService] Already initialized');
      return;
    }

    try {
      InCallManager.start();
      this.setupEventListeners();
      this.isInitialized = true;
      console.log('[InCallManagerService] Initialized successfully');
    } catch (error) {
      console.error('[InCallManagerService] Initialization error:', error);
    }
  }

  setupEventListeners() {
    InCallManager.addListener('onAudioDeviceChanged', (data) => {
      console.log('[InCallManagerService] Audio device changed:', data);
      
      const callStore = useCallStore.getState();
      
      if (data.audioOutput === 'speaker') {
        callStore.setSpeaker(true);
      } else if (data.audioOutput === 'earpiece' || data.audioOutput === 'built_in_speaker') {
        callStore.setSpeaker(false);
      }

      if (data.availableAudioOutput) {
        const hasBluetooth = data.availableAudioOutput.some(
          device => device === 'bluetooth' || device === 'bluetooth_nameless'
        );
        callStore.setBluetooth(hasBluetooth);
      }

      this.notifyListeners('audio_device_changed', data);
    });

    InCallManager.addListener('onAudioRouteChanged', (data) => {
      console.log('[InCallManagerService] Audio route changed:', data);
      this.notifyListeners('audio_route_changed', data);
    });

    InCallManager.addListener('onProximityChange', (data) => {
      console.log('[InCallManagerService] Proximity change:', data);
      this.notifyListeners('proximity_change', data);
    });

    InCallManager.addListener('onCaptureDeviceChange', (data) => {
      console.log('[InCallManagerService] Capture device change:', data);
      this.notifyListeners('capture_device_change', data);
    });

    InCallManager.addListener('onVideoTransformChanged', (data) => {
      console.log('[InCallManagerService] Video transform changed:', data);
      this.notifyListeners('video_transform_changed', data);
    });

    InCallManager.addListener('onIncomingCallScreening', (data) => {
      console.log('[InCallManagerService] Incoming call screening:', data);
      this.notifyListeners('incoming_call_screening', data);
    });
  }

  async start() {
    try {
      await InCallManager.startPromiscuous(true);
      console.log('[InCallManagerService] Started');
    } catch (error) {
      console.error('[InCallManagerService] Start error:', error);
    }
  }

  async stop() {
    try {
      await InCallManager.stop();
      console.log('[InCallManagerService] Stopped');
    } catch (error) {
      console.error('[InCallManagerService] Stop error:', error);
    }
  }

  async setForceSpeakerphoneOn(forceOn) {
    try {
      await InCallManager.setForceSpeakerphoneOn(forceOn);
      const callStore = useCallStore.getState();
      callStore.setSpeaker(forceOn);
      console.log('[InCallManagerService] Force speaker:', forceOn);
    } catch (error) {
      console.error('[InCallManagerService] Force speaker error:', error);
    }
  }

  async setEnableSpeakerphone(enable) {
    try {
      await InCallManager.setEnableSpeakerphone(enable);
      const callStore = useCallStore.getState();
      callStore.setSpeaker(enable);
      console.log('[InCallManagerService] Enable speaker:', enable);
    } catch (error) {
      console.error('[InCallManagerService] Enable speaker error:', error);
    }
  }

  async setMicrophoneMute(mute) {
    try {
      await InCallManager.setMicrophoneMute(mute);
      const callStore = useCallStore.getState();
      callStore.setMuted(mute);
      console.log('[InCallManagerService] Mute:', mute);
    } catch (error) {
      console.error('[InCallManagerService] Mute error:', error);
    }
  }

  async toggleMute() {
    const callStore = useCallStore.getState();
    const newMuteState = !callStore.isMuted;
    await this.setMicrophoneMute(newMuteState);
    return newMuteState;
  }

  async setKeepScreenOn(keepOn) {
    try {
      await InCallManager.setKeepScreenOn(keepOn);
      this.isScreenOn = keepOn;
      console.log('[InCallManagerService] Keep screen on:', keepOn);
    } catch (error) {
      console.error('[InCallManagerService] Keep screen on error:', error);
    }
  }

  async setSpeakerphoneOn(on) {
    try {
      await InCallManager.setSpeakerphoneOn(on);
      const callStore = useCallStore.getState();
      callStore.setSpeaker(on);
      console.log('[InCallManagerService] Speakerphone:', on);
    } catch (error) {
      console.error('[InCallManagerService] Speakerphone error:', error);
    }
  }

  async getAudioRoutes() {
    try {
      const routes = await InCallManager.getAudioRoutes();
      console.log('[InCallManagerService] Audio routes:', routes);
      return routes;
    } catch (error) {
      console.error('[InCallManagerService] Get audio routes error:', error);
      return null;
    }
  }

  async setAudioSessionCategory(category) {
    try {
      await InCallManager.setAudioSessionCategory(category);
      console.log('[InCallManagerService] Audio session category:', category);
    } catch (error) {
      console.error('[InCallManagerService] Set audio session category error:', error);
    }
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
          console.error('[InCallManagerService] Listener error:', error);
        }
      });
    }
  }
}

export const inCallManagerService = new InCallManagerService();
export default inCallManagerService;