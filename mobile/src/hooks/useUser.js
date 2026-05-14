import { useEffect, useCallback } from 'react';
import { useUserStore } from '../stores/useUserStore';
import { socketService, fcmService, callService } from '../services';

export const useUser = () => {
  const userStore = useUserStore();

  useEffect(() => {
    userStore.loadStoredUser();
  }, []);

  const initializeUser = useCallback(async (userData) => {
    await userStore.setUser({
      userId: userData.id,
      email: userData.email_addresses?.[0]?.email_address,
      phoneNumber: userData.phone_numbers?.[0]?.phone_number,
      fcmToken: null
    });

    const fcmGranted = await fcmService.requestPermission();
    if (fcmGranted) {
      const token = await fcmService.getToken();
      if (token) {
        await userStore.setFcmToken(token);
      }
    }
  }, []);

  const setCallId = useCallback(async (callId) => {
    await userStore.setCallId(callId);
    
    if (userStore.userId) {
      await socketService.initialize(userStore.userId, callId);
      await socketService.emitUserOnline(userStore.userId, callId);
    }
  }, [userStore.userId]);

  const connectToSignaling = useCallback(async () => {
    if (userStore.userId && userStore.callId) {
      await socketService.initialize(userStore.userId, userStore.callId);
      await socketService.emitUserOnline(userStore.userId, userStore.callId);
    }
  }, [userStore.userId, userStore.callId]);

  const disconnectFromSignaling = useCallback(() => {
    if (userStore.userId && userStore.callId) {
      socketService.emitUserOffline(userStore.userId, userStore.callId);
    }
    socketService.disconnect();
  }, [userStore.userId, userStore.callId]);

  const setOnline = useCallback(async (online) => {
    userStore.setOnline(online);
    if (online && userStore.userId && userStore.callId) {
      await socketService.emitUserOnline(userStore.userId, userStore.callId);
    }
  }, [userStore.userId, userStore.callId]);

  const logout = useCallback(async () => {
    await disconnectFromSignaling();
    await userStore.clearUser();
  }, [disconnectFromSignaling]);

  return {
    userId: userStore.userId,
    callId: userStore.callId,
    email: userStore.email,
    phoneNumber: userStore.phoneNumber,
    fcmToken: userStore.fcmToken,
    isOnline: userStore.isOnline,
    isInCall: userStore.isInCall,
    isInitialized: userStore.isInitialized,
    isLoading: userStore.isLoading,
    error: userStore.error,
    
    initializeUser,
    setCallId,
    connectToSignaling,
    disconnectFromSignaling,
    setOnline,
    logout
  };
};

export default useUser;