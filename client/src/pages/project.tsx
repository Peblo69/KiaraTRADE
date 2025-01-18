import { FC, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import DebugConsole from "@/components/DebugConsole";
import { createClient } from 'graphql-ws';

const ProjectPage: FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    console.log('[BitQuery] Starting OAuth authentication process...');
    (window as any).debugConsole?.log('Starting OAuth authentication...');

    // Function to get OAuth token
    async function getAccessToken() {
      try {
        const response = await fetch('https://oauth2.bitquery.io/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'client_id': "9f7d5c2f-8291-40b8-b959-d61c12a31e24",
            'client_secret': ".HYVwV8z.JuuW8SIlTgwj9g~ms",
            'scope': 'api'
          })
        });

        if (!response.ok) {
          throw new Error(`OAuth token request failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[BitQuery] Access token obtained successfully');
        (window as any).debugConsole?.success('OAuth token obtained successfully');
        return data.access_token;
      } catch (error) {
        console.error('[BitQuery] Failed to get OAuth token:', error);
        (window as any).debugConsole?.error(`Failed to get OAuth token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
    }

    let retryCount = 0;
    const maxRetries = 5;
    let unsubscribe: (() => void) | null = null;
    let connectionTimeout: ReturnType<typeof setTimeout>;

    function connectWebSocket(token: string) {
      console.log('[BitQuery] Attempting WebSocket connection...');
      (window as any).debugConsole?.log('Attempting to establish WebSocket connection...');

      // Set connection timeout
      connectionTimeout = setTimeout(() => {
        console.error('[BitQuery] WebSocket connection timeout after 10s');
        (window as any).debugConsole?.error('WebSocket connection timeout - attempting retry');
        handleRetry(token);
      }, 10000);

      const client = createClient({
        url: 'wss://streaming.bitquery.io/eap',
        connectionParams: () => {
          console.log('[BitQuery] Setting up connection parameters with OAuth token...');
          return {
            headers: {
              'Authorization': `Bearer ${token}`,
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
            handleRetry(token);
          },
          closed: (event: unknown) => {
            clearTimeout(connectionTimeout);
            const code = (event as { code?: number })?.code;
            const reason = (event as { reason?: string })?.reason;
            console.warn('[BitQuery] WebSocket connection closed:', { code, reason });
            (window as any).debugConsole?.log(`WebSocket connection closed: Code ${code || 'unknown'}, Reason: ${reason || 'none provided'}`);
            handleRetry(token);
          },
        },
      });

      return client;
    }

    function handleRetry(token: string) {
      clearTimeout(connectionTimeout);
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff with 30s max
        console.log(`[BitQuery] Retrying connection in ${delay/1000}s (attempt ${retryCount}/${maxRetries})`);
        (window as any).debugConsole?.log(`Retrying in ${delay/1000}s (attempt ${retryCount}/${maxRetries})`);
        setTimeout(() => connectWebSocket(token), delay);
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
              handleRetry(accessToken!);
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
        handleRetry(accessToken!);
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
              handleRetry(accessToken!);
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

    // Start the OAuth flow and then connect WebSocket
    async function initialize() {
      const token = await getAccessToken();
      if (token) {
        setAccessToken(token);
        connectWebSocket(token);
      }
    }

    // Start the initialization process
    initialize();

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