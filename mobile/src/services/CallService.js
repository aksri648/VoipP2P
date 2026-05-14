import { socketService } from './SocketService';
import { liveKitService } from './LiveKitService';
import { callKeepService } from './CallKeepService';
import { fcmService } from './FCMService';
import { inCallManagerService } from './InCallManagerService';
import { foregroundService } from './ForegroundService';
import useCallStore from '../stores/useCallStore';
import useUserStore from '../stores/useUserStore';
import { Config } from '../config';

class CallService {
  constructor() {
    this.isInitialized = false;
    this.listeners = new Map();
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('[CallService] Already initialized');
      return;
    }

    try {
      await this.initializeNativeServices();
      this.setupServiceListeners();
      this.isInitialized = true;
      console.log('[CallService] Initialized successfully');
    } catch (error) {
      console.error('[CallService] Initialization error:', error);
      throw error;
    }
  }

  async initializeNativeServices() {
    await callKeepService.initialize();
    await inCallManagerService.initialize();
    await fcmService.initialize();
  }

  setupServiceListeners() {
    socketService.on('incoming_call', async (data) => {
      console.log('[CallService] Incoming call from socket');
      await this.handleIncomingCall(data);
    });

    socketService.on('call_accepted', async (data) => {
      console.log('[CallService] Call accepted');
      await this.handleCallAccepted(data);
    });

    socketService.on('call_rejected', async (data) => {
      console.log('[CallService] Call rejected');
      await this.handleCallRejected(data);
    });

    socketService.on('call_busy', async (data) => {
      console.log('[CallService] Call busy');
      await this.handleCallBusy(data);
    });

    socketService.on('call_ended', async (data) => {
      console.log('[CallService] Call ended by remote');
      await this.handleCallEnded(data);
    });

    fcmService.on('incoming_call', async (data) => {
      console.log('[CallService] Incoming call from FCM');
      await this.handleIncomingCall(data);
    });

    callKeepService.on('answer', async (data) => {
      console.log('[CallService] Answer from CallKeep');
      await this.handleAnswerCall();
    });

    callKeepService.on('end_call', async (data) => {
      console.log('[CallService] End call from CallKeep');
      await this.handleEndCall();
    });

    callKeepService.on('toggle_mute', async (data) => {
      console.log('[CallService] Toggle mute from CallKeep');
      await this.toggleMute();
    });

    liveKitService.on('connected', () => {
      console.log('[CallService] LiveKit connected');
      this.onCallConnected();
    });

    liveKitService.on('disconnected', () => {
      console.log('[CallService] LiveKit disconnected');
      this.onCallDisconnected();
    });
  }

  async handleIncomingCall(data) {
    const callStore = useCallStore.getState();
    
    callStore.setIncomingCall({
      callerId: data.callerId,
      callerName: data.callerName || `User ${data.callerId}`,
      roomName: data.roomName,
      roomToken: data.roomToken,
      callId: data.callId
    });

    await callKeepService.displayIncomingCall(
      data.callerId,
      data.callerName || `User ${data.callerId}`,
      data.callId
    );

    await inCallManagerService.setKeepScreenOn(true);
    await inCallManagerService.setSpeakerphoneOn(true);

    this.notifyListeners('incoming_call', data);
  }

  async handleCallAccepted(data) {
    const callStore = useCallStore.getState();
    const roomName = data.roomName || data.room;
    const token = data.roomToken || data.token;

    if (roomName && token) {
      await this.connectToRoom(roomName, token);
    }
  }

  async handleCallRejected(data) {
    const callStore = useCallStore.getState();
    callStore.setRejected();
    await this.cleanupCall();
  }

  async handleCallBusy(data) {
    const callStore = useCallStore.getState();
    callStore.setBusy();
    await this.cleanupCall();
  }

  async handleCallEnded(data) {
    const callStore = useCallStore.getState();
    callStore.setDisconnected('remote_end');
    await this.cleanupCall();
  }

  async handleAnswerCall() {
    const callStore = useCallStore.getState();
    const incomingData = callStore.incomingCallData;

    if (incomingData) {
      await socketService.acceptCall(
        incomingData.callId,
        incomingData.roomName,
        incomingData.roomToken
      );

      await this.connectToRoom(incomingData.roomName, incomingData.roomToken);
    }
  }

  async handleEndCall() {
    await this.endCurrentCall();
  }

  async initiateCall(calleeCallId) {
    const userStore = useUserStore.getState();
    const callStore = useCallStore.getState();

    if (!userStore.callId) {
      throw new Error('User call ID not available');
    }

    const localCallId = callStore.initiateCall(calleeCallId, `User ${calleeCallId}`);

    await callKeepService.startOutgoingCall(
      localCallId,
      calleeCallId,
      `User ${calleeCallId}`
    );

    try {
      const response = await socketService.initiateCall(
        calleeCallId,
        userStore.callId,
        `User ${userStore.callId}`
      );

      callStore.setRinging(response.roomName);

      await inCallManagerService.setKeepScreenOn(true);
      await inCallManagerService.setSpeakerphoneOn(true);

      setTimeout(() => {
        const currentState = useCallStore.getState();
        if (currentState.callState === Config.CALL_STATES.RINGING) {
          this.handleCallTimeout();
        }
      }, Config.CALL_TIMEOUT);

      return response;
    } catch (error) {
      callStore.setFailed(error.message);
      await this.cleanupCall();
      throw error;
    }
  }

  async acceptCall() {
    const callStore = useCallStore.getState();
    const incomingData = callStore.incomingCallData;

    if (!incomingData) {
      throw new Error('No incoming call data');
    }

    await socketService.acceptCall(
      incomingData.callId,
      incomingData.roomName,
      incomingData.roomToken
    );

    await this.connectToRoom(incomingData.roomName, incomingData.roomToken);
  }

  async rejectCall() {
    const callStore = useCallStore.getState();
    const incomingData = callStore.incomingCallData;

    if (incomingData) {
      await socketService.rejectCall(incomingData.callId);
    }

    callStore.rejectIncomingCall();
    await this.cleanupCall();
  }

  async ignoreCall() {
    const callStore = useCallStore.getState();
    const incomingData = callStore.incomingCallData;

    if (incomingData) {
      await socketService.sendCallMissed(incomingData.callerId, useUserStore.getState().callId);
    }

    callStore.ignoreIncomingCall();
    await callKeepService.reportEndCall(incomingData?.callId || 'unknown', 'missed');
    await this.cleanupCall();
  }

  async connectToRoom(roomName, token) {
    try {
      await liveKitService.connect(roomName, token);
    } catch (error) {
      const callStore = useCallStore.getState();
      callStore.setFailed(error.message);
      await this.cleanupCall();
      throw error;
    }
  }

  async endCurrentCall() {
    const callStore = useCallStore.getState();
    
    socketService.endCall(callStore.localCallId || callStore.incomingCallData?.callId);
    
    await this.cleanupCall();
    callStore.setDisconnected('user_ended');
  }

  async toggleMute() {
    await liveKitService.toggleMute();
    const callStore = useCallStore.getState();
    await callKeepService.setMuted(
      callStore.incomingCallData?.callId || callStore.localCallId,
      callStore.isMuted
    );
  }

  async toggleSpeaker() {
    const callStore = useCallStore.getState();
    const newSpeakerState = !callStore.isSpeakerOn;
    await inCallManagerService.setSpeakerphoneOn(newSpeakerState);
  }

  onCallConnected() {
    foregroundService.start();
    this.notifyListeners('call_connected', {});
  }

  onCallDisconnected() {
    foregroundService.stop();
    this.notifyListeners('call_disconnected', {});
  }

  async cleanupCall() {
    try {
      await liveKitService.disconnect();
      await inCallManagerService.setKeepScreenOn(false);
      await inCallManagerService.setMicrophoneMute(false);
      await inCallManagerService.setSpeakerphoneOn(false);
      await callKeepService.reportEndCall(
        useCallStore.getState().localCallId || 
        useCallStore.getState().incomingCallData?.callId || 
        'unknown',
        'ended'
      );
    } catch (error) {
      console.error('[CallService] Cleanup error:', error);
    }
  }

  handleCallTimeout() {
    const callStore = useCallStore.getState();
    callStore.setMissed();
    socketService.emitUserOffline(useUserStore.getState().userId, useUserStore.getState().callId);
    this.cleanupCall();
  }

  async connectSocket(userId, callId) {
    socketService.initialize(userId, callId);
  }

  disconnectSocket() {
    socketService.disconnect();
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
          console.error('[CallService] Listener error:', error);
        }
      });
    }
  }
}

export const callService = new CallService();
export default callService;