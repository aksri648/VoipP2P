import RNCallKeep from 'react-native-callkeep';
import { Platform, PermissionsAndroid } from 'react-native';
import { Config } from '../config';
import useCallStore from '../stores/useCallStore';

class CallKeepService {
  constructor() {
    this.isInitialized = false;
    this.currentCallId = null;
    this.listeners = new Map();
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('[CallKeepService] Already initialized');
      return;
    }

    try {
      if (Platform.OS === 'android') {
        await this.setupAndroid();
      }

      this.setupEventListeners();
      this.isInitialized = true;
      console.log('[CallKeepService] Initialized successfully');
    } catch (error) {
      console.error('[CallKeepService] Initialization error:', error);
      throw error;
    }
  }

  async setupAndroid() {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS,
      ]);

      console.log('[CallKeepService] Permissions:', granted);

      RNCallKeep.setup(Config.CALL_KEEP_CONFIG.android);
      RNCallKeep.setAvailable(true);
      
      console.log('[CallKeepService] Android setup complete');
    } catch (error) {
      console.error('[CallKeepService] Android setup error:', error);
      throw error;
    }
  }

  setupEventListeners() {
    RNCallKeep.addEventListener('didReceiveStartCallAction', (data) => {
      console.log('[CallKeepService] didReceiveStartCallAction:', data);
      this.notifyListeners('start_call', data);
    });

    RNCallKeep.addEventListener('answerCall', (data) => {
      console.log('[CallKeepService] answerCall:', data);
      const callStore = useCallStore.getState();
      
      if (callStore.incomingCallData) {
        callStore.acceptIncomingCall();
        this.notifyListeners('answer', data);
      }
    });

    RNCallKeep.addEventListener('endCall', (data) => {
      console.log('[CallKeepService] endCall:', data);
      const callStore = useCallStore.getState();
      
      if (callStore.callState !== Config.CALL_STATES.IDLE) {
        callStore.setDisconnected('user_ended');
      }
      
      this.notifyListeners('end_call', data);
    });

    RNCallKeep.addEventListener('didDisplayIncomingCall', (data) => {
      console.log('[CallKeepService] didDisplayIncomingCall:', data);
      this.notifyListeners('display_incoming_call', data);
    });

    RNCallKeep.addEventListener('didPerformSetMutedCallAction', (data) => {
      console.log('[CallKeepService] didPerformSetMutedCallAction:', data);
      const callStore = useCallStore.getState();
      callStore.toggleMute();
      this.notifyListeners('toggle_mute', data);
    });

    RNCallKeep.addEventListener('didToggleHoldCallAction', (data) => {
      console.log('[CallKeepService] didToggleHoldCallAction:', data);
      this.notifyListeners('toggle_hold', data);
    });

    RNCallKeep.addEventListener('didChangeAudioRoute', (data) => {
      console.log('[CallKeepService] didChangeAudioRoute:', data);
      const callStore = useCallStore.getState();
      
      if (data.name === 'speaker') {
        callStore.setSpeaker(true);
      } else if (data.name === 'earpiece' || data.name === 'built-in earpiece') {
        callStore.setSpeaker(false);
      }
      
      this.notifyListeners('audio_route_changed', data);
    });

    RNCallKeep.addEventListener('didActivateAudioSession', () => {
      console.log('[CallKeepService] didActivateAudioSession');
      const callStore = useCallStore.getState();
      callStore.setCallKeepActive(true);
      this.notifyListeners('audio_session_activated', {});
    });

    RNCallKeep.addEventListener('didDeactivateAudioSession', () => {
      console.log('[CallKeepService] didDeactivateAudioSession');
      const callStore = useCallStore.getState();
      callStore.setCallKeepActive(false);
      this.notifyListeners('audio_session_deactivated', {});
    });
  }

  async displayIncomingCall(callerId, callerName, callId, handleType = 'number') {
    try {
      const options = {
        ios: {
          uuid: callId,
          handle: callerId,
          displayName: callerName,
          hasVideo: false,
          hasDTMF: false,
          supportsHolding: false,
          supportsGrouping: false,
          supportsUngrouping: false
        },
        android: {
          uuid: callId,
          handle: callerId,
          displayName: callerName,
          hasVideo: false,
          hasDTMF: false,
          supportsHolding: false,
          supportsGrouping: false,
          supportsUngrouping: false,
          extra: {
            callId: callId,
            callerId: callerId
          }
        }
      };

      await RNCallKeep.displayIncomingCall(options);
      this.currentCallId = callId;
      
      console.log('[CallKeepService] Displayed incoming call:', callerId);
    } catch (error) {
      console.error('[CallKeepService] Display incoming call error:', error);
      throw error;
    }
  }

  async startOutgoingCall(callId, number, callerName) {
    try {
      const options = {
        ios: {
          uuid: callId,
          handle: number,
          displayName: callerName,
          hasVideo: false,
          hasDTMF: false,
          supportsHolding: false,
          supportsGrouping: false,
          supportsUngrouping: false
        },
        android: {
          uuid: callId,
          handle: number,
          displayName: callerName,
          hasVideo: false,
          hasDTMF: false,
          supportsHolding: false,
          supportsGrouping: false,
          supportsUngrouping: false
        }
      };

      await RNCallKeep.startOutgoingCall(options);
      console.log('[CallKeepService] Started outgoing call:', callId);
    } catch (error) {
      console.error('[CallKeepService] Start outgoing call error:', error);
      throw error;
    }
  }

  async reportEndCall(callId, reason) {
    try {
      await RNCallKeep.reportEndCall(callId, reason);
      this.currentCallId = null;
      console.log('[CallKeepService] Reported end call:', callId, reason);
    } catch (error) {
      console.error('[CallKeepService] Report end call error:', error);
    }
  }

  async reportConnectedCall(callId) {
    try {
      await RNCallKeep.reportConnectedCall(callId);
      console.log('[CallKeepService] Reported connected call:', callId);
    } catch (error) {
      console.error('[CallKeepService] Report connected call error:', error);
    }
  }

  async setMuted(callId, muted) {
    try {
      await RNCallKeep.setMuted(callId, muted);
      console.log('[CallKeepService] Set muted:', muted);
    } catch (error) {
      console.error('[CallKeepService] Set muted error:', error);
    }
  }

  async setOnHold(callId, held) {
    try {
      await RNCallKeep.setOnHold(callId, held);
      console.log('[CallKeepService] Set on hold:', held);
    } catch (error) {
      console.error('[CallKeepService] Set on hold error:', error);
    }
  }

  async setCurrentCallActive(callId, active) {
    try {
      await RNCallKeep.setCurrentCallActive(callId, active);
      console.log('[CallKeepService] Set current call active:', active);
    } catch (error) {
      console.error('[CallKeepService] Set current call active error:', error);
    }
  }

  async backToForeground() {
    try {
      RNCallKeep.backToForeground();
    } catch (error) {
      console.error('[CallKeepService] Back to foreground error:', error);
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
          console.error('[CallKeepService] Listener error:', error);
        }
      });
    }
  }
}

export const callKeepService = new CallKeepService();
export default callKeepService;