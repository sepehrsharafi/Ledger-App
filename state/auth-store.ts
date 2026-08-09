import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { api } from '@/lib/api';
import type { Role, SessionUser } from '@/types/models';

const SESSION_KEY = 'ledger.session.v1';

interface PersistedSession {
  token: string;
  user: SessionUser;
}

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  token: string | null;
  user: SessionUser | null;
  error: string | null;
  submitting: boolean;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  setRole: (role: Role) => void;
  clearError: () => void;
}

/**
 * Demo-only session store. The token comes from the API's demo endpoint and is not
 * verified on any request — swap `signIn` and add an auth header when a real IdP lands.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  token: null,
  user: null,
  error: null,
  submitting: false,

  restore: async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) {
        set({ status: 'signedOut' });
        return;
      }
      const session = JSON.parse(raw) as PersistedSession;
      set({ status: 'signedIn', token: session.token, user: session.user });
    } catch {
      set({ status: 'signedOut' });
    }
  },

  signIn: async (email, password) => {
    set({ submitting: true, error: null });
    try {
      const session = await api.signIn(email, password);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      set({ status: 'signedIn', token: session.token, user: session.user, submitting: false });
      return true;
    } catch (error) {
      set({ submitting: false, error: error instanceof Error ? error.message : 'Sign in failed' });
      return false;
    }
  },

  signOut: async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    set({ status: 'signedOut', token: null, user: null, error: null });
  },

  setRole: (role) => {
    const { user, token } = get();
    if (!user) return;
    const next = { ...user, role };
    set({ user: next });
    if (token) void AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ token, user: next }));
  },

  clearError: () => set({ error: null }),
}));

export const useSessionUser = () => useAuthStore((state) => state.user);
