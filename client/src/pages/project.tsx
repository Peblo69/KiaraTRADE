import { FC, useEffect } from "react";
import Navbar from "@/components/Navbar";
import DebugConsole from "@/components/DebugConsole";

const ProjectPage: FC = () => {
  useEffect(() => {
    console.log('Testing BitQuery API connection...');
    (window as any).debugConsole?.log('Starting BitQuery API test...');

    // Debug environment variables (safely)
    const envKeys = Object.keys(import.meta.env);
    console.log('Available env keys:', envKeys);
    (window as any).debugConsole?.log(`Available env keys: ${envKeys.join(', ')}`);

    // Log the API key availability (not the actual key)
    const apiKey = import.meta.env.VITE_BITQUERY_API_KEY;
    console.log('API Key exists:', !!apiKey);

    if (!apiKey) {
      console.error('BitQuery API key is not available');
      (window as any).debugConsole?.error('BitQuery API key is not set in environment variables. Available keys: ' + envKeys.join(', '));
      return;
    }

    (window as any).debugConsole?.log('API Key found, testing connection...');

    fetch('https://graphql.bitquery.io', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        query: `
          query {
            Solana {
              DEXTrades(
                limit: 1
                orderBy: { descending: Block_Time }
                where: { Trade: { Dex: { ProtocolName: { is: "pump" } } } }
              ) {
                Block {
                  Time
                }
                Trade {
                  Currency {
                    Name
                    Symbol
                    MintAddress
                  }
                  Price
                }
              }
            }
          }
        `,
      }),
    })
      .then(async (res) => {
        // Handle unauthorized error
        if (res.status === 401) {
          const error = new Error('Unauthorized: Invalid or missing API key');
          (window as any).debugConsole?.error(`API call failed: ${error.message}`);
          throw error;
        }

        // Log raw response for debugging if not OK
        if (!res.ok) {
          const text = await res.text();
          console.error('Raw error response:', text);
          (window as any).debugConsole?.error(`API Error Response: ${text}`);
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        return res.json();
      })
      .then((data) => {
        console.log('API Key Test Result:', data);
        (window as any).debugConsole?.success(`API Test Success: ${JSON.stringify(data, null, 2)}`);
      })
      .catch((err) => {
        console.error('API Key Test Error:', err);
        (window as any).debugConsole?.error(`API Test Failed: ${err.message}`);
      });
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">BitQuery API Test Page</h1>
        <p className="text-gray-400 mt-4">Check the debug console in the bottom right corner for test results</p>
      </div>
      <DebugConsole />
    </div>
  );
};

export default ProjectPage;