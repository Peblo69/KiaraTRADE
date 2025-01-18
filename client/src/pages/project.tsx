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
        },
        error: (error: Error) => {
          console.error('[BitQuery] WebSocket connection error:', error);
          (window as any).debugConsole?.error(`WebSocket connection error: ${error?.message || 'Unknown error'}`);
        },
        closed: (code?: number, reason?: string) => {
          console.warn('[BitQuery] WebSocket connection closed:', { code, reason });
          (window as any).debugConsole?.log(`WebSocket connection closed: Code ${code || 'unknown'}, Reason: ${reason || 'none provided'}`);
        },
      },
    });

    let unsubscribe: (() => void) | null = null;

    // Subscription query for PumpFun token creation events
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
                    Logs
                    Program {
                      AccountNames
                      Address
                      Arguments {
                        Name
                        Type
                        Value {
                          ... on Solana_ABI_Integer_Value_Arg {
                            integer
                          }
                          ... on Solana_ABI_String_Value_Arg {
                            string
                          }
                          ... on Solana_ABI_Address_Value_Arg {
                            address
                          }
                          ... on Solana_ABI_BigInt_Value_Arg {
                            bigInteger
                          }
                          ... on Solana_ABI_Bytes_Value_Arg {
                            hex
                          }
                          ... on Solana_ABI_Boolean_Value_Arg {
                            bool
                          }
                          ... on Solana_ABI_Float_Value_Arg {
                            float
                          }
                          ... on Solana_ABI_Json_Value_Arg {
                            json
                          }
                        }
                      }
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
            (window as any).debugConsole?.error(`WebSocket error: ${error.message}`);
          },
          complete: () => {
            console.log('[BitQuery] Subscription completed');
            (window as any).debugConsole?.log('WebSocket subscription completed');
          },
        },
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[BitQuery] Failed to create subscription:', errorMessage);
      (window as any).debugConsole?.error(`Failed to create subscription: ${errorMessage}`);
    }

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