import { create } from 'zustand';
import type { CallState, IncomingCallData } from '../types';

interface CallStore {
  callState: CallState;
  localCallId: string | null;
  remoteUserId: string | null;
  incomingCall: IncomingCallData | null;
  isMuted: boolean;
  isSpeakerOn: boolean;
  callDuration: number;

  setCallState: (state: CallState) => void;
  setIncomingCall: (data: IncomingCallData) => void;
  clearIncomingCall: () => void;
  startOutgoingCall: (calleeId: string) => string;
  setRinging: () => void;
  setConnecting: () => void;
  setConnected: () => void;
  setDisconnected: (reason?: string) => void;
  setFailed: (reason?: string) => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  setCallDuration: (duration: number) => void;
  reset: () => void;
}

let callIdCounter = 0;
const genId = () => `call_${Date.now()}_${++callIdCounter}`;

export const useCallStore = create<CallStore>((set, get) => ({
  callState: 'idle',
  localCallId: null,
  remoteUserId: null,
  incomingCall: null,
  isMuted: false,
  isSpeakerOn: false,
  callDuration: 0,

  setCallState: (callState) => set({ callState }),

  setIncomingCall: (data) => set({ incomingCall: data, callState: 'ringing', remoteUserId: data.callerId }),

  clearIncomingCall: () => set({ incomingCall: null }),

  startOutgoingCall: (calleeId) => {
    const id = genId();
    set({ localCallId: id, remoteUserId: calleeId, callState: 'calling' });
    return id;
  },

  setRinging: () => set({ callState: 'ringing' }),

  setConnecting: () => set({ callState: 'connecting' }),

  setConnected: () => set({ callState: 'connected', callDuration: 0 }),

  setDisconnected: (reason) => set({ callState: 'disconnected' }),

  setFailed: (reason) => set({ callState: 'failed' }),

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  toggleSpeaker: () => set((s) => ({ isSpeakerOn: !s.isSpeakerOn })),

  setCallDuration: (duration) => set({ callDuration: duration }),

  reset: () =>
    set({
      callState: 'idle',
      localCallId: null,
      remoteUserId: null,
      incomingCall: null,
      isMuted: false,
      isSpeakerOn: false,
      callDuration: 0,
    }),
}));
