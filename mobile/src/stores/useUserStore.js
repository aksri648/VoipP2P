import { create } from 'zustand';
import AsyncStorage from '@react-native-community/async-storage';

const USER_STORAGE_KEY = '@voip_p2p_user';
const CALL_ID_STORAGE_KEY = '@voip_p2p_call_id';

const initialState = {
  userId: null,
  callId: null,
  email: null,
  phoneNumber: null,
  fcmToken: null,
  isOnline: false,
  isInCall: false,
  lastSeen: null,
  isInitialized: false,
  isLoading: false,
  error: null
};

export const useUserStore = create((set, get) => ({
  ...initialState,

  setUser: async (userData) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      set({
        userId: userData.userId,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        fcmToken: userData.fcmToken,
        isOnline: true,
        lastSeen: Date.now(),
        isInitialized: true
      });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setCallId: async (callId) => {
    try {
      await AsyncStorage.setItem(CALL_ID_STORAGE_KEY, callId);
      set({ callId });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setFcmToken: async (token) => {
    try {
      const userData = {
        userId: get().userId,
        callId: get().callId,
        email: get().email,
        phoneNumber: get().phoneNumber,
        fcmToken: token,
        isOnline: get().isOnline
      };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      set({ fcmToken: token });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setOnline: (isOnline) => set({ isOnline, lastSeen: Date.now() }),

  setInCall: (isInCall) => set({ isInCall }),

  setLoading: (isLoading) => set({ isLoading }),

  loadStoredUser: async () => {
    set({ isLoading: true });
    try {
      const [userJson, callId] = await Promise.all([
        AsyncStorage.getItem(USER_STORAGE_KEY),
        AsyncStorage.getItem(CALL_ID_STORAGE_KEY)
      ]);

      if (userJson) {
        const userData = JSON.parse(userJson);
        set({
          userId: userData.userId,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          fcmToken: userData.fcmToken,
          isOnline: userData.isOnline || false,
          callId: callId || null,
          isInitialized: true
        });
      } else {
        set({ isInitialized: true });
      }
    } catch (error) {
      set({ error: error.message, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  clearUser: async () => {
    try {
      await AsyncStorage.multiRemove([USER_STORAGE_KEY, CALL_ID_STORAGE_KEY]);
      set(initialState);
    } catch (error) {
      set({ error: error.message });
    }
  },

  updateLastSeen: () => set({ lastSeen: Date.now() }),

  getUserDisplayInfo: () => {
    const state = get();
    return {
      callId: state.callId,
      displayName: state.callId ? `User ${state.callId}` : 'Unknown',
      isOnline: state.isOnline,
      isInCall: state.isInCall
    };
  }
}));

export default useUserStore;