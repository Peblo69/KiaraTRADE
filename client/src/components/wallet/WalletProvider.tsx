// src/components/wallet-provider.tsx
import { FC, ReactNode, useEffect, useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletError } from '@solana/wallet-adapter-base';
import { useToast } from "@/hooks/use-toast";
import { clusterApiUrl } from '@solana/web3.js';
import { format } from 'date-fns';

interface Props {
  children: ReactNode;
}

// Constants
const CURRENT_TIME = "2025-01-27 18:00:49";
const CURRENT_USER = "Peblo69";

export const WalletProvider: FC<Props> = ({ children }) => {
  const { toast } = useToast();

  // Use multiple endpoints for redundancy
  const endpoints = useMemo(() => [
    "https://solana-mainnet.g.alchemy.com/v2/demo",
    clusterApiUrl('mainnet-beta'),
    "https://solana-api.projectserum.com",
    "https://rpc.ankr.com/solana"
  ], []);

  const endpoint = endpoints[0]; // Use first endpoint as primary

  // Initialize wallet adapter
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  const onError = (error: WalletError) => {
    console.error('[Wallet Error]', {
      error,
      time: CURRENT_TIME,
      user: CURRENT_USER
    });

    toast({
      variant: "destructive",
      title: "Wallet Error",
      description: error.message || "Failed to connect wallet. Please try again.",
    });
  };

  // Add proper Phantom provider detection and event handling
  useEffect(() => {
    const connectEagerly = async () => {
      const provider = window.phantom?.solana;

      if (provider?.isPhantom) {
        try {
          await provider.connect({ onlyIfTrusted: true }).catch(() => {
            console.log("[Wallet] No previous trusted connection");
          });
        } catch (error) {
          console.log("[Wallet] Eager connection skipped - not previously connected");
        }
      }
    };

    const setupEventListeners = () => {
      const provider = window.phantom?.solana;

      if (provider?.isPhantom) {
        const handlers = {
          connect: (publicKey: any) => {
            console.log("[Wallet] Connected:", {
              publicKey: publicKey.toString(),
              time: CURRENT_TIME,
              user: CURRENT_USER
            });
          },
          disconnect: () => {
            console.log("[Wallet] Disconnected:", {
              time: CURRENT_TIME,
              user: CURRENT_USER
            });
          },
          accountChanged: (publicKey: any) => {
            if (publicKey) {
              console.log("[Wallet] Account changed:", {
                newPublicKey: publicKey.toString(),
                time: CURRENT_TIME,
                user: CURRENT_USER
              });
            } else {
              console.log("[Wallet] Disconnected from account:", {
                time: CURRENT_TIME,
                user: CURRENT_USER
              });
            }
          }
        };

        // Add event listeners
        provider.on('connect', handlers.connect);
        provider.on('disconnect', handlers.disconnect);
        provider.on('accountChanged', handlers.accountChanged);

        return () => {
          // Remove event listeners
          provider.off('connect', handlers.connect);
          provider.off('disconnect', handlers.disconnect);
          provider.off('accountChanged', handlers.accountChanged);
        };
      }
    };

    console.log('[Wallet] Initializing:', {
      hasPhantom: !!window.phantom,
      hasSolana: !!window.phantom?.solana,
      isPhantom: !!window.phantom?.solana?.isPhantom,
      endpoint,
      time: CURRENT_TIME,
      user: CURRENT_USER
    });

    // Delay eager connection to ensure Phantom injection
    const timeoutId = setTimeout(connectEagerly, 500);

    const cleanup = setupEventListeners();

    return () => {
      clearTimeout(timeoutId);
      if (cleanup) cleanup();
    };
  }, [endpoint]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        onError={onError}
        autoConnect={false} // Manual connection handling for better control
      >
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

// Add Phantom type definitions
declare global {
  interface Window {
    phantom?: {
      solana?: any;
    };
  }
}

export default WalletProvider;