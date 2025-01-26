import { create } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';

interface SolanaToken {
  address: string;
  name?: string;
  symbol?: string;
  createdAt: Date;
  rugCheckScore?: number;
  initialLiquidity?: number;
}

interface MonitorState {
  tokens: SolanaToken[];
  isConnected: boolean;
  addToken: (token: SolanaToken) => void;
  setConnected: (connected: boolean) => void;
  lastUpdate: number;
}

export const useSolanaMonitor = create<MonitorState>((set) => ({
  tokens: [],
  isConnected: false,
  lastUpdate: Date.now(),
  addToken: (token) => 
    set((state) => ({
      tokens: [token, ...state.tokens].slice(0, 50), // Keep latest 50 tokens
      lastUpdate: Date.now()
    })),
  setConnected: (connected) => set({ isConnected: connected })
}));

let connection: Connection | null = null;

export async function initializeSolanaMonitor() {
  if (typeof window === 'undefined') return;

  const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
  if (!heliusApiKey) {
    console.error('[SolanaMonitor] Missing Helius API key');
    return;
  }

  const store = useSolanaMonitor.getState();

  try {
    connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
    );

    // Subscribe to Raydium program for new pool events
    const RAYDIUM_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

    await connection.onProgramAccountChange(
      new PublicKey(RAYDIUM_PROGRAM_ID),
      async (keyedAccountInfo, context) => {
        try {
          // Extract token data
          const signature = context.slot.toString();
          console.log(`[SolanaMonitor] New token event detected at slot ${signature}`);

          // Add basic token info, details will be fetched asynchronously
          store.addToken({
            address: signature,
            createdAt: new Date(),
          });

          store.setConnected(true);
        } catch (error) {
          console.error('[SolanaMonitor] Error processing event:', error);
        }
      }
    );

    console.log('[SolanaMonitor] Successfully initialized');
    store.setConnected(true);

  } catch (error) {
    console.error('[SolanaMonitor] Failed to initialize:', error);
    store.setConnected(false);
  }
}

// Auto-initialize when in browser
if (typeof window !== 'undefined') {
  setTimeout(initializeSolanaMonitor, 5000); // Wait 5s before connecting
}