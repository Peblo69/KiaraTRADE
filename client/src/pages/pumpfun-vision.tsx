import { FC, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface TokenData {
  symbol: string;
  name?: string;
  price?: number;
  marketCap?: number;
  volume?: number;
  timestamp: number;
}

const PumpFunVision: FC = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const MAX_TOKENS_DISPLAYED = 10;

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
          setTokens(prevTokens => {
            const updatedTokens = [newTokenData, ...prevTokens];
            return updatedTokens.slice(0, MAX_TOKENS_DISPLAYED);
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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left sidebar for token list */}
      <div className="w-[300px] h-full border-r border-purple-800/20 bg-background/80 backdrop-blur-sm overflow-hidden">
        <div className="p-4">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Live Tokens
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Real-time token updates
          </p>
        </div>

        <div className="h-[calc(100vh-100px)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : tokens.length > 0 ? (
            <div className="flex flex-col gap-2 p-2">
              {tokens.map((token, index) => (
                <Card 
                  key={token.symbol + token.timestamp}
                  className="p-4 border-purple-800/20 bg-background/95 hover:bg-accent/50 transition-all duration-300 cursor-pointer animate-slideDown"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{token.symbol}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(token.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {token.price && (
                          <p className="font-mono font-bold text-lg">
                            ${token.price.toFixed(6)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-800/10">
                      <div>
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="font-mono">
                          ${token.volume?.toLocaleString() ?? 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Market Cap</p>
                        <p className="font-mono">
                          ${token.marketCap?.toLocaleString() ?? 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
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