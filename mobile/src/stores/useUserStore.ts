import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = '@voip_p2p_user_id';

interface UserState {
  userId: string | null;
  isRegistered: boolean;
  fcmToken: string | null;
  setUserId: (id: string) => void;
  setFcmToken: (token: string) => void;
  setRegistered: (val: boolean) => void;
  loadUserId: () => Promise<string | null>;
  persistUserId: (id: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  isRegistered: false,
  fcmToken: null,

  setUserId: (userId) => set({ userId }),

  setFcmToken: (fcmToken) => set({ fcmToken }),

  setRegistered: (isRegistered) => set({ isRegistered }),

  loadUserId: async () => {
    const stored = await AsyncStorage.getItem(USER_ID_KEY);
    if (stored) {
      set({ userId: stored, isRegistered: true });
    }
    return stored;
  },

  persistUserId: async (id) => {
    await AsyncStorage.setItem(USER_ID_KEY, id);
    set({ userId: id, isRegistered: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem(USER_ID_KEY);
    set({ userId: null, isRegistered: false });
  },
}));
