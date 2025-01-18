import { FC, useEffect } from "react";
import Navbar from "@/components/Navbar";
import DebugConsole from "@/components/DebugConsole";
import { createClient } from 'graphql-ws';

const ProjectPage: FC = () => {
  useEffect(() => {
    console.log('[BitQuery] Testing WebSocket connection...');
    (window as any).debugConsole?.log('Starting BitQuery WebSocket test...');

    // Debug environment variables (safely)
    const envKeys = Object.keys(import.meta.env);
    console.log('[BitQuery] Available env keys:', envKeys);
    (window as any).debugConsole?.log(`Available env keys: ${envKeys.join(', ')}`);

    // Log the API key availability (not the actual key)
    const apiKey = import.meta.env.VITE_BITQUERY_API_KEY;
    console.log('[BitQuery] API Key exists:', !!apiKey);

    if (!apiKey) {
      console.error('[BitQuery] API key is not available');
      (window as any).debugConsole?.error('BitQuery API key is not set in environment variables. Available keys: ' + envKeys.join(', '));
      return;
    }

    (window as any).debugConsole?.log('API Key found, initializing WebSocket connection...');

    let retryCount = 0;
    const maxRetries = 5;
    let unsubscribe: (() => void) | null = null;

    function connectWebSocket() {
      // Create WebSocket client with correct streaming URL
      const client = createClient({
        url: 'wss://streaming.bitquery.io/eap',
        connectionParams: {
          headers: {
            'X-API-KEY': apiKey,
          },
        },
        on: {
          connected: () => {
            console.log('[BitQuery] WebSocket connected successfully');
            (window as any).debugConsole?.success('WebSocket connection established');
            retryCount = 0; // Reset retry count on successful connection

            // Start subscription after successful connection
            startSubscription(client);
          },
          error: (error: Error) => {
            console.error('[BitQuery] WebSocket connection error:', error);
            (window as any).debugConsole?.error(`WebSocket error: ${error?.message || 'Unknown error'}`);
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
      });
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

    function startSubscription(client: ReturnType<typeof createClient>) {
      try {
        unsubscribe = client.subscribe(
          {
            query: `
              subscription {
                Solana {
                  Instructions(
                    where: {Instruction: {Program: {Method: {is: "create"}, Name: {is: "pump"}}}}
                  ) {
                    Instruction {
                      Accounts {
                        Address
                        IsWritable
                        Token {
                          Mint
                          Owner
                          ProgramId
                        }
                      }
                      Program {
                        Method
                        Name
                      }
                    }
                    Transaction {
                      Signature
                    }
                  }
                }
              }
            `,
          },
          {
            next: (data) => {
              console.log('[BitQuery] New token creation event:', data);
              (window as any).debugConsole?.success(`New token creation detected: ${JSON.stringify(data, null, 2)}`);
            },
            error: (error: Error) => {
              console.error('[BitQuery] Subscription error:', error);
              (window as any).debugConsole?.error(`Subscription error: ${error?.message || 'Unknown error'}`);
              handleRetry(); // Retry on subscription errors too
            },
            complete: () => {
              console.log('[BitQuery] Subscription completed');
              (window as any).debugConsole?.log('Subscription completed normally');
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

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        console.log('[BitQuery] Cleaning up WebSocket subscription');
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