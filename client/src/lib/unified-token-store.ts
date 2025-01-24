import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UnifiedTokenState {
  isConnected: boolean;
  connectionError: string | null;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUnifiedTokenStore = create<UnifiedTokenState>((set) => ({
  isConnected: false,
  connectionError: null,
  setConnected: (status) => set({ isConnected: status, connectionError: null }),
  setError: (error) => set({ connectionError: error }),
}));