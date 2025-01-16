import { create } from 'zustand';
import { heliusSocket } from './helius-websocket';

interface VolumeData {
  timestamp: number;
  volume: number;
}

interface TokenVolumeState {
  volumeData: Record<string, VolumeData[]>;
  addVolumeData: (tokenAddress: string, amount: number) => void;
  getVolumeHistory: (tokenAddress: string) => VolumeData[];
}

// Create a store for managing token volume data
export const useTokenVolumeStore = create<TokenVolumeState>((set, get) => ({
  volumeData: {},
  
  addVolumeData: (tokenAddress: string, amount: number) => {
    set((state) => {
      const currentTime = Date.now();
      const tokenData = state.volumeData[tokenAddress] || [];
      
      // Add new volume data point
      const newData = [...tokenData, { timestamp: currentTime, volume: amount }];
      
      // Keep only last 24 hours of data
      const twentyFourHoursAgo = currentTime - 24 * 60 * 60 * 1000;
      const filteredData = newData.filter(data => data.timestamp >= twentyFourHoursAgo);

      return {
        volumeData: {
          ...state.volumeData,
          [tokenAddress]: filteredData,
        },
      };
    });
  },

  getVolumeHistory: (tokenAddress: string) => {
    const state = get();
    return state.volumeData[tokenAddress] || [];
  },
}));

// Function to process Helius transaction data
export const processHeliusTransaction = (transaction: any) => {
  try {
    if (transaction.type === 'SWAP' || transaction.type === 'TRANSFER') {
      const tokenAddress = transaction.tokenTransfers?.[0]?.mint;
      const amount = transaction.tokenTransfers?.[0]?.amount || 0;

      if (tokenAddress && amount > 0) {
        console.log(`[Token Volume] Processing transaction for token ${tokenAddress}: ${amount} SOL`);
        useTokenVolumeStore.getState().addVolumeData(tokenAddress, amount);
      }
    }
  } catch (error) {
    console.error('[Token Volume] Error processing transaction:', error);
  }
};

// Initialize Helius WebSocket connection for volume tracking
export const initializeVolumeTracking = () => {
  heliusSocket.onMessage((data: any) => {
    if (data.type === 'transaction') {
      processHeliusTransaction(data);
    }
  });
};
