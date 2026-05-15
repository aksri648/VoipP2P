import RNCallKeep from 'react-native-callkeep';
import { Config } from '../config';

type Listener = (...args: any[]) => void;

class CallKeepService {
  private listeners = new Map<string, Set<Listener>>();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      RNCallKeep.setup({
        ios: {
          appName: 'VoIP P2P',
          includesCallsInRecents: true,
        },
        android: Config.CALL_KEEP_OPTIONS.android,
      } as any);
      RNCallKeep.setAvailable(true);

      (RNCallKeep as any).addEventListener('answerCall', ({ callUUID }: any) => {
        this.notify('answer', { callUUID });
      });

      (RNCallKeep as any).addEventListener('endCall', ({ callUUID }: any) => {
        this.notify('endCall', { callUUID });
      });

      (RNCallKeep as any).addEventListener('muteCall', ({ callUUID, muted }: any) => {
        this.notify('muteCall', { callUUID, muted });
      });

      (RNCallKeep as any).addEventListener('showIncomingCallUi', ({ callUUID }: any) => {
        this.notify('showIncomingCallUi', { callUUID });
      });

      this.initialized = true;
    } catch (e) {
      console.error('[CallKeep] Init error:', e);
    }
  }

  displayIncomingCall(uuid: string, callerId: string, callerName: string) {
    try {
      RNCallKeep.displayIncomingCall(uuid, callerId, callerName, 'number', true);
    } catch (e) {
      console.error('[CallKeep] displayIncomingCall error:', e);
    }
  }

  startOutgoingCall(uuid: string, calleeId: string, calleeName: string) {
    try {
      RNCallKeep.startCall(uuid, calleeId, calleeName, 'number', true);
    } catch (e) {
      console.error('[CallKeep] startOutgoingCall error:', e);
    }
  }

  reportConnectedCall(uuid: string) {
    try {
      (RNCallKeep as any).connectedCall(uuid);
    } catch (e) {
      console.error('[CallKeep] reportConnectedCall error:', e);
    }
  }

  reportEndCall(uuid: string, reason: 'missed' | 'ended' | 'failed') {
    try {
      RNCallKeep.endCall(uuid);
    } catch (e) {
      console.error('[CallKeep] reportEndCall error:', e);
    }
  }

  setMuted(uuid: string, muted: boolean) {
    try {
      RNCallKeep.setMutedCall(uuid, muted);
    } catch (e) {
      console.error('[CallKeep] setMuted error:', e);
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
        console.error(`[CallKeep] listener error on "${event}":`, e);
      }
    });
  }
}

export const callKeepService = new CallKeepService();
