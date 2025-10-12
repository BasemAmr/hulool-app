import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../api/types';

export type UserRole = 'admin' | 'employee' | 'both' | null;

// Helper function to compute user role based on capabilities and employee status
const computeUserRole = (user: User | null): UserRole => {
  if (!user) return null;
  
  const isAdmin = user.capabilities?.manage_options || false;
  const isEmployee = user.employee_id != null; // Checks for both null and undefined
  
  if (isAdmin && isEmployee) return 'both';
  if (isAdmin) return 'admin';
  if (isEmployee) return 'employee';
  return null;
};

interface AuthState {
  status: 'idle' | 'authenticated' | 'unauthenticated';
  user: User | null;
  token: string | null; // Base64 encoded 'username:password'
  nonce: string | null;
  lastNonceRefresh: number | null; // Timestamp of last nonce refresh
  userRole: UserRole; // Computed role based on user capabilities
}

interface AuthActions {
  login: (username: string, appPassword: string, user: User) => void;
  logout: () => void;
  setNonce: (nonce: string) => void;
  // Helper methods for role checking
  isEmployee: () => boolean;
  isAdmin: () => boolean;
  getUserRole: () => UserRole;
}

const initialState: AuthState = {
  status: 'idle',
  user: null,
  token: null,
  nonce: null,
  lastNonceRefresh: null,
  userRole: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      login: (username, appPassword, user) => {
        const userRole = computeUserRole(user);
        // The token stored is now base64(username:app_password)
        const token = btoa(`${username}:${appPassword}`);
        set({ 
          status: 'authenticated', 
          user, 
          token, 
          nonce: null, // Nonce is not needed for Application Password auth
          lastNonceRefresh: null,
          userRole 
        });
      },
      logout: () => {
        set({ ...initialState, status: 'unauthenticated' });
      },
      setNonce: (nonce) => {
        set({ nonce, lastNonceRefresh: Date.now() });
      },
      // Helper methods for role checking
      isEmployee: () => {
        const { user } = get();
        return user?.employee_id != null; // Use != to check for both null and undefined
      },
      isAdmin: () => {
        const { user } = get();
        return user?.capabilities?.manage_options || false;
      },
      getUserRole: () => {
        const { user } = get();
        if (!user) return null;
        return computeUserRole(user);
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
        // After rehydration, set the correct status and userRole based on stored data
        if (state) {
          if (state.token && state.user) {
            state.status = 'authenticated';
            state.userRole = computeUserRole(state.user);
          } else {
            state.status = 'unauthenticated';
            state.userRole = null;
          }
        }
      },
    }
  )
);