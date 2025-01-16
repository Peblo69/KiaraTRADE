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
    console.log('[Token Volume] Processing Helius transaction:', transaction);

    if (!transaction || !transaction.type) {
      console.warn('[Token Volume] Invalid transaction data');
      return;
    }

    // Handle different transaction types
    switch (transaction.type) {
      case 'SWAP':
        if (transaction.tokenTransfers) {
          transaction.tokenTransfers.forEach((transfer: any) => {
            if (transfer.mint && transfer.amount) {
              console.log(`[Token Volume] Adding swap volume for token ${transfer.mint}: ${transfer.amount} SOL`);
              useTokenVolumeStore.getState().addVolumeData(transfer.mint, transfer.amount);
            }
          });
        }
        break;

      case 'TRANSFER':
        if (transaction.tokenTransfers) {
          transaction.tokenTransfers.forEach((transfer: any) => {
            if (transfer.mint && transfer.amount) {
              console.log(`[Token Volume] Adding transfer volume for token ${transfer.mint}: ${transfer.amount} SOL`);
              useTokenVolumeStore.getState().addVolumeData(transfer.mint, transfer.amount);
            }
          });
        }
        break;

      case 'NFT_SALE':
        if (transaction.nativeTransfers) {
          transaction.nativeTransfers.forEach((transfer: any) => {
            if (transfer.amount) {
              console.log(`[Token Volume] Adding NFT sale volume: ${transfer.amount} SOL`);
              useTokenVolumeStore.getState().addVolumeData(transaction.mint, transfer.amount);
            }
          });
        }
        break;
    }
  } catch (error) {
    console.error('[Token Volume] Error processing transaction:', error);
  }
};

// Initialize Helius WebSocket connection for volume tracking
export const initializeVolumeTracking = () => {
  console.log('[Token Volume] Initializing volume tracking');
  heliusSocket.onMessage((data: any) => {
    console.log('[Token Volume] Received WebSocket message:', data);
    if (data.type === 'transaction') {
      processHeliusTransaction(data);
    }
  });
};