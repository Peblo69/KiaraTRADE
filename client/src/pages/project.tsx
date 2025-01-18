import { FC, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";
import TokenCard from "@/components/TokenCard";
import { useUnifiedTokenStore } from "@/lib/unified-token-store";
import { bitQueryWebSocket } from "@/lib/bitquery-websocket";

const ProjectPage: FC = () => {
  const tokens = useUnifiedTokenStore((state) => state.tokens);
  const isConnected = useUnifiedTokenStore((state) => state.isConnected);
  const error = useUnifiedTokenStore((state) => state.connectionError);

  useEffect(() => {
    // Test BitQuery API key first
    fetch('https://graphql.bitquery.io', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': 'BQYSaASLeyNPxRf38DGgENQ1mVHxNypq',
      },
      body: JSON.stringify({
        query: `{ Solana { blockchain { blocks(limit: 1) { blockNumber } } } }`,
      }),
    })
      .then((res) => res.json())
      .then((data) => console.log('API Key Test Result:', data))
      .catch((err) => console.error('API Key Test Error:', err));

    // Only connect WebSocket if API test passes
    try {
      bitQueryWebSocket.connect();
    } catch (error) {
      console.error('[Project] Failed to connect to BitQuery:', error);
    }

    // Cleanup function
    return () => {
      try {
        bitQueryWebSocket.disconnect();
      } catch (error) {
        console.error('[Project] Error during cleanup:', error);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackgroundEnhanced />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <h1 
              className="text-4xl md:text-6xl font-bold text-center mb-8"
              style={{
                fontFamily: '"VT323", monospace',
                background: 'linear-gradient(to right, #00ff87 0%, #60efff 50%, #0061ff 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 30px rgba(96, 239, 255, 0.4)',
                letterSpacing: '0.15em',
                filter: 'drop-shadow(0 0 10px rgba(96, 239, 255, 0.2))'
              }}
            >
              Live Token Tracker
            </h1>

            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-purple-500/30">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-purple-300/80">
                  {isConnected ? 'Connected to BitQuery' : error || 'Connecting...'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tokens.map((token) => (
                <TokenCard key={token.address} token={token} />
              ))}
            </div>

            {tokens.length === 0 && (
              <div className="text-center text-purple-300/60 mt-8">
                {isConnected ? 'Waiting for new tokens...' : 'Connecting to BitQuery...'}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectPage;