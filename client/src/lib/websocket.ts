import { create } from 'zustand';

export interface Token {
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  createdAt: Date;
  address: string;
  imageUrl?: string;
}

interface TokenStore {
  tokens: Token[];
  isConnected: boolean;
  addToken: (token: Token) => void;
  updateToken: (address: string, updates: Partial<Token>) => void;
  setConnected: (connected: boolean) => void;
}

export const useTokenStore = create<TokenStore>((set) => ({
  tokens: [],
  isConnected: false,
  addToken: (token) =>
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 100), // Keep only last 100 tokens
    })),
  updateToken: (address, updates) =>
    set((state) => ({
      tokens: state.tokens.map((token) =>
        token.address === address ? { ...token, ...updates } : token
      ),
    })),
  setConnected: (connected) => set({ isConnected: connected }),
}));

// URL and parameters for the PumpPortal API
const PUMPPORTAL_API = 'https://pumpportal.fun/data-api';

export async function fetchRealTimeTokens() {
  try {
    const response = await fetch(`${PUMPPORTAL_API}/real-time`);
    if (!response.ok) {
      throw new Error('Failed to fetch real-time token data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching token data:', error);
    throw error;
  }
}