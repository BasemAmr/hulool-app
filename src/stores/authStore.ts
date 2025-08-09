import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../api/types';


interface AuthState {
  status: 'idle' | 'authenticated' | 'unauthenticated';
  user: User | null;
  token: string | null; // Base64 encoded 'username:password'
  nonce: string | null;
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
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,
      login: (token, user, nonce) => {
        set({ status: 'authenticated', user, token, nonce });
      },
      logout: () => {
        set(initialState);
      },
      setNonce: (nonce) => {
        set({ nonce });
      },
    }),
    {
      name: 'hulool-auth-storage', // Key in localStorage
      partialize: (state) => ({ token: state.token, user: state.user }), // Only persist token and user
    }
  )
);