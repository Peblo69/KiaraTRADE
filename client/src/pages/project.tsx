import { FC, useEffect } from "react";
import Navbar from "@/components/Navbar";
import DebugConsole from "@/components/DebugConsole";
import { createClient } from 'graphql-ws';

const ProjectPage: FC = () => {
  useEffect(() => {
    console.log('[BitQuery] Starting WebSocket connection...');
    (window as any).debugConsole?.log('Starting WebSocket connection...');

    // Manually generated token valid until 2025-01-23 16:30:30
    const MANUAL_ACCESS_TOKEN = 'ory_at_ixYL1dO88QEiiFtRbsvvjoW-YJsF7kLLhJFpDwcFPno.5HEEoVYtVCRZ4LWWZpvf5izVGPOGNvJzFUw8TcH8l4c';

    let retryCount = 0;
    const maxRetries = 5;
    let unsubscribe: (() => void) | null = null;

    function connectWebSocket() {
      console.log('[BitQuery] Attempting WebSocket connection...');
      (window as any).debugConsole?.log('Attempting to establish WebSocket connection...');

      const client = createClient({
        url: 'wss://streaming.bitquery.io/graphql',
        connectionParams: {
          headers: {
            'Authorization': `Bearer ${MANUAL_ACCESS_TOKEN}`,
          },
        },
        on: {
          connected: () => {
            console.log('[BitQuery] WebSocket connected successfully');
            (window as any).debugConsole?.success('WebSocket connection established');
            retryCount = 0;
            startSimpleSubscription(client);
          },
          error: (error: unknown) => {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('[BitQuery] WebSocket error:', errorMsg);
            (window as any).debugConsole?.error(`WebSocket error: ${errorMsg}`);
            handleRetry();
          },
          closed: (event: unknown) => {
            const code = (event as { code?: number })?.code;
            const reason = (event as { reason?: string })?.reason;
            console.warn('[BitQuery] WebSocket connection closed:', { code, reason });
            (window as any).debugConsole?.log(`WebSocket connection closed: Code ${code || 'unknown'}, Reason: ${reason || 'none provided'}`);
            handleRetry();
          },
        },
        retryAttempts: 0, // We'll handle retries ourselves
        shouldRetry: () => false,
      });

      return client;
    }

    function handleRetry() {
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff with 30s max
        console.log(`[BitQuery] Retrying connection in ${delay/1000}s (attempt ${retryCount}/${maxRetries})`);
        (window as any).debugConsole?.log(`Retrying in ${delay/1000}s (attempt ${retryCount}/${maxRetries})`);
        setTimeout(connectWebSocket, delay);
      } else {
        console.error('[BitQuery] Max retry attempts reached');
        (window as any).debugConsole?.error('Failed to establish WebSocket connection after max retries');
      }
    }

    function startSimpleSubscription(client: ReturnType<typeof createClient>) {
      try {
        console.log('[BitQuery] Starting simple test subscription...');
        (window as any).debugConsole?.log('Starting test subscription...');

        // Simple test subscription from documentation
        unsubscribe = client.subscribe(
          {
            query: `
              subscription {
                Solana {
                  DEXTrades(limit: 1) {
                    Trade {
                      Dex {
                        ProtocolName
                      }
                      Buy {
                        Currency {
                          Symbol
                          MintAddress
                        }
                      }
                    }
                  }
                }
              }
            `,
          },
          {
            next: (data) => {
              console.log('[BitQuery] Test data received:', data);
              (window as any).debugConsole?.success('Subscription working! Received data.');
            },
            error: (error: Error) => {
              console.error('[BitQuery] Subscription error:', error);
              (window as any).debugConsole?.error(`Subscription error: ${error?.message || 'Unknown error'}`);
              handleRetry();
            },
            complete: () => {
              console.log('[BitQuery] Subscription completed');
              (window as any).debugConsole?.log('Test subscription completed normally');
            },
          },
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[BitQuery] Failed to create subscription:', errorMessage);
        (window as any).debugConsole?.error(`Failed to create subscription: ${errorMessage}`);
      }
    }

    // Start initial connection
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      console.log('[BitQuery] Cleaning up WebSocket subscription');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
          BitQuery Token Monitor
        </h1>
        <p className="text-gray-400 mt-4">
          Monitoring PumpFun token creation events in real-time. Check the debug console for events.
        </p>
      </div>
      <DebugConsole />
    </div>
  );
};

export default ProjectPage;