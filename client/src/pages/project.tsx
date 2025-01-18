import { FC, useEffect } from "react";
import Navbar from "@/components/Navbar";
import DebugConsole from "@/components/DebugConsole";
import { createClient } from 'graphql-ws';

const ProjectPage: FC = () => {
  useEffect(() => {
    console.log('[BitQuery] Starting WebSocket connection...');
    (window as any).debugConsole?.log('Starting WebSocket connection...');

    // Manually generated token that is valid until 2025-01-23 16:30:30
    const MANUAL_ACCESS_TOKEN = 'ory_at_ixYL1dO88QEiiFtRbsvvjoW-YJsF7kLLhJFpDwcFPno.5HEEoVYtVCRZ4LWWZpvf5izVGPOGNvJzFUw8TcH8l4c';

    let retryCount = 0;
    const maxRetries = 5;
    let unsubscribe: (() => void) | null = null;
    let connectionTimeout: ReturnType<typeof setTimeout>;

    function connectWebSocket() {
      console.log('[BitQuery] Attempting WebSocket connection...');
      (window as any).debugConsole?.log('Attempting to establish WebSocket connection...');

      // Set connection timeout
      connectionTimeout = setTimeout(() => {
        console.error('[BitQuery] WebSocket connection timeout after 10s');
        (window as any).debugConsole?.error('WebSocket connection timeout - attempting retry');
        handleRetry();
      }, 10000);

      const client = createClient({
        url: 'wss://streaming.bitquery.io/eap',
        connectionParams: () => {
          console.log('[BitQuery] Using manually generated token...');
          return {
            headers: {
              'Authorization': `Bearer ${MANUAL_ACCESS_TOKEN}`,
            },
          };
        },
        on: {
          connected: () => {
            clearTimeout(connectionTimeout);
            console.log('[BitQuery] WebSocket connected successfully');
            (window as any).debugConsole?.success('WebSocket connection established');
            retryCount = 0; // Reset retry count on successful connection

            // Start with a simple test subscription
            startTestSubscription(client);
          },
          error: (error: Error) => {
            clearTimeout(connectionTimeout);
            console.error('[BitQuery] WebSocket connection error:', error);
            (window as any).debugConsole?.error(`WebSocket error: ${error?.message || 'Unknown error'}`);
            handleRetry();
          },
          closed: (event: unknown) => {
            clearTimeout(connectionTimeout);
            const code = (event as { code?: number })?.code;
            const reason = (event as { reason?: string })?.reason;
            console.warn('[BitQuery] WebSocket connection closed:', { code, reason });
            (window as any).debugConsole?.log(`WebSocket connection closed: Code ${code || 'unknown'}, Reason: ${reason || 'none provided'}`);
            handleRetry();
          },
        },
      });

      return client;
    }

    function handleRetry() {
      clearTimeout(connectionTimeout);
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

    function startTestSubscription(client: ReturnType<typeof createClient>) {
      try {
        console.log('[BitQuery] Starting test subscription...');
        (window as any).debugConsole?.log('Starting test subscription...');

        // Using a simplified DEXTrades query from the documentation
        unsubscribe = client.subscribe(
          {
            query: `
              subscription {
                Solana {
                  DEXTrades(
                    where: {
                      Trade: { Dex: { ProtocolName: { is: "pump" } } }
                      Transaction: { Result: { Success: true } }
                    }
                    limit: 1
                  ) {
                    Block {
                      Time
                    }
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
              console.log('[BitQuery] Test subscription data received:', data);
              (window as any).debugConsole?.success(`Test subscription working: ${JSON.stringify(data, null, 2)}`);

              // If test subscription works, start the token creation monitoring
              if (unsubscribe) {
                unsubscribe();
                startTokenMonitoring(client);
              }
            },
            error: (error: Error) => {
              console.error('[BitQuery] Test subscription error:', error);
              (window as any).debugConsole?.error(`Subscription error: ${error?.message || 'Unknown error'}`);
              handleRetry();
            },
            complete: () => {
              console.log('[BitQuery] Test subscription completed');
              (window as any).debugConsole?.log('Test subscription completed normally');
            },
          },
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[BitQuery] Failed to create test subscription:', errorMessage);
        (window as any).debugConsole?.error(`Failed to create test subscription: ${errorMessage}`);
        handleRetry();
      }
    }

    function startTokenMonitoring(client: ReturnType<typeof createClient>) {
      try {
        console.log('[BitQuery] Starting token monitoring subscription...');
        unsubscribe = client.subscribe(
          {
            query: `
              subscription {
                Solana {
                  Instructions(
                    where: {
                      Instruction: {
                        Program: {
                          Method: { is: "create" },
                          Name: { is: "pump" }
                        }
                      }
                    }
                  ) {
                    Instruction {
                      Accounts {
                        Address
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
              handleRetry();
            },
            complete: () => {
              console.log('[BitQuery] Token monitoring subscription completed');
              (window as any).debugConsole?.log('Token monitoring completed normally');
            },
          },
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[BitQuery] Failed to create token monitoring subscription:', errorMessage);
        (window as any).debugConsole?.error(`Failed to create token monitoring subscription: ${errorMessage}`);
      }
    }

    // Start initial connection
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      clearTimeout(connectionTimeout);
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