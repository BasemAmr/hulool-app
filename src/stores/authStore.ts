import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../api/types';


interface AuthState {
  status: 'idle' | 'authenticated' | 'unauthenticated';
  user: User | null;
  token: string | null; // Base64 encoded 'username:password'
  nonce: string | null;
  lastNonceRefresh: number | null; // Timestamp of last nonce refresh
}

interface AuthActions {
  login: (token: string, user: User, nonce: string) => void;
  logout: () => void;
  setNonce: (nonce: string) => void;
}

const initialState: AuthState = {
  status: 'idle',
  user: null,
  token: null,
  nonce: null,
  lastNonceRefresh: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,
      login: (token, user, nonce) => {
        set({ status: 'authenticated', user, token, nonce, lastNonceRefresh: Date.now() });
      },
      logout: () => {
        set({ ...initialState, status: 'unauthenticated' });
      },
      setNonce: (nonce) => {
        set({ nonce, lastNonceRefresh: Date.now() });
      },
    }),
    {
      name: 'hulool-auth-storage', // Key in localStorage
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user, 
        nonce: state.nonce, 
        lastNonceRefresh: state.lastNonceRefresh 
      }), // Persist token, user, nonce, and lastNonceRefresh
      onRehydrateStorage: () => (state) => {
        // After rehydration, set the correct status based on whether we have a token
        if (state) {
          if (state.token && state.user) {
            state.status = 'authenticated';
          } else {
            state.status = 'unauthenticated';
          }
        }
      },
    }
  )
);