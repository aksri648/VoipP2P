import { useEffect, useRef, useCallback } from 'react';
import { useUserStore } from '../stores/useUserStore';
import { useCallStore } from '../stores/useCallStore';
import { socketService } from '../services/SocketService';
import { webRTCService } from '../services/WebRTCService';
import { callKeepService } from '../services/CallKeepService';
import { inCallManagerService } from '../services/InCallManagerService';
import { fcmService } from '../services/FCMService';

const genId = () => `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export function useCall() {
  const userId = useUserStore((s) => s.userId);
  const callState = useCallStore((s) => s.callState);
  const setIncomingCall = useCallStore((s) => s.setIncomingCall);
  const startOutgoingCall = useCallStore((s) => s.startOutgoingCall);
  const setRinging = useCallStore((s) => s.setRinging);
  const setConnecting = useCallStore((s) => s.setConnecting);
  const setConnected = useCallStore((s) => s.setConnected);
  const setDisconnected = useCallStore((s) => s.setDisconnected);
  const setFailed = useCallStore((s) => s.setFailed);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleSpeaker = useCallStore((s) => s.toggleSpeaker);
  const clearIncomingCall = useCallStore((s) => s.clearIncomingCall);
  const reset = useCallStore((s) => s.reset);
  const remoteUserId = useCallStore((s) => s.remoteUserId);
  const incomingCall = useCallStore((s) => s.incomingCall);
  const localCallId = useCallStore((s) => s.localCallId);
  const currentCallId = useRef<string | null>(null);
  const isMuted = useCallStore((s) => s.isMuted);
  const isSpeakerOn = useCallStore((s) => s.isSpeakerOn);

  useEffect(() => {
    if (!userId || !socketService.isConnected) return;

    const unsub1 = socketService.on('incoming_call', async (data) => {
      const { callId, callerId, sdp } = data;

      const id = genId();
      currentCallId.current = callId;
      setIncomingCall({ callId, callerId, sdp });

      callKeepService.displayIncomingCall(id, callerId, callerId);
      inCallManagerService.playRingtone();

      await webRTCService.startLocalStream();
      webRTCService.createPeerConnection();

      if (sdp) {
        await webRTCService.setRemoteDescription(sdp, 'offer');
        const answer = await webRTCService.createAnswer();
        socketService.emit('call:answer', { callId, sdp: answer.sdp });
        setConnecting();
      }
    });

    const unsub2 = socketService.on('call:answered', async (data) => {
      const { sdp } = data;
      if (sdp) {
        await webRTCService.setRemoteDescription(sdp, 'answer');
      }
      setConnected();
      inCallManagerService.stopDialtone();
      inCallManagerService.stopRingtone();
      callKeepService.reportConnectedCall(localCallId || '');
    });

    const unsub3 = socketService.on('call:rejected', () => {
      setDisconnected('rejected');
      cleanup();
    });

    const unsub4 = socketService.on('call:ended', () => {
      setDisconnected('remote_end');
      cleanup();
    });

    const unsub5 = socketService.on('call:timeout', () => {
      setDisconnected('timeout');
      cleanup();
    });

    const unsub6 = socketService.on('ice:candidate', async (data) => {
      const { candidate } = data;
      if (candidate) {
        await webRTCService.addIceCandidate(candidate);
      }
    });

    const unsub7 = webRTCService.on('iceCandidate', (candidate) => {
      if (currentCallId.current && remoteUserId) {
        socketService.emit('ice:candidate', {
          callId: currentCallId.current,
          candidate,
          targetId: remoteUserId,
        });
      }
    });

    const unsub8 = webRTCService.on('connectionState', (state) => {
      if (state === 'connected') {
        setConnected();
      } else if (state === 'disconnected' || state === 'failed') {
        setDisconnected(state);
        cleanup();
      }
    });

    const unsub9 = callKeepService.on('answer', async () => {
      const data = incomingCall;
      if (data) {
        inCallManagerService.stopRingtone();

        if (data.sdp && !webRTCService.remoteDescriptionSet) {
          await webRTCService.setRemoteDescription(data.sdp, 'offer');
          const answer = await webRTCService.createAnswer();
          socketService.emit('call:answer', { callId: data.callId, sdp: answer.sdp });
        }

        setConnected();
        callKeepService.reportConnectedCall(data.callId);
      }
    });

    const unsub10 = callKeepService.on('endCall', () => {
      hangup();
    });

    const unsub11 = callKeepService.on('muteCall', ({ muted }) => {
      webRTCService.toggleAudio(!muted);
    });

    const unsub12 = fcmService.on('incoming_call', async (data) => {
      const { callId, callerId, sdp } = data;
      currentCallId.current = callId;
      setIncomingCall({ callId, callerId, sdp });
      callKeepService.displayIncomingCall(genId(), callerId, callerId);
    });

    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6();
      unsub7(); unsub8(); unsub9(); unsub10(); unsub11(); unsub12();
    };
  }, [userId]);

  const startCall = useCallback(async (calleeId: string) => {
    try {
      const id = startOutgoingCall(calleeId);
      currentCallId.current = id;

      await webRTCService.startLocalStream();
      webRTCService.createPeerConnection();

      callKeepService.startOutgoingCall(id, calleeId, calleeId);
      inCallManagerService.start();
      inCallManagerService.playDialtone();

      const offer = await webRTCService.createOffer();

      socketService.emit('call:offer', {
        calleeId,
        sdp: offer.sdp,
        callerId: userId,
      });

      setRinging();
    } catch (err: any) {
      setFailed(err.message);
      cleanup();
    }
  }, [userId]);

  const acceptCall = useCallback(async () => {
    const data = incomingCall;
    if (!data) return;

    inCallManagerService.stopRingtone();

    if (data.sdp && !webRTCService.remoteDescriptionSet) {
      await webRTCService.setRemoteDescription(data.sdp, 'offer');
      const answer = await webRTCService.createAnswer();
      socketService.emit('call:answer', { callId: data.callId, sdp: answer.sdp });
    }

    setConnected();
    callKeepService.reportConnectedCall(data.callId);
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    const data = incomingCall;
    if (data) {
      socketService.emit('call:reject', { callId: data.callId });
    }
    inCallManagerService.stopRingtone();
    clearIncomingCall();
    cleanup();
  }, [incomingCall]);

  const hangup = useCallback(() => {
    if (currentCallId.current) {
      socketService.emit('call:end', { callId: currentCallId.current });
    }
    inCallManagerService.stopDialtone();
    inCallManagerService.stopRingtone();
    cleanup();
    reset();
  }, []);

  const cleanup = () => {
    webRTCService.hangup();
    inCallManagerService.stop();
    inCallManagerService.setKeepScreenOn(false);
  };

  return {
    callState,
    remoteUserId,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleSpeaker,
    isMuted,
    isSpeakerOn,
  };
}
