import { FC, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface TokenData {
  symbol: string;
  name: string;
  liquidity: number;
  liquidityChange: number;
  l1Liquidity: number;
  marketCap: number;
  volume: number;
  swaps: number;
  timestamp: number;
  status: {
    mad: boolean;
    fad: boolean;
    lb: boolean;
    tri: boolean;
  }
}

const PumpFunVision: FC = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const MAX_TOKENS = 10;

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('wss://pumpportal.fun/api/data');

        ws.onopen = () => {
          console.log('Connected to PumpPortal WebSocket');
          ws.send(JSON.stringify({
            method: "subscribeNewToken"
          }));
        };

        ws.onmessage = (event) => {
          const newTokenData = JSON.parse(event.data);
          console.log('Received token data:', newTokenData); // Debug log

          if (!newTokenData || !newTokenData.symbol) {
            console.error('Invalid token data received:', newTokenData);
            return;
          }

          setTokens(prevTokens => {
            // Add new token at the beginning and maintain max 10 tokens
            const newTokens = [newTokenData, ...prevTokens].slice(0, MAX_TOKENS);
            // Remove duplicates based on symbol
            return Array.from(new Map(newTokens.map(token => [token.symbol, token])).values())
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, MAX_TOKENS);
          });
          setLoading(false);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Failed to connect to PumpFun. Retrying...",
          });
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed. Reconnecting...');
          setTimeout(connectWebSocket, 5000);
        };

        return () => {
          ws.close();
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();
  }, [toast]);

  const getTimeDiff = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* New Pairs section */}
      <div className="w-full max-w-[1200px] mx-auto p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 text-green-400">
            <span className="text-sm">🔥 New Pairs</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Find the latest tokens across chains
          </span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr] gap-4 px-4 py-2 text-xs text-muted-foreground">
          <div>Token</div>
          <div className="text-right">Created</div>
          <div className="text-right">Liquidity</div>
          <div className="text-right">L1 Liquidity</div>
          <div className="text-right">MarketCap</div>
          <div className="text-right">Swaps</div>
          <div className="text-right">Quick Buy</div>
        </div>

        {/* Token list */}
        <div className="space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : tokens.length > 0 ? (
            tokens.map((token) => (
              <Card 
                key={`${token.symbol}-${token.timestamp}`}
                className="hover:bg-accent/5 transition-all duration-300 cursor-pointer"
              >
                <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr] gap-4 px-4 py-3 items-center">
                  {/* Token info */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      {token.symbol ? token.symbol[0] : '?'}
                    </div>
                    <div>
                      <div className="font-medium">{token.symbol || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{token.name || 'Unknown Name'}</div>
                    </div>
                  </div>

                  {/* Created time */}
                  <div className="text-right font-mono text-muted-foreground">
                    {token.timestamp ? getTimeDiff(token.timestamp) : 'N/A'}
                  </div>

                  {/* Liquidity */}
                  <div className="text-right">
                    <div className="font-mono">${(token.liquidity || 0).toLocaleString()}</div>
                    <div className={`text-xs ${(token.liquidityChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(token.liquidityChange || 0) > 0 ? '+' : ''}{token.liquidityChange || 0}%
                    </div>
                  </div>

                  {/* L1 Liquidity */}
                  <div className="text-right font-mono">
                    ${(token.l1Liquidity || 0).toLocaleString()}
                  </div>

                  {/* Market Cap */}
                  <div className="text-right font-mono">
                    ${(token.marketCap || 0).toLocaleString()}
                  </div>

                  {/* Swaps/Volume */}
                  <div className="text-right">
                    <div className="font-mono">{token.swaps || 0}</div>
                    <div className="text-xs text-muted-foreground">
                      ${(token.volume || 0).toLocaleString()}
                    </div>
                  </div>

                  {/* Quick Buy */}
                  <div className="text-right flex items-center justify-end gap-2">
                    {/* Status indicators */}
                    <div className="flex gap-1">
                      {token.status?.mad && <span className="px-1 py-0.5 text-[10px] bg-green-500/20 text-green-500 rounded">MAD</span>}
                      {token.status?.fad && <span className="px-1 py-0.5 text-[10px] bg-blue-500/20 text-blue-500 rounded">FAD</span>}
                      {token.status?.lb && <span className="px-1 py-0.5 text-[10px] bg-purple-500/20 text-purple-500 rounded">LB</span>}
                      {token.status?.tri && <span className="px-1 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-500 rounded">TRI</span>}
                    </div>
                    <Button size="sm" variant="outline" className="text-xs">
                      $0
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Waiting for new tokens...</p>
            </div>
          )}
        </div>
      </div>
      {/* Main content area - will be used for additional features */}
      <div className="flex-1 p-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          PumpFun Vision
        </h1>
        <p className="text-muted-foreground mt-2">
          Select a token to view detailed analytics
        </p>
      </div>
    </div>
  );
};

export default PumpFunVision;