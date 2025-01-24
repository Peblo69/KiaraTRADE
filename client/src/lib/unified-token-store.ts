import { create } from 'zustand';

interface UnifiedTokenState {
  isConnected: boolean;
  connectionError: string | null;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUnifiedTokenStore = create<UnifiedTokenState>((set) => ({
  isConnected: false,
  connectionError: null,
  setConnected: (status) => set({ isConnected: status }),
  setError: (error) => set({ connectionError: error }),
}));