import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  role: 'student' | 'admin' | null;
  setUser: (user: User | null, role?: 'student' | 'admin') => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  setUser: (user, role = 'student') => set({ user, role }),
  setLoading: (isLoading) => set({ isLoading }),
}));
