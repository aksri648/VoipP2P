export type CallState =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'busy'
  | 'rejected'
  | 'missed'
  | 'ended';

export interface User {
  userId: string;
  isOnline: boolean;
  isInCall: boolean;
  lastSeen?: string;
}

export interface IncomingCallData {
  callId: string;
  callerId: string;
  sdp?: string;
}

export interface OutgoingCallData {
  callId: string;
  calleeId: string;
}

export interface ICECandidateMessage {
  callId: string;
  candidate: RTCIceCandidateInit;
  targetId: string;
}

export interface CallMessage {
  callId: string;
  callerId?: string;
  calleeId?: string;
  sdp?: string;
  reason?: string;
}
