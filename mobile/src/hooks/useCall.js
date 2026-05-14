import { useEffect, useCallback, useRef } from 'react';
import { callService } from '../services';
import useCallStore from '../stores/useCallStore';
import { Config } from '../config';

export const useCall = () => {
  const callStore = useCallStore();
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (callStore.callState === Config.CALL_STATES.CONNECTED) {
        callStore.updateCallDuration();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [callStore.callState]);

  const initiateCall = useCallback(async (calleeCallId) => {
    return await callService.initiateCall(calleeCallId);
  }, []);

  const acceptCall = useCallback(async () => {
    return await callService.acceptCall();
  }, []);

  const rejectCall = useCallback(async () => {
    return await callService.rejectCall();
  }, []);

  const ignoreCall = useCallback(async () => {
    return await callService.ignoreCall();
  }, []);

  const endCall = useCallback(async () => {
    return await callService.endCurrentCall();
  }, []);

  const toggleMute = useCallback(async () => {
    return await callService.toggleMute();
  }, []);

  const toggleSpeaker = useCallback(async () => {
    return await callService.toggleSpeaker();
  }, []);

  return {
    callState: callStore.callState,
    localCallId: callStore.localCallId,
    remoteCallId: callStore.remoteCallId,
    remoteUserName: callStore.remoteUserName,
    roomName: callStore.roomName,
    roomToken: callStore.roomToken,
    isMuted: callStore.isMuted,
    isSpeakerOn: callStore.isSpeakerOn,
    isConnecting: callStore.isConnecting,
    connectionError: callStore.connectionError,
    callDuration: callStore.callDuration,
    remoteParticipant: callStore.remoteParticipant,
    incomingCallData: callStore.incomingCallData,
    isReconnecting: callStore.isReconnecting,
    
    initiateCall,
    acceptCall,
    rejectCall,
    ignoreCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    
    resetCall: callStore.resetCall
  };
};

export default useCall;