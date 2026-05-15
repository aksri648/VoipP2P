import InCallManager from 'react-native-incall-manager';

class InCallManagerService {
  async initialize() {
    try {
      InCallManager.start({ media: 'audio' });
    } catch (e) {
      console.error('[InCallManager] Init error:', e);
    }
  }

  start() {
    try {
      InCallManager.start({ media: 'audio' });
    } catch (e) {
      console.error('[InCallManager] Start error:', e);
    }
  }

  stop() {
    try {
      InCallManager.stop();
    } catch (e) {
      console.error('[InCallManager] Stop error:', e);
    }
  }

  setSpeakerOn(on: boolean) {
    try {
      InCallManager.setForceSpeakerphoneOn(on);
    } catch (e) {
      console.error('[InCallManager] setSpeakerOn error:', e);
    }
  }

  setMicrophoneMute(muted: boolean) {
    try {
      InCallManager.setMicrophoneMute(muted);
    } catch (e) {
      console.error('[InCallManager] setMicrophoneMute error:', e);
    }
  }

  setKeepScreenOn(on: boolean) {
    try {
      InCallManager.setKeepScreenOn(on);
    } catch (e) {
      console.error('[InCallManager] setKeepScreenOn error:', e);
    }
  }

  playRingtone() {
    try {
      (InCallManager as any).startRingtone('_BUNDLE_');
    } catch (e) {
      console.error('[InCallManager] playRingtone error:', e);
    }
  }

  stopRingtone() {
    try {
      InCallManager.stopRingtone();
    } catch (e) {
      console.error('[InCallManager] stopRingtone error:', e);
    }
  }

  playDialtone() {
    try {
      InCallManager.startRingback('_BUNDLE_');
    } catch (e) {
      console.error('[InCallManager] playDialtone error:', e);
    }
  }

  stopDialtone() {
    try {
      InCallManager.stopRingback();
    } catch (e) {
      console.error('[InCallManager] stopDialtone error:', e);
    }
  }
}

export const inCallManagerService = new InCallManagerService();
