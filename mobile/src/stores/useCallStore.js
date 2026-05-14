import { create } from 'zustand';
import { Config } from '../config';

const initialState = {
  callState: Config.CALL_STATES.IDLE,
  localCallId: null,
  remoteCallId: null,
  remoteUserName: null,
  roomName: null,
  roomToken: null,
  isMuted: false,
  isSpeakerOn: false,
  isBluetoothOn: false,
  isConnecting: false,
  connectionError: null,
  callStartTime: null,
  callDuration: 0,
  remoteParticipant: null,
  incomingCallData: null,
  isReconnecting: false,
  networkStatus: 'unknown',
  callKeepActive: false,
  foregroundServiceActive: false
};

export const useCallStore = create((set, get) => ({
  ...initialState,

  setCallState: (callState) => set({ callState }),

  initiateCall: (remoteCallId, remoteUserName) => {
    const callId = generateCallId();
    set({
      callState: Config.CALL_STATES.CALLING,
      localCallId: callId,
      remoteCallId,
      remoteUserName,
      isConnecting: true,
      connectionError: null,
      callStartTime: Date.now()
    });
    return callId;
  },

  setRinging: (roomName) => {
    set({
      callState: Config.CALL_STATES.RINGING,
      roomName
    });
  },

  setConnecting: (roomName, token) => {
    set({
      callState: Config.CALL_STATES.CONNECTING,
      roomName,
      roomToken: token,
      isConnecting: true
    });
  },

  setConnected: (roomName) => {
    set({
      callState: Config.CALL_STATES.CONNECTED,
      isConnecting: false,
      callStartTime: Date.now()
    });
  },

  setDisconnected: (reason = 'normal') => {
    const currentState = get();
    const duration = currentState.callStartTime 
      ? Date.now() - currentState.callStartTime 
      : 0;
    
    set({
      callState: Config.CALL_STATES.DISCONNECTED,
      isConnecting: false
    });

    setTimeout(() => {
      set(initialState);
    }, 100);
  },

  setFailed: (error) => {
    set({
      callState: Config.CALL_STATES.FAILED,
      isConnecting: false,
      connectionError: error
    });
  },

  setBusy: () => {
    set({
      callState: Config.CALL_STATES.BUSY,
      isConnecting: false
    });
  },

  setRejected: () => {
    set({
      callState: Config.CALL_STATES.REJECTED,
      isConnecting: false
    });
  },

  setMissed: () => {
    set({
      callState: Config.CALL_STATES.MISSED,
      isConnecting: false
    });
  },

  setIncomingCall: (callData) => {
    set({
      callState: Config.CALL_STATES.RINGING,
      incomingCallData: callData,
      remoteCallId: callData.callerId,
      remoteUserName: callData.callerName || `User ${callData.callerId}`,
      roomName: callData.roomName,
      roomToken: callData.roomToken
    });
  },

  acceptIncomingCall: () => {
    const state = get();
    if (state.incomingCallData) {
      set({
        callState: Config.CALL_STATES.CONNECTING,
        isConnecting: true,
        roomName: state.incomingCallData.roomName,
        roomToken: state.incomingCallData.roomToken
      });
      return true;
    }
    return false;
  },

  rejectIncomingCall: () => {
    set({
      callState: Config.CALL_STATES.REJECTED,
      incomingCallData: null
    });
    setTimeout(() => {
      set({ callState: Config.CALL_STATES.IDLE });
    }, 100);
  },

  ignoreIncomingCall: () => {
    set({
      callState: Config.CALL_STATES.MISSED,
      incomingCallData: null
    });
    setTimeout(() => {
      set({ callState: Config.CALL_STATES.IDLE });
    }, 100);
  },

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  
  setMuted: (muted) => set({ isMuted: muted }),

  toggleSpeaker: () => set((state) => ({ isSpeakerOn: !state.isSpeakerOn })),
  
  setSpeaker: (enabled) => set({ isSpeakerOn: enabled }),

  toggleBluetooth: () => set((state) => ({ isBluetoothOn: !state.isBluetoothOn })),
  
  setBluetooth: (enabled) => set({ isBluetoothOn: enabled }),

  setRemoteParticipant: (participant) => set({ remoteParticipant: participant }),

  setReconnecting: (isReconnecting) => set({ isReconnecting }),

  setNetworkStatus: (status) => set({ networkStatus: status }),

  setCallKeepActive: (active) => set({ callKeepActive: active }),

  setForegroundServiceActive: (active) => set({ foregroundServiceActive: active }),

  updateCallDuration: () => {
    const state = get();
    if (state.callStartTime && state.callState === Config.CALL_STATES.CONNECTED) {
      set({ callDuration: Date.now() - state.callStartTime });
    }
  },

  resetCall: () => set(initialState),

  getCallInfo: () => {
    const state = get();
    return {
      callId: state.localCallId,
      remoteCallId: state.remoteCallId,
      remoteUserName: state.remoteUserName,
      roomName: state.roomName,
      callState: state.callState,
      isMuted: state.isMuted,
      isSpeakerOn: state.isSpeakerOn,
      duration: state.callDuration
    };
  }
}));

function generateCallId() {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default useCallStore;