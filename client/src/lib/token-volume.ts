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
  updateVolume24h: (tokenAddress: string, volume: number) => void;
}

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

      // Sort data by timestamp
      filteredData.sort((a, b) => a.timestamp - b.timestamp);

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

  updateVolume24h: (tokenAddress: string, volume: number) => {
    set((state) => {
      const currentData = state.volumeData[tokenAddress] || [];
      const currentTime = Date.now();

      // If there's no data, create initial data points
      if (currentData.length === 0) {
        const initialData = Array.from({ length: 24 }, (_, i) => ({
          timestamp: currentTime - (23 - i) * 3600000,
          volume: volume / 24 // Distribute volume evenly across 24 hours
        }));

        return {
          volumeData: {
            ...state.volumeData,
            [tokenAddress]: initialData,
          },
        };
      }

      return state;
    });
  },
}));

// Process transaction data and update volume
export const processHeliusTransaction = (transaction: any) => {
  try {
    console.log('[Token Volume] Processing transaction:', transaction);

    if (!transaction || !transaction.type) {
      console.warn('[Token Volume] Invalid transaction data');
      return;
    }

    switch (transaction.type) {
      case 'SWAP':
      case 'TRANSFER':
        if (transaction.tokenTransfers) {
          transaction.tokenTransfers.forEach((transfer: any) => {
            if (transfer.mint && transfer.amount) {
              const amount = parseFloat(transfer.amount);
              if (!isNaN(amount) && amount > 0) {
                console.log(`[Token Volume] Adding volume for token ${transfer.mint}: ${amount} SOL`);
                useTokenVolumeStore.getState().addVolumeData(transfer.mint, amount);
              }
            }
          });
        }
        break;

      case 'NFT_SALE':
        if (transaction.nativeTransfers) {
          const totalAmount = transaction.nativeTransfers.reduce(
            (sum: number, transfer: any) => sum + (parseFloat(transfer.amount) || 0),
            0
          );

          if (totalAmount > 0 && transaction.mint) {
            console.log(`[Token Volume] Adding NFT sale volume for ${transaction.mint}: ${totalAmount} SOL`);
            useTokenVolumeStore.getState().addVolumeData(transaction.mint, totalAmount);
          }
        }
        break;
    }

  } catch (error) {
    console.error('[Token Volume] Error processing transaction:', error);
  }
};

// Initialize volume tracking with Helius WebSocket
export const initializeVolumeTracking = () => {
  console.log('[Token Volume] Initializing volume tracking');

  heliusSocket.onMessage((data: any) => {
    if (data.type === 'transaction') {
      processHeliusTransaction(data);
    }
  });
};