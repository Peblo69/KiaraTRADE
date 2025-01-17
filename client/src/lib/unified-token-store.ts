import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
}

interface Transaction {
  signature: string;
  buyer: string;
  solAmount: number;
  tokenAmount: number;
  timestamp: number;
  type: 'buy' | 'sell';
}

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string;
  showName?: boolean;
  createdOn?: string;
  twitter?: string;
  website?: string;
}

interface TokenData {
  name: string;
  symbol: string;
  marketCap: number;
  marketCapSol: number;
  liquidityAdded: boolean;
  holders: number;
  volume24h: number;
  address: string;
  price: number;
  imageUrl?: string;
  uri?: string;
  initialBuy?: number;
  solAmount?: number;
  priceChange24h?: number;
  metadata?: TokenMetadata;
  lastUpdated?: number;
}

interface UnifiedTokenState {
  tokens: TokenData[];
  priceHistory: Record<string, CandleData[]>;
  currentCandles: Record<string, CandleData>;
  transactions: Record<string, Transaction[]>;
  isConnected: boolean;
  connectionError: string | null;
  updateCount: number; // Add update counter

  // Actions
  addToken: (token: TokenData) => void;
  updateToken: (address: string, updates: Partial<TokenData>) => void;
  addPricePoint: (tokenAddress: string, price: number, marketCap: number, volume: number) => void;
  addTransaction: (tokenAddress: string, transaction: Transaction) => void;
  setConnected: (status: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors
  getToken: (address: string) => TokenData | undefined;
  getPriceHistory: (address: string) => CandleData[];
  getTransactions: (address: string) => Transaction[];
}

const CANDLE_INTERVAL = 5 * 60 * 1000; // 5 minutes

let updateCount = 0;

export const useUnifiedTokenStore = create<UnifiedTokenState>()(
  devtools(
    (set, get) => ({
      tokens: [],
      priceHistory: {},
      currentCandles: {},
      transactions: {},
      isConnected: false,
      connectionError: null,
      updateCount: 0,

      addToken: (token) => {
        console.log('[UnifiedTokenStore] Adding token:', token.address, {
          updateCount: ++updateCount,
          tokensCount: get().tokens.length
        });

        const initialPrice = token.solAmount && token.initialBuy
          ? token.solAmount / token.initialBuy
          : 0;

        // Batch all state updates together
        set((state) => {
          const candleTime = Math.floor(Date.now() / CANDLE_INTERVAL) * CANDLE_INTERVAL;
          console.log('[UnifiedTokenStore] State update for new token:', {
            address: token.address,
            price: initialPrice,
            candleTime
          });

          return {
            tokens: [...state.tokens, {
              ...token,
              price: initialPrice,
              lastUpdated: Date.now(),
            }].sort((a, b) => b.marketCapSol - a.marketCapSol).slice(0, 100),

            // Initialize price history for the new token
            currentCandles: token.address ? {
              ...state.currentCandles,
              [token.address]: {
                timestamp: candleTime,
                open: initialPrice,
                high: initialPrice,
                low: initialPrice,
                close: initialPrice,
                volume: 0,
                marketCap: token.marketCapSol || 0
              }
            } : state.currentCandles,
            updateCount: state.updateCount + 1
          };
        });
      },

      updateToken: (address, updates) => {
        console.log('[UnifiedTokenStore] Updating token:', address, {
          updates,
          updateCount: ++updateCount
        });

        set((state) => {
          const currentToken = state.tokens.find(token => token.address === address);
          if (!currentToken) {
            console.log('[UnifiedTokenStore] Token not found:', address);
            return state;
          }

          const priceChange24h = updates.price !== undefined && currentToken.price !== undefined
            ? ((updates.price - currentToken.price) / currentToken.price) * 100
            : currentToken.priceChange24h;

          return {
            tokens: state.tokens.map((token) =>
              token.address === address
                ? {
                    ...token,
                    ...updates,
                    priceChange24h,
                    lastUpdated: Date.now()
                  }
                : token
            ),
            updateCount: state.updateCount + 1
          };
        });
      },

      addPricePoint: (tokenAddress, price, marketCap, volume) => {
        console.log('[UnifiedTokenStore] Adding price point:', {
          tokenAddress,
          price,
          marketCap,
          volume,
          updateCount: ++updateCount
        });

        set((state) => {
          const currentTime = Date.now();
          const candleTime = Math.floor(currentTime / CANDLE_INTERVAL) * CANDLE_INTERVAL;
          const currentCandle = state.currentCandles[tokenAddress];

          console.log('[UnifiedTokenStore] Current candle state:', {
            currentCandle,
            candleTime,
            isNewCandle: !currentCandle || candleTime !== currentCandle.timestamp
          });

          if (!currentCandle || candleTime !== currentCandle.timestamp) {
            // Start a new candle
            const newCandle = {
              timestamp: candleTime,
              open: price,
              high: price,
              low: price,
              close: price,
              volume,
              marketCap
            };

            const tokenHistory = state.priceHistory[tokenAddress] || [];
            if (currentCandle) {
              tokenHistory.push(currentCandle);
            }

            return {
              priceHistory: {
                ...state.priceHistory,
                [tokenAddress]: tokenHistory.slice(-288), // Keep 24 hours
              },
              currentCandles: {
                ...state.currentCandles,
                [tokenAddress]: newCandle
              },
              updateCount: state.updateCount + 1
            };
          }

          // Check if update is actually needed
          const needsUpdate =
            currentCandle.high !== Math.max(currentCandle.high, price) ||
            currentCandle.low !== Math.min(currentCandle.low, price) ||
            currentCandle.close !== price ||
            currentCandle.marketCap !== marketCap;

          console.log('[UnifiedTokenStore] Candle update check:', {
            needsUpdate,
            currentHigh: currentCandle.high,
            newHigh: Math.max(currentCandle.high, price),
            currentLow: currentCandle.low,
            newLow: Math.min(currentCandle.low, price)
          });

          if (!needsUpdate) {
            console.log('[UnifiedTokenStore] Skipping unnecessary update');
            return state;
          }

          return {
            currentCandles: {
              ...state.currentCandles,
              [tokenAddress]: {
                ...currentCandle,
                high: Math.max(currentCandle.high, price),
                low: Math.min(currentCandle.low, price),
                close: price,
                volume: currentCandle.volume + volume,
                marketCap
              }
            },
            updateCount: state.updateCount + 1
          };
        });
      },

      addTransaction: (tokenAddress, transaction) => {
        console.log('[UnifiedTokenStore] Adding transaction:', {
          tokenAddress,
          transaction,
          updateCount: ++updateCount
        });

        set((state) => {
          const tokenTransactions = state.transactions[tokenAddress] || [];
          if (tokenTransactions.some(tx => tx.signature === transaction.signature)) {
            console.log('[UnifiedTokenStore] Duplicate transaction, skipping');
            return state;
          }

          return {
            transactions: {
              ...state.transactions,
              [tokenAddress]: [transaction, ...tokenTransactions].slice(0, 10)
            },
            updateCount: state.updateCount + 1
          };
        });
      },

      setConnected: (status) => {
        console.log('[UnifiedTokenStore] Setting connection status:', status);
        set({ isConnected: status, connectionError: null, updateCount: get().updateCount +1 });
      },

      setError: (error) => {
        console.log('[UnifiedTokenStore] Setting error:', error);
        set({ connectionError: error, updateCount: get().updateCount + 1 });
      },

      // Selectors with added logging
      getToken: (address) => {
        const token = get().tokens.find(token => token.address === address);
        console.log('[UnifiedTokenStore] Getting token:', {
          address,
          found: !!token,
          updateCount
        });
        return token;
      },

      getPriceHistory: (address) => {
        const state = get();
        const history = state.priceHistory[address] || [];
        const currentCandle = state.currentCandles[address];
        console.log('[UnifiedTokenStore] Getting price history:', {
          address,
          historyLength: history.length,
          hasCurrentCandle: !!currentCandle,
          updateCount
        });
        return currentCandle ? [...history, currentCandle] : history;
      },

      getTransactions: (address) => {
        const transactions = get().transactions[address] || [];
        console.log('[UnifiedTokenStore] Getting transactions:', {
          address,
          count: transactions.length,
          updateCount
        });
        return transactions;
      },
    }),
    { name: 'unified-token-store' }
  )
);